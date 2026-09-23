// src/modules/incomes/intermittence/statut-params.ts
import type { AdminStatus } from "@/lib/sidekick-store";
import type { Annexe } from "./params";

export interface IntermittenceParams {
  annexe: Annexe;
  /** Allocation journalière notifiée par France Travail, en euros. */
  ajNotifiee: number | null;
  /** YYYY-MM-DD */
  dateOuvertureDroits: string | null;
  /** YYYY-MM-DD. Fin de la fenêtre de 12 mois glissants. */
  dateAnniversaire: string | null;
  congesSpectaclesAcquis: boolean;
}

export const PARAMS_DEFAUT: IntermittenceParams = {
  annexe: "10",
  ajNotifiee: null,
  dateOuvertureDroits: null,
  dateAnniversaire: null,
  congesSpectaclesAcquis: false,
};

function nombreOuNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function texteOuNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

/** Lecture tolérante : un statut sans paramètres renvoie les valeurs par défaut. */
export function lireParams(statut: AdminStatus | null | undefined): IntermittenceParams {
  const brut = (statut?.data?.intermittence ?? {}) as Record<string, unknown>;
  return {
    annexe: brut.annexe === "8" ? "8" : "10",
    ajNotifiee: nombreOuNull(brut.ajNotifiee),
    dateOuvertureDroits: texteOuNull(brut.dateOuvertureDroits),
    dateAnniversaire: texteOuNull(brut.dateAnniversaire),
    congesSpectaclesAcquis: brut.congesSpectaclesAcquis === true,
  };
}

/**
 * Écriture non destructive : le reste du `data` du statut est préservé.
 * Admin y range d'autres clés, les écraser casserait le module Statuts.
 */
export function ecrireParams(statut: AdminStatus, params: IntermittenceParams): AdminStatus {
  return { ...statut, data: { ...(statut.data ?? {}), intermittence: params } };
}
