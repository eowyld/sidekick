"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SIDEKICK_STORAGE_KEY } from "@/lib/sidekick-store";

/**
 * Réinitialise toutes les données Sidekick (localStorage).
 * Ouvre cette page ou lance "npm run reset-data" pour tout effacer.
 */
export default function ResetDataPage() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(SIDEKICK_STORAGE_KEY);
      setDone(true);
    } catch (e) {
      console.warn("Reset data failed:", e);
    }
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {done ? "Données réinitialisées" : "Réinitialisation…"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {done
            ? "Toutes les données Sidekick (tâches, etc.) ont été effacées. Tu peux repartir de zéro."
            : "Effacement des données en cours…"}
        </p>
        {done && (
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Retour à l&apos;accueil
          </Link>
        )}
      </div>
    </main>
  );
}
