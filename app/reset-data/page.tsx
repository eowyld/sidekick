"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getStorageKey } from "@/lib/sidekick-store";

/**
 * Réinitialise les données Sidekick du compte connecté (localStorage).
 * Ouvre cette page ou lance "npm run reset-data" pour effacer tes données.
 */
export default function ResetDataPage() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const run = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const key = getStorageKey(user?.id ?? null);
        window.localStorage.removeItem(key);
        setDone(true);
      } catch (e) {
        console.warn("Reset data failed:", e);
      }
    };
    run();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {done ? "Données réinitialisées" : "Réinitialisation…"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {done
            ? "Tes données Sidekick (tâches, etc.) ont été effacées. Tu peux repartir de zéro."
            : "Effacement des données en cours…"}
        </p>
        {done && (
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Retour au tableau de bord
          </Link>
        )}
      </div>
    </main>
  );
}
