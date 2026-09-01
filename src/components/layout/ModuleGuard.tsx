"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePreferencesData, type EnabledModules } from "@/hooks/usePreferencesData";
import { isComingSoon } from "@/lib/coming-soon";
import { ComingSoon } from "@/components/layout/ComingSoon";

/**
 * Préfixe de route → clé de module. L'ordre importe peu, les préfixes ne se
 * chevauchent pas. Les routes hors de cette table (dashboard, calendrier,
 * tâches, contacts, réglages) sont toujours accessibles.
 */
const ROUTE_MODULES: { prefix: string; module: keyof EnabledModules }[] = [
  { prefix: "/phono", module: "phono" },
  { prefix: "/edition", module: "edition" },
  { prefix: "/live", module: "live" },
  { prefix: "/incomes", module: "revenus" },
  { prefix: "/marketing", module: "marketing" },
  { prefix: "/admin", module: "admin" },
  { prefix: "/projects", module: "projects" },
];

function moduleForPath(pathname: string): keyof EnabledModules | null {
  const match = ROUTE_MODULES.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(entry.prefix + "/")
  );
  return match?.module ?? null;
}

/**
 * Renvoie vers le tableau de bord toute route appartenant à un module que
 * l'utilisateur a désactivé — la sidebar ne suffit pas, l'URL reste tapable.
 *
 * Il s'agit d'une préférence d'affichage, pas d'un contrôle de sécurité :
 * la protection des données reste assurée par l'authentification (proxy.ts)
 * et la RLS Supabase.
 */
export function ModuleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { enabledModules, preferencesReady } = usePreferencesData();

  const moduleKey = moduleForPath(pathname);
  const blocked = preferencesReady && moduleKey !== null && enabledModules[moduleKey] === false;

  useEffect(() => {
    if (blocked) router.replace("/dashboard");
  }, [blocked, router]);

  // Fermé pour l'alpha : on affiche l'écran « Bientôt » plutôt que de rediriger.
  // L'utilisateur a cliqué en connaissance de cause, une redirection silencieuse
  // lui laisserait croire à un bug.
  if (isComingSoon(pathname)) return <ComingSoon />;

  // Ne rien peindre pendant la redirection, pour éviter le flash de la page.
  if (blocked) return null;

  return <>{children}</>;
}
