// src/modules/phono/lib/release-status.ts
import type { ReleaseStatus } from "@/lib/sidekick-store";

export const RELEASE_STATUSES: { value: ReleaseStatus; label: string }[] = [
  { value: "en_production", label: "En production" },
  { value: "mixe", label: "Mixé" },
  { value: "masterise", label: "Mastérisé" },
  { value: "publie", label: "Publié" },
];

/** Ordre chronologique : Production < Mixé < Mastérisé < Publié. */
const RELEASE_STATUS_ORDER: Record<ReleaseStatus, number> = {
  en_production: 0,
  mixe: 1,
  masterise: 2,
  publie: 3,
};

/**
 * Couleurs du pipeline. Empruntées au vocabulaire de `LiveOverviewPage`, où
 * chaque statut a une teinte stable réutilisée par la barre segmentée, la
 * légende et les pastilles de ligne.
 */
export const RELEASE_STATUS_COLOR: Record<ReleaseStatus, string> = {
  en_production: "#F59E0B",
  mixe: "#38BDF8",
  masterise: "#A78BFA",
  publie: "#34D399",
};

export function releaseStatusLabel(s: ReleaseStatus): string {
  return RELEASE_STATUSES.find((r) => r.value === s)?.label ?? s;
}

/** Vrai si `newStatus` est une étape strictement plus avancée que l'actuelle. */
export function isStatusMoreAdvanced(
  newStatus: ReleaseStatus,
  currentStatus: ReleaseStatus | undefined
): boolean {
  const current = currentStatus ? RELEASE_STATUS_ORDER[currentStatus] ?? -1 : -1;
  const next = RELEASE_STATUS_ORDER[newStatus] ?? 0;
  return next > current;
}
