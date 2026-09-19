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
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_50%_0%,rgba(240,255,0,0.09),transparent_36%),#101010] p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-white/[0.09] bg-[rgba(44,44,46,0.55)] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full border border-[#F0FF00]/25 bg-[#F0FF00]/10"><Lock className="h-5 w-5 text-[#F0FF00]" /></div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#F0FF00]">Accès protégé</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{title || "Écoute privée"}</h1>
        <p className="mb-5 mt-2 text-sm text-[#F5F5F5]/50">
          Cette page est protégée par un code, transmis avec le lien.
        </p>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Code d'accès"
          aria-label="Code d'accès"
          autoFocus
        />
        {error && (
          <p className="mt-2 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={busy || password.length === 0}
          className="mt-5 w-full"
        >
          {busy ? "Vérification…" : "Accéder à l'écoute"}
        </Button>
      </form>
    </main>
  );
}
