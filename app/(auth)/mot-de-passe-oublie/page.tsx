"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { authErrorMessage } from "@/lib/auth-errors";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELD_LABEL = "text-xs uppercase tracking-[0.12em] text-[#f5f5f5]/60";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        // Le lien de récupération porte un code PKCE : il doit passer par
        // /auth/callback pour être échangé contre une session, puis atterrir
        // sur la saisie du nouveau mot de passe.
        redirectTo: `${window.location.origin}/auth/callback?next=/nouveau-mot-de-passe`,
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="space-y-8">
        <h1 className="font-display text-2xl uppercase leading-none">
          Mot de passe oublié
        </h1>

        {error && <AuthMessage>{error}</AuthMessage>}

        {sent ? (
          <div className="space-y-6">
            <p className="text-sm leading-relaxed text-[#f5f5f5]/70">
              Si un compte existe avec cette adresse, un lien de réinitialisation
              vient de partir. Vérifie ta boîte, et les indésirables.
            </p>
            <Link
              href="/login"
              className="text-xs uppercase tracking-[0.15em] text-[#F0FF00] transition-opacity hover:opacity-80"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-[#f5f5f5]/60">
              Indique ton adresse : on t&apos;envoie un lien pour en choisir un
              nouveau.
            </p>

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
              <Button
                type="submit"
                size="lg"
                className="btn-glow w-full"
                disabled={loading}
              >
                {loading ? "Envoi…" : "Envoyer le lien"}
              </Button>
            </form>

            <p className="text-center text-sm text-[#f5f5f5]/60">
              Tu t&apos;en souviens ?{" "}
              <Link
                href="/login"
                className="font-medium text-[#F0FF00] hover:underline"
              >
                Se connecter
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
