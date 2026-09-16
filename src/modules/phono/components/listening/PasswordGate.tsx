"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PasswordGateProps {
  slug: string;
  title: string;
  onUnlocked: () => void;
}

export function PasswordGate({ slug, title, onUnlocked }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/listening/${slug}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Code incorrect.");
        return;
      }
      onUnlocked();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <Lock className="h-6 w-6" style={{ color: "#F0FF00" }} />
        <h1 className="text-xl font-medium">{title || "Écoute privée"}</h1>
        <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
          Cette page est protégée par un code, transmis avec le lien.
        </p>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Code d'accès"
          autoFocus
        />
        {error && (
          <p className="text-sm" style={{ color: "#ff6b6b" }}>
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={busy || password.length === 0}
          className="w-full"
        >
          {busy ? "Vérification…" : "Accéder à l'écoute"}
        </Button>
      </form>
    </main>
  );
}
