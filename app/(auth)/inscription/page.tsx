"use client";

import { useState } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { createClient } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELD_LABEL = "text-xs uppercase tracking-[0.12em] text-[#f5f5f5]/60";

function InscriptionPageContent() {
  const router = useRouter();
  const posthog = usePostHog();
  const searchParams = useSearchParams();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "oauth"
      ? "La connexion Google a échoué. Réessaie."
      : null
  );
  const [success, setSuccess] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">(
    "idle"
  );
  const [loading, setLoading] = useState(false);

  const emailRedirectTo = `${
    typeof window !== "undefined" ? window.location.origin : ""
  }/auth/callback?next=/dashboard`;

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      posthog?.capture("signed_up", { method: "google" });
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "email profile",
        },
      });
      if (err) throw err;
    } catch (err) {
      setError(authErrorMessage(err));
      setGoogleLoading(false);
    }
  }

  async function handleResend() {
    setResendState("sending");
    try {
      const supabase = createClient();
      await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo },
      });
      setResendState("sent");
    } catch {
      setResendState("idle");
      setError("Impossible de renvoyer l'email pour le moment.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          // Doit passer par /auth/callback : le lien de confirmation porte un
          // code PKCE à échanger contre une session. Pointer directement sur
          // /dashboard laissait l'utilisateur non connecté.
          emailRedirectTo,
        },
      });
      if (err) throw err;
      posthog?.capture("signed_up", { method: "email" });
      setSuccess(true);
      // Redirection seulement si la confirmation email est désactivée : dans ce
      // cas signUp ouvre une session pour l'utilisateur qu'on vient de créer.
      // On vérifie l'identité — un `getSession()` nu pourrait renvoyer une
      // session tierce résiduelle et nous connecter au mauvais compte.
      if (data.session && data.session.user.id === data.user?.id) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthShell>
        <div className="space-y-8">
          <div>
            <h1 className="font-display text-2xl uppercase leading-none">
              Vérifie tes emails
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#f5f5f5]/60">
              Lien de confirmation envoyé à{" "}
              <span className="text-[#F0FF00]">{email}</span>. Ouvre-le pour
              activer ton compte.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="btn-glow w-full"
              onClick={handleResend}
              disabled={resendState !== "idle"}
            >
              {resendState === "sending"
                ? "Envoi…"
                : resendState === "sent"
                  ? "Email renvoyé"
                  : "Renvoyer le lien"}
            </Button>
            <Button asChild size="lg" className="btn-glow w-full">
              <Link href="/login">Se connecter</Link>
            </Button>
          </div>

          <p className="text-sm text-[#f5f5f5]/50">
            Rien reçu ? Vérifie tes spams.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <p className="-mt-8 mb-8 text-xs leading-relaxed text-[#f5f5f5]/55">
        Construit par un artiste indépendant, pour des artistes
        indépendants.{" "}
        <Link
          href="/#inscription"
          className="text-[#f5f5f5]/75 underline decoration-[rgba(245,245,245,0.3)] underline-offset-4 transition-colors hover:text-[#F0FF00] hover:decoration-[#F0FF00]"
        >
          Lire pourquoi
        </Link>
      </p>

      <div className="space-y-8">
        <h1 className="font-display text-2xl uppercase leading-none">
          Inscription
        </h1>

        {/*
          Google d'abord : l'adresse étant déjà vérifiée par le fournisseur,
          ce chemin ouvre le compte immédiatement, sans email de confirmation
          à aller chercher.
        */}
        <GoogleAuthButton
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          loading={googleLoading}
        />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[rgba(245,245,245,0.12)]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#101010] px-3 text-[10px] uppercase tracking-[0.2em] text-[#f5f5f5]/40">
              ou par email
            </span>
          </div>
        </div>

        {error && <AuthMessage>{error}</AuthMessage>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className={FIELD_LABEL}>
                Prénom
              </Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Jean"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className={FIELD_LABEL}>
                Nom
              </Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Dupont"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="family-name"
                className="h-11"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className={FIELD_LABEL}>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="toi@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className={FIELD_LABEL}>
              Mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="6 caractères minimum"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className={FIELD_LABEL}
            >
              Confirmer le mot de passe
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Identique au mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="h-11"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="btn-glow w-full"
            disabled={loading || googleLoading}
          >
            {loading ? "Inscription…" : "Créer mon compte"}
          </Button>
        </form>

        <p className="text-center text-sm text-[#f5f5f5]/60">
          Déjà un compte ?{" "}
          <Link
            href="/login"
            className="font-medium text-[#F0FF00] hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#101010]">
          <p className="text-sm text-[#f5f5f5]/60">Chargement…</p>
        </div>
      }
    >
      <InscriptionPageContent />
    </Suspense>
  );
}
