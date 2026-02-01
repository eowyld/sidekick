"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function TestSupabasePage() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function check() {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.getSession();
        if (error) throw error;
        setStatus("ok");
        setMessage("Supabase connecté.");
      } catch (e) {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : String(e));
      }
    }
    check();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">Test Supabase</h1>
      {status === "loading" && <p className="text-muted-foreground">Vérification…</p>}
      {status === "ok" && (
        <p className="rounded-md bg-green-100 px-4 py-2 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          ✓ {message}
        </p>
      )}
      {status === "error" && (
        <p className="rounded-md bg-red-100 px-4 py-2 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          ✗ {message}
        </p>
      )}
      <a href="/" className="text-sm text-muted-foreground hover:underline">
        Retour
      </a>
    </main>
  );
}
