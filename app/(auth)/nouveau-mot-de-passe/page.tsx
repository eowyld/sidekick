"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const isAbortError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AbortError" || error.message.toLowerCase().includes("signal is aborted"));
import { authErrorMessage } from "@/lib/auth-errors";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELD_LABEL = "text-xs uppercase tracking-[0.12em] text-[#f5f5f5]/60";
const MIN_LENGTH = 8;

export default function NewPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // `null` = vérification en cours. On n'affiche le formulaire qu'une fois la
  // session confirmée : /auth/callback l'a créée en échangeant le code du lien.
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser()
      .then(({ data: { user } }) => setHasSession(Boolean(user)))
      .catch((authError) => {
        if (!isAbortError(authError)) console.error("[NewPasswordPage] Auth échouée:", authError);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`Le mot de passe doit faire au moins ${MIN_LENGTH} caractères.`);
      return;
    }
    if (password !== confirmation) {
      setError("Les deux mots de passe ne sont pas identiques.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (hasSession === null) {
    return (
      <AuthShell>
        <p className="text-sm text-[#f5f5f5]/60">Vérification du lien…</p>
      </AuthShell>
    );
  }

  // Lien expiré, déjà utilisé, ou page ouverte directement : sans session,
  // `updateUser` échouerait avec un message technique. Mieux vaut le dire.
  if (!hasSession) {
    return (
      <AuthShell>
        <div className="space-y-8">
          <h1 className="font-display text-2xl uppercase leading-none">
            Lien expiré
          </h1>
          <p className="text-sm leading-relaxed text-[#f5f5f5]/70">
            Ce lien de réinitialisation n&apos;est plus valable. Demandes-en un
            nouveau, il reste actif une heure.
          </p>
          <Link
            href="/mot-de-passe-oublie"
            className="text-xs uppercase tracking-[0.15em] text-[#F0FF00] transition-opacity hover:opacity-80"
          >
            Demander un nouveau lien
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-8">
        <h1 className="font-display text-2xl uppercase leading-none">
          Nouveau mot de passe
        </h1>

        {error && <AuthMessage>{error}</AuthMessage>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className={FIELD_LABEL}>
              Nouveau mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_LENGTH}
              autoComplete="new-password"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmation" className={FIELD_LABEL}>
              Confirmation
            </Label>
            <Input
              id="confirmation"
              type="password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
              minLength={MIN_LENGTH}
              autoComplete="new-password"
              className="h-11"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="btn-glow w-full"
            disabled={loading}
          >
            {loading ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
