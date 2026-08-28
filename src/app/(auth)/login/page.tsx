"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { usePostHog } from "posthog-js/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasError = searchParams.get("error") === "auth";
  const redirectedFrom = searchParams.get("redirectedFrom");
  const nextPath =
    redirectedFrom && redirectedFrom.startsWith("/") && !redirectedFrom.startsWith("//")
      ? redirectedFrom
      : "/dashboard";
  const posthogClient = usePostHog();

  useEffect(() => {
    if (!loading && user) {
      posthogClient?.identify(user.id, {
        email: user.email ?? undefined,
        name: user.user_metadata?.full_name ?? user.user_metadata?.first_name ?? undefined,
      });
      posthogClient?.capture("user_signed_in", { method: "google" });
      router.replace(nextPath);
    }
  }, [loading, nextPath, posthogClient, router, user]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md border-[rgba(245,245,245,0.16)] bg-[rgba(16,16,16,0.92)]">
        <CardHeader className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-[#F0FF00]/75">Sidekick</p>
          <CardTitle className="text-3xl">Connexion</CardTitle>
          <CardDescription>
            Connectez-vous avec Google pour retrouver votre espace Sidekick sans flash de contenu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasError ? (
            <div className="border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              La connexion a echoue. Reessayez avec votre compte Google.
            </div>
          ) : null}

          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              posthog.capture("login_clicked", { provider: "google" });
              void signInWithGoogle(nextPath);
            }}
            disabled={loading}
          >
            {loading ? "Verification..." : "Se connecter avec Google"}
          </Button>

          <p className="text-sm text-[#F5F5F5]/55">
            L&apos;authentification est geree par Supabase SSR et la session est verifiee cote serveur.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
