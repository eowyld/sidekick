// src/modules/incomes/intermittence/counter.ts
import { HEURES_REQUISES } from "./params";

export interface MissionComptee {
  /** YYYY-MM-DD */
  date: string;
  heures: number;
}

export interface Compteur {
  heuresAcquises: number;
  heuresRequises: number;
  heuresRestantes: number;
  droitsOuverts: boolean;
  /** Début de la fenêtre de 12 mois, YYYY-MM-DD. */
  debutFenetre: string;
  /** Fin de la fenêtre, YYYY-MM-DD. */
  finFenetre: string;
  /** Rythme observé sur la fenêtre, en heures par mois. */
  rythmeMensuel: number;
  /**
   * Mois estimés avant d'atteindre 507 h au rythme observé.
   * null si les droits sont ouverts, ou si le rythme est nul.
   */
  moisAvantOuverture: number | null;
}

function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${j}`;
}

/**
 * Compteur sur les 12 mois glissants s'achevant à `finFenetre`.
 * `finFenetre` est la date anniversaire quand elle est connue, sinon aujourd'hui.
 */
export function compteur(missions: MissionComptee[], finFenetre: Date): Compteur {
  const debut = new Date(finFenetre);
  debut.setFullYear(debut.getFullYear() - 1);
  debut.setDate(debut.getDate() + 1);

  const debutISO = toISO(debut);
  const finISO = toISO(finFenetre);

  const heuresAcquises = missions
    .filter((m) => m.date >= debutISO && m.date <= finISO)
    .reduce((total, m) => total + (Number.isFinite(m.heures) ? m.heures : 0), 0);

  const heuresRestantes = Math.max(0, HEURES_REQUISES - heuresAcquises);
  const rythmeMensuel = heuresAcquises / 12;

  return {
    heuresAcquises,
    heuresRequises: HEURES_REQUISES,
    heuresRestantes,
    droitsOuverts: heuresAcquises >= HEURES_REQUISES,
    debutFenetre: debutISO,
    finFenetre: finISO,
    rythmeMensuel,
    moisAvantOuverture:
      heuresAcquises >= HEURES_REQUISES || rythmeMensuel <= 0
        ? null
        : Math.ceil(heuresRestantes / rythmeMensuel),
  };
}
