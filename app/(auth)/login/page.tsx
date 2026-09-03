"use client";

import { useState } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { authErrorMessage, isEmailNotConfirmed } from "@/lib/auth-errors";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELD_LABEL = "text-xs uppercase tracking-[0.12em] text-[#f5f5f5]/60";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirectedFrom");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "oauth"
      ? "La connexion Google a échoué. Réessaie."
      : null
  );
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">(
    "idle"
  );
  const [loading, setLoading] = useState(false);
  const nextPath =
    redirectedFrom &&
    redirectedFrom.startsWith("/") &&
    !redirectedFrom.startsWith("//")
      ? redirectedFrom
      : "/dashboard";

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", nextPath);

      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
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
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
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
    setNeedsConfirmation(false);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) throw err;
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(authErrorMessage(err));
      setNeedsConfirmation(isEmailNotConfirmed(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="space-y-8">
        <h1 className="font-display text-2xl uppercase leading-none">
          Connexion
        </h1>

        {error && (
          <div className="space-y-3">
            <AuthMessage>{error}</AuthMessage>
            {needsConfirmation && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendState !== "idle" || !email}
                className="text-xs uppercase tracking-[0.15em] text-[#F0FF00] transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {resendState === "sending"
                  ? "Envoi…"
                  : resendState === "sent"
                    ? "Email renvoyé"
                    : "Renvoyer l'email de confirmation"}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-11"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="btn-glow w-full"
            disabled={loading || googleLoading}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[rgba(245,245,245,0.12)]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#101010] px-3 text-[10px] uppercase tracking-[0.2em] text-[#f5f5f5]/40">
              ou
            </span>
          </div>
        </div>

        <GoogleAuthButton
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          loading={googleLoading}
        />

        <p className="text-center text-sm text-[#f5f5f5]/60">
          Pas encore de compte ?{" "}
          <Link
            href="/inscription"
            className="font-medium text-[#F0FF00] hover:underline"
          >
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#101010]">
          <p className="text-sm text-[#f5f5f5]/60">Chargement…</p>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
