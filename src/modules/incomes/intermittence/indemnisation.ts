// src/modules/incomes/intermittence/indemnisation.ts
import {
  type Annexe,
  DECALAGE,
  FRANCHISE,
  HEURES_PAR_JOUR_ACTIVITE,
  JOURS_ACTIVITE_MAX,
} from "./params";

/** Nombre de jours du mois civil. `mois` est 1-12. */
export function joursDuMois(annee: number, mois: number): number {
  return new Date(annee, mois, 0).getDate();
}

/**
 * Jours d'allocation retirés par le travail du mois.
 * Arrondi à l'entier INFÉRIEUR, et seulement à la fin : jamais sur un
 * résultat intermédiaire.
 *
 * 80 h en annexe 8  → (80 / 8)  × 1,4  = 14 jours
 * 36 h en annexe 10 → (36 / 10) × 1,34 = 4,824 → 4 jours
 */
export function decalage(heures: number, annexe: Annexe): number {
  if (!Number.isFinite(heures) || heures <= 0) return 0;
  const { diviseur, coefficient } = DECALAGE[annexe];
  return Math.floor((heures / diviseur) * coefficient);
}

/** Franchise du mois, en jours. */
export function franchise(annexe: Annexe, congesSpectaclesAcquis: boolean): number {
  const f = FRANCHISE[annexe];
  return congesSpectaclesAcquis ? f.avecConges : f.base;
}

export interface MoisIndemniseParams {
  annee: number;
  mois: number;               // 1-12
  heuresTravaillees: number;
  annexe: Annexe;
  congesSpectaclesAcquis: boolean;
  /** Allocation journalière notifiée par France Travail. null = inconnue. */
  aj: number | null;
}

/**
 * Jours d'activité du mois, déduits des heures. Sert au seuil de l'annexe 10.
 * Arrondi à l'entier inférieur : une journée entamée n'est pas une journée.
 */
export function joursActivite(heures: number, annexe: Annexe): number {
  if (!Number.isFinite(heures) || heures <= 0) return 0;
  return Math.floor(heures / HEURES_PAR_JOUR_ACTIVITE[annexe]);
}

/**
 * Annexe 10 : au-delà d'un certain nombre de jours d'activité dans le mois,
 * aucune indemnisation. Règle distincte du décalage, qui s'applique par-dessus.
 */
export function activiteBloquante(heures: number, annexe: Annexe): boolean {
  const seuil = JOURS_ACTIVITE_MAX[annexe];
  if (seuil === null) return false;
  return joursActivite(heures, annexe) >= seuil;
}

export interface MoisIndemnise {
  joursDuMois: number;
  franchise: number;
  decalage: number;
  joursActivite: number;
  /** true quand le seuil d'activité de l'annexe 10 coupe toute indemnisation. */
  activiteBloquante: boolean;
  /** Jamais négatif : un mois très travaillé plafonne à zéro jour indemnisé. */
  joursIndemnisables: number;
  /** null quand l'AJ n'est pas connue. Le montant n'est alors pas affiché. */
  montant: number | null;
}

/**
 * Décompte du mois. Trois déductions DISTINCTES, dans cet ordre :
 * la franchise, le décalage — leur cumul est l'erreur classique du domaine —
 * puis le seuil d'activité de l'annexe 10, qui écrase tout le reste.
 */
export function moisIndemnise(p: MoisIndemniseParams): MoisIndemnise {
  const jours = joursDuMois(p.annee, p.mois);
  const f = franchise(p.annexe, p.congesSpectaclesAcquis);
  const d = decalage(p.heuresTravaillees, p.annexe);
  const ja = joursActivite(p.heuresTravaillees, p.annexe);
  const bloquante = activiteBloquante(p.heuresTravaillees, p.annexe);

  const joursIndemnisables = bloquante ? 0 : Math.max(0, jours - f - d);

  return {
    joursDuMois: jours,
    franchise: f,
    decalage: d,
    joursActivite: ja,
    activiteBloquante: bloquante,
    joursIndemnisables,
    montant: p.aj === null ? null : Math.round(p.aj * joursIndemnisables * 100) / 100,
  };
}
