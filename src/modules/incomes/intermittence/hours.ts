import { CACHET_HEURES, CACHETS_MAX_MOIS } from "./params";

/**
 * Heures correspondant à un nombre de cachets. Un intermittent saisit des
 * cachets, le régime compte des heures : la conversion est faite pour lui.
 */
export function heuresPourCachets(cachets: number): number {
  if (!Number.isFinite(cachets) || cachets <= 0) return 0;
  return cachets * CACHET_HEURES;
}

/**
 * Nombre de cachets retenus dans un mois civil, plafond compris.
 * Au-delà du plafond, les cachets supplémentaires ne comptent pas.
 */
export function cachetsRetenus(cachets: number): number {
  if (!Number.isFinite(cachets) || cachets <= 0) return 0;
  return Math.min(Math.floor(cachets), CACHETS_MAX_MOIS);
}
