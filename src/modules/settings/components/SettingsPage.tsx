"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createClient, getSessionUser } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader } from "@/components/ui/page-loader";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePostHog } from "posthog-js/react";
import type { User } from "@supabase/supabase-js";
import { mutate } from "swr";
import { ArtistIdentityCard } from "./ArtistIdentityCard";
import { ArtistLogoCard } from "./ArtistLogoCard";
import { SettingRow, SettingsHeader, SettingsSection } from "./SettingsUI";
import { EmailChangeSteps, type EmailChangeStage } from "./EmailChangeSteps";
import { authErrorMessage } from "@/lib/auth-errors";
import { AUTH_META_KEY } from "@/hooks/useArtistIdentity";
import { legalNameParts } from "@/lib/artist-identity";
import { usePreferencesData } from "@/hooks/usePreferencesData";

/** Même règle que `/nouveau-mot-de-passe`. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Changement d'adresse en cours, gardé dans ce navigateur : une fois le
 * changement fait, Supabase ne donne plus l'ancienne adresse. Simple aide à
 * l'affichage des étapes, rien n'en dépend.
 */
const EMAIL_CHANGE_KEY = "settings:email-change";
type EmailChangeRecord = { from: string; to: string; doneAt?: number };
/** Le récapitulatif « terminé » reste affiché 24 h, sauf s'il est masqué avant. */
const EMAIL_CHANGE_DONE_TTL = 24 * 60 * 60 * 1000;
/**
 * Au-delà, le lien est forcément expiré : Supabase plafonne la validité des
 * liens d'email à 24 h (réglage « Email OTP expiration »). Sans ce seuil, une
 * demande jamais confirmée restait « en attente » indéfiniment.
 */
const EMAIL_CHANGE_LINK_MAX_AGE = 24 * 60 * 60 * 1000;
/** Délai imposé par Supabase entre deux emails de changement d'adresse. */
const RESEND_COOLDOWN_S = 60;

function emailChangeRedirect() {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent("/settings?email=changed")}`;
}

function readEmailChange(): EmailChangeRecord | null {
  try {
    const raw = window.localStorage.getItem(EMAIL_CHANGE_KEY);
    return raw ? (JSON.parse(raw) as EmailChangeRecord) : null;
  } catch {
    return null;
  }
}

function writeEmailChange(record: EmailChangeRecord | null) {
  try {
    if (record) window.localStorage.setItem(EMAIL_CHANGE_KEY, JSON.stringify(record));
    else window.localStorage.removeItem(EMAIL_CHANGE_KEY);
  } catch {
    // Stockage indisponible (navigation privée) : les étapes restent approximatives.
  }
}

/**
 * Confirme l'identité avant un changement sensible (email, mot de passe) : une
 * session restée ouverte sur un ordinateur partagé ne doit pas suffire à
 * prendre le compte. Supabase ne le demande pas lui-même pour `updateUser`,
 * d'où une reconnexion avec le mot de passe actuel, qui renouvelle la session
 * du même compte sans rien changer d'autre.
 */
async function verifyCurrentPassword(email: string, password: string): Promise<boolean> {
  const { error } = await createClient().auth.signInWithPassword({ email, password });
  return !error;
}

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [signingOutOthers, setSigningOutOthers] = useState(false);

  const [email, setEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>("email");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [emailChange, setEmailChange] = useState<{
    stage: EmailChangeStage;
    from: string;
    to: string;
    sentAt?: number | null;
    hideAt?: number | null;
  } | null>(null);
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isGoogle = provider === "google";

  const posthog = usePostHog();
  const { identityMode, setArtistIdentity } = usePreferencesData();
  const { confirm, confirmDialog } = useConfirm();

  // Retour du lien de changement d'email (via /auth/callback). Un seul lien,
  // sur la nouvelle adresse : « Secure email change » est désactivé, voir
  // EmailChangeSteps.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError) {
      toast.error("Le lien de confirmation n’a pas fonctionné.", {
        description: authErrorMessage(authError, "Refais une demande de changement d’adresse."),
      });
    } else if (params.get("email") === "changed") {
      toast.success("Adresse mail modifiée.");
    } else {
      return;
    }
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  /**
   * Adresse et étape du changement d'adresse. `fresh` : l'utilisateur vient de
   * Supabase Auth, pas de la session locale. Seule une lecture fraîche peut
   * conclure qu'un changement est terminé ou abandonné : la session locale peut
   * dater d'avant (lien ouvert dans un autre navigateur ou sur le téléphone).
   */
  const applyEmailState = (user: User, fresh: boolean) => {
    const currentEmail = user.email ?? "";
    setEmail(currentEmail);
    setPendingEmail(user.new_email ?? null);
    const record = readEmailChange();
    if (user.new_email) {
      const matches = record?.to === user.new_email;
      const sentAt = user.email_change_sent_at ? Date.parse(user.email_change_sent_at) : null;
      const expired = sentAt !== null && Date.now() - sentAt > EMAIL_CHANGE_LINK_MAX_AGE;
      setEmailChange({
        stage: expired ? "expired" : "sent",
        from: matches ? record.from : currentEmail,
        to: user.new_email,
        sentAt,
      });
      return;
    }
    if (!fresh) return;
    if (record && record.to === currentEmail.toLowerCase()) {
      const doneAt = record.doneAt ?? Date.now();
      if (Date.now() - doneAt < EMAIL_CHANGE_DONE_TTL) {
        setEmailChange({ stage: "done", from: record.from, to: currentEmail, hideAt: doneAt + EMAIL_CHANGE_DONE_TTL });
        if (!record.doneAt) writeEmailChange({ ...record, doneAt });
        return;
      }
    }
    if (record) writeEmailChange(null);
    setEmailChange(null);
  };

  useEffect(() => {
    const supabase = createClient();
    // 1. Session locale, pour afficher tout de suite : `getUser()` au montage
    //    faisait la queue derrière les autres hooks (cf. getSessionUser).
    getSessionUser(supabase)
      .then(({ data: { user } }) => {
        if (!user) return;
        applyEmailState(user, false);
        setProvider((user.app_metadata?.provider as string | undefined) ?? "email");
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        // Même lecture que partout ailleurs : couvre `full_name` (anciennes
        // inscriptions par email) et `given_name` / `family_name` (Google).
        const parts = legalNameParts(meta);
        setFirstName(parts.firstName);
        setLastName(parts.lastName);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // 2. Puis l'état réel chez Supabase. La session locale n'est rafraîchie qu'à
    //    l'expiration du jeton : après un changement d'adresse validé ailleurs,
    //    elle affichait encore l'ancienne adresse et l'étape « en attente ».
    //    Si l'adresse a bougé, on rafraîchit la session pour que tout l'app suive.
    let cancelled = false;
    void (async () => {
      try {
        const [{ data: local }, { data: remote }] = await Promise.all([
          getSessionUser(supabase),
          supabase.auth.getUser(),
        ]);
        if (cancelled || !remote.user) return;
        const stale =
          local.user?.email !== remote.user.email || (local.user?.new_email ?? null) !== (remote.user.new_email ?? null);
        if (stale) {
          await supabase.auth.refreshSession();
          void mutate(AUTH_META_KEY);
        }
        if (!cancelled) applyEmailState(remote.user, true);
      } catch {
        // Hors ligne : on garde l'affichage de la session locale.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const supabase = createClient();
      const full = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
          full_name: full || undefined
        }
      });
      if (error) throw error;
      // En nom propre, le nom affiché est le nom civil : il suit.
      if (identityMode === "legal" && full) setArtistIdentity("legal", full);
      void mutate(AUTH_META_KEY);
      posthog?.capture("profile_name_updated", { module: "settings" });
      toast.success("Profil enregistré.");
    } catch (err) {
      toast.error(authErrorMessage(err, "Erreur lors de l’enregistrement."));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = newEmail.trim().toLowerCase();
    if (!next || next === email.toLowerCase()) {
      toast.error("Saisis une adresse différente de l’actuelle.");
      return;
    }
    if (!emailCurrentPassword) {
      toast.error("Saisis ton mot de passe actuel pour confirmer.");
      return;
    }
    setSavingEmail(true);
    try {
      if (!(await verifyCurrentPassword(email, emailCurrentPassword))) {
        toast.error("Mot de passe actuel incorrect.");
        return;
      }
      const supabase = createClient();
      // Le lien de confirmation repasse par le callback PKCE, qui ouvre la
      // session puis revient ici.
      const { error } = await supabase.auth.updateUser(
        { email: next },
        { emailRedirectTo: emailChangeRedirect() }
      );
      if (error) throw error;
      writeEmailChange({ from: email, to: next });
      setEmailChange({ stage: "sent", from: email, to: next, sentAt: Date.now() });
      setCooldown(RESEND_COOLDOWN_S);
      setPendingEmail(next);
      setNewEmail("");
      setEmailCurrentPassword("");
      posthog?.capture("email_change_requested", { module: "settings" });
      toast.success("Lien de confirmation envoyé.", {
        description: `Ouvre-le depuis la boîte de ${next}.`,
      });
    } catch (err) {
      toast.error(authErrorMessage(err, "Impossible de changer l’adresse."));
    } finally {
      setSavingEmail(false);
    }
  };

  // Compte à rebours du bouton de renvoi.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  /** Renvoie le lien. Supabase régénère le jeton : le lien précédent cesse de marcher. */
  const handleResendEmailChange = async () => {
    if (!emailChange || emailChange.stage === "done") return;
    setResending(true);
    try {
      const { error } = await createClient().auth.updateUser(
        { email: emailChange.to },
        { emailRedirectTo: emailChangeRedirect() }
      );
      if (error) throw error;
      writeEmailChange({ from: emailChange.from, to: emailChange.to });
      setEmailChange({ ...emailChange, stage: "sent", sentAt: Date.now() });
      setCooldown(RESEND_COOLDOWN_S);
      posthog?.capture("email_change_resent", { module: "settings" });
      toast.success("Nouveau lien envoyé.", {
        description: `Sur ${emailChange.to}. Le précédent ne marche plus.`,
      });
    } catch (err) {
      toast.error(authErrorMessage(err, "Impossible de renvoyer le lien."));
    } finally {
      setResending(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    // Un compte Google n'a pas forcément de mot de passe : il en définit un.
    if (!isGoogle && !currentPassword) {
      toast.error("Saisis ton mot de passe actuel.");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSavingPassword(true);
    try {
      if (!isGoogle && !(await verifyCurrentPassword(email, currentPassword))) {
        toast.error("Mot de passe actuel incorrect.");
        return;
      }
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      posthog?.capture("password_changed", { module: "settings" });
      toast.success("Mot de passe modifié.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(authErrorMessage(err, "Erreur lors du changement de mot de passe."));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSignOutOthers = async () => {
    const ok = await confirm({
      title: "Déconnecter les autres appareils ?",
      description: "Tu restes connecté ici. Partout ailleurs, il faudra se reconnecter.",
      confirmLabel: "Déconnecter",
    });
    if (!ok) return;
    setSigningOutOthers(true);
    try {
      const { error } = await createClient().auth.signOut({ scope: "others" });
      if (error) throw error;
      posthog?.capture("signed_out_other_sessions", { module: "settings" });
      toast.success("Les autres appareils sont déconnectés.");
    } catch (err) {
      toast.error(authErrorMessage(err, "Déconnexion impossible. Réessaie dans un instant."));
    } finally {
      setSigningOutOthers(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-3xl space-y-6">
      <SettingsHeader
        title="Compte"
        description="Ton nom, ton identité d’artiste et tes accès à SIDEKICK."
      />

      <SettingsSection title="Profil" description="Ton nom civil. Il sert pour tes œuvres et tes documents officiels.">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Prénom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nom"
              />
            </div>
          </div>
          <Button type="submit" disabled={savingProfile}>
            {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {savingProfile ? "Enregistrement…" : "Enregistrer le profil"}
          </Button>
        </form>
      </SettingsSection>

      <ArtistIdentityCard />

      <ArtistLogoCard />

      <SettingsSection
        title="Adresse mail"
        description="L’adresse de connexion, qui reçoit aussi tes rappels et les emails du service."
      >
        <SettingRow
          label={email}
          description={
            isGoogle
              ? "Tu te connectes avec Google : l’adresse est celle de ton compte Google."
              : pendingEmail
                ? `Adresse actuelle, jusqu’à la fin du changement vers ${pendingEmail}.`
                : "Adresse actuelle."
          }
          control={null}
        />
        {!isGoogle && emailChange && (
          <EmailChangeSteps
            stage={emailChange.stage}
            currentEmail={emailChange.from}
            newEmail={emailChange.to}
            onResend={emailChange.stage === "done" ? undefined : handleResendEmailChange}
            resending={resending}
            cooldown={cooldown}
            sentAt={emailChange.sentAt}
            hideAt={emailChange.hideAt}
            onDismiss={
              emailChange.stage === "done"
                ? () => {
                    writeEmailChange(null);
                    setEmailChange(null);
                  }
                : undefined
            }
          />
        )}
        {!isGoogle && (
          <form onSubmit={handleChangeEmail} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newEmail">Nouvelle adresse</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nouvelle@adresse.fr"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailCurrentPassword">Mot de passe actuel</Label>
                <Input
                  id="emailCurrentPassword"
                  type="password"
                  value={emailCurrentPassword}
                  onChange={(e) => setEmailCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingEmail
                ? "Une nouvelle demande remplace celle en cours."
                : "Un lien de confirmation part sur la nouvelle adresse. Le changement a lieu une fois ce lien ouvert."}
            </p>
            <Button
              type="submit"
              variant="secondary"
              disabled={savingEmail || !newEmail.trim() || !emailCurrentPassword}
            >
              {savingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Changer l’adresse
            </Button>
          </form>
        )}
      </SettingsSection>

      <SettingsSection
        title="Mot de passe"
        description={
          isGoogle
            ? "Facultatif : un mot de passe te permet aussi de te connecter sans Google."
            : "Change ton mot de passe de connexion."
        }
      >
        <form onSubmit={handleChangePassword} className="max-w-sm space-y-4">
          {!isGoogle && (
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">Au moins {MIN_PASSWORD_LENGTH} caractères.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={savingPassword}>
            {savingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {savingPassword ? "Modification…" : "Changer le mot de passe"}
          </Button>
        </form>
      </SettingsSection>

      <SettingsSection title="Sessions">
        <SettingRow
          label="Autres appareils"
          description="Un ordinateur partagé, un téléphone perdu : coupe l’accès partout sauf ici."
          control={
            <Button variant="outline" size="sm" onClick={handleSignOutOthers} disabled={signingOutOthers}>
              {signingOutOthers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Déconnecter les autres appareils
            </Button>
          }
        />
      </SettingsSection>

      {confirmDialog}
    </div>
  );
}
