"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Loader2, Trash2, UserX } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useAnalyticsConsent } from "@/components/analytics/CookieBanner";
import { acceptAnalytics, declineAnalytics } from "@/lib/analytics-consent";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";
import { createClient, getSessionUser } from "@/lib/supabase";
import { removeDemoData } from "@/lib/demo-seed";
import { usePreferencesData } from "@/hooks/usePreferencesData";
import { SettingRow, SettingsHeader, SettingsSection } from "./SettingsUI";

/**
 * Export et suppression se font par email pour l'alpha, comme l'annoncent la
 * FAQ et la politique de confidentialité : la demande doit venir de l'adresse
 * du compte, d'où le lien pré-rempli. La suppression en libre-service viendra
 * avec la bêta (la cascade en base est déjà en place depuis le 16/09).
 */
function mailto(subject: string, body: string) {
  return `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const linkClass = "text-[#F0FF00] underline-offset-2 hover:underline";

export function DataPrivacyPage() {
  const posthog = usePostHog();
  const consent = useAnalyticsConsent();
  const { demoSeed, setDemoSeed } = usePreferencesData();
  const { confirm, confirmDialog } = useConfirm();
  const [removingDemo, setRemovingDemo] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    getSessionUser(createClient())
      .then(({ data: { user } }) => setEmail(user?.email ?? ""))
      .catch(() => {});
  }, []);

  const demoRowCount = useMemo(
    () => (demoSeed ? Object.values(demoSeed).reduce((sum, ids) => sum + ids.length, 0) : 0),
    [demoSeed]
  );

  const handleRemoveDemo = async () => {
    if (!demoSeed) return;
    const ok = await confirm({
      title: "Supprimer les données d’exemple ?",
      description: "Seuls les éléments fictifs créés à l’inscription partent. Ce que tu as saisi toi-même reste en place.",
    });
    if (!ok) return;
    setRemovingDemo(true);
    try {
      await removeDemoData(demoSeed);
      await setDemoSeed(null);
      posthog?.capture("demo_data_removed");
      toast.success("Données d’exemple supprimées.");
    } catch (e) {
      console.error("[settings] suppression des données d'exemple échouée", e);
      toast.error("Suppression impossible. Réessaie dans un instant.");
    } finally {
      setRemovingDemo(false);
    }
  };

  const consentDescription =
    consent === "unavailable"
      ? "La mesure d’audience n’est pas active dans cet environnement."
      : consent === "pending"
        ? "Tu n’as pas encore fait de choix : rien n’est mesuré tant que tu n’as pas accepté."
        : consent === "granted"
          ? "Activée. Pages vues, clics et enregistrements de session avec les champs masqués."
          : "Désactivée. Rien n’est mesuré.";

  const accountLine = email ? `Adresse du compte : ${email}` : "";

  return (
    <div className="max-w-3xl space-y-6">
      <SettingsHeader
        title="Données et confidentialité"
        description={
          <>
            Tes données t&apos;appartiennent. Elles sont hébergées à Paris, ni vendues ni
            utilisées pour de la publicité. Le détail est dans la{" "}
            <Link href="/confidentialite" className={linkClass}>
              politique de confidentialité
            </Link>
            .
          </>
        }
      />

      <SettingsSection title="Mesure d’audience">
        <SettingRow
          htmlFor="analytics-consent"
          label="Aider à améliorer SIDEKICK"
          description={consentDescription}
          control={
            <Switch
              id="analytics-consent"
              checked={consent === "granted"}
              disabled={consent === "unavailable"}
              onCheckedChange={(checked) => {
                if (checked) acceptAnalytics();
                else declineAnalytics();
                toast.success(checked ? "Mesure d’audience activée." : "Mesure d’audience désactivée.");
              }}
            />
          }
        />
      </SettingsSection>

      {demoSeed && demoRowCount > 0 && (
        <SettingsSection title="Données d’exemple">
          <SettingRow
            label={`${demoRowCount} éléments fictifs`}
            description="Créés à l’inscription pour explorer l’outil. Les supprimer ne touche pas à ce que tu as saisi toi-même."
            control={
              <Button variant="outline" size="sm" onClick={handleRemoveDemo} disabled={removingDemo} className="gap-2">
                {removingDemo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {removingDemo ? "Suppression…" : "Supprimer"}
              </Button>
            }
          />
        </SettingsSection>
      )}

      <SettingsSection title="Tes données">
        <SettingRow
          label="Obtenir une copie de mes données"
          description="Tout ce que ton compte contient, dans un format réutilisable. Réponse sous un mois au plus, à l’adresse du compte."
          control={
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a
                href={mailto(
                  "Export de mes données SIDEKICK",
                  `Bonjour,\n\nJe souhaite recevoir une copie de toutes les données de mon compte SIDEKICK.\n\n${accountLine}`
                )}
                onClick={() => posthog?.capture("data_export_requested", { module: "settings" })}
              >
                <Download className="h-4 w-4" />
                Demander l’export
              </a>
            </Button>
          }
        />
        <SettingRow
          tone="danger"
          label="Supprimer mon compte"
          description={
            <>
              Efface ton compte et tous tes contenus sous 30 jours. Écris depuis l&apos;adresse du
              compte. Télécharge d&apos;abord tes{" "}
              <Link href="/incomes/facturation" className={linkClass}>
                factures
              </Link>{" "}
              : la loi t&apos;impose de les garder 10 ans.
            </>
          }
          control={
            <Button variant="destructive" size="sm" className="gap-2" asChild>
              <a
                href={mailto(
                  "Suppression de mon compte SIDEKICK",
                  `Bonjour,\n\nJe souhaite la suppression de mon compte SIDEKICK et de toutes ses données.\n\n${accountLine}`
                )}
                onClick={() => posthog?.capture("account_deletion_requested", { module: "settings" })}
              >
                <UserX className="h-4 w-4" />
                Demander la suppression
              </a>
            </Button>
          }
        />
      </SettingsSection>

      <SettingsSection title="Documents">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/cgu" className={linkClass}>Conditions générales d’utilisation</Link>
          <Link href="/confidentialite" className={linkClass}>Politique de confidentialité</Link>
          <Link href="/mentions-legales" className={linkClass}>Mentions légales</Link>
        </div>
      </SettingsSection>

      {confirmDialog}
    </div>
  );
}
