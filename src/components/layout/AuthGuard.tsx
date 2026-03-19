"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { ReactNode } from "react";

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
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (!user) {
          router.replace("/login");
        }

        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!session?.user) {
            router.replace("/login");
          }
        });

        subscription = data?.subscription ?? null;
      } catch (e) {
        console.error("[AuthGuard] Error while checking auth:", e);
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
