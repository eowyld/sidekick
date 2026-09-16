"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase";
import { migratePreferencesToSupabase } from "@/lib/migrate-preferences-to-supabase";
import { migrateFacturationToSupabase } from "@/lib/migrate-facturation-to-supabase";
import type { ReactNode } from "react";

const isAbortError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AbortError" || error.message.toLowerCase().includes("signal is aborted"));

/**
 * Redirige vers /login si l'utilisateur n'est pas connecté.
 * Chaque utilisateur a ses propres données ; nouvel user = données vides.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user }
        } = await getSessionUser(supabase);

        if (!isMounted) return;

        if (!user) {
          router.replace("/login");
        } else {
          // Reprise des préférences localStorage au premier écran authentifié,
          // quel qu'il soit : elles pilotent la sidebar de toute l'application.
          void migratePreferencesToSupabase().catch((e) => {
            if (!isAbortError(e)) console.error("[AuthGuard] Migration des préférences échouée:", e);
          });
          // Modèle de facture, pied de page, et rattachement des factures au
          // statut juridique — la dernière donnée de facturation hors base.
          void migrateFacturationToSupabase().catch((e) => {
            if (!isAbortError(e)) console.error("[AuthGuard] Migration de la facturation échouée:", e);
          });
        }

        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!session?.user) {
            router.replace("/login");
          }
        });

        subscription = data?.subscription ?? null;
      } catch (e) {
        if (!isAbortError(e)) console.error("[AuthGuard] Error while checking auth:", e);
      } finally {
        if (isMounted) {
          setChecked(true);
        }
      }
    })();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return <>{children}</>;
}
