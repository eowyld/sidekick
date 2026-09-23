// src/modules/incomes/intermittence/params.ts
//
// Constantes du régime d'assurance chômage des intermittents du spectacle.
// SEUL endroit du dépôt où un nombre réglementaire est écrit. Ni composant ni
// fonction de calcul ne doit en redéfinir un.
//
// Source : règlement annexé à la convention d'assurance chômage du 15/11/2024,
// annexes VIII (techniciens) et X (artistes). Coefficients de décalage :
// annexes VIII et X, art. 32 §1er, et fiches techniques UNÉDIC.

/** Date de dernière vérification des valeurs ci-dessous. Affichée à l'écran. */
export const DERNIERE_VERIFICATION = "2026-09-23";

export type Annexe = "8" | "10";

/**
 * Décalage mensuel : chaque heure travaillée dans le mois retire une fraction
 * de jour d'allocation. C'est la mécanique du « plus tu travailles, moins tu
 * touches ». Distincte de la franchise, et cumulative avec elle.
 *
 * Annexe 8  : heures / 8  × 1,4  = 0,175 jour par heure
 * Annexe 10 : heures / 10 × 1,34 = 0,134 jour par heure
 */
export const DECALAGE: Record<Annexe, { diviseur: number; coefficient: number }> = {
  "8": { diviseur: 8, coefficient: 1.4 },
  "10": { diviseur: 10, coefficient: 1.34 },
};

/** Franchise mensuelle, en jours. Annexe 10 : 3 jours si congés spectacles acquis. */
export const FRANCHISE: Record<Annexe, { base: number; avecConges: number }> = {
  "8": { base: 2, avecConges: 2 },
  "10": { base: 2, avecConges: 3 },
};

/**
 * ⚠️ CONFLIT NON TRANCHÉ sur le coefficient annexe 10.
 *
 * Deux valeurs circulent : 1,34 / 10 h (retenue ci-dessus) et 1 / 12 h.
 * Elles ne sont pas compatibles avec la règle des 27 jours (`JOURS_ACTIVITE_MAX`) :
 *
 *   - à 1,34/10 : 27 jours = 270 h → décalage 36 > 31 jours. L'indemnisation
 *     tombe à zéro dès 232 h (23,2 jours), donc AVANT le seuil des 27 jours,
 *     qui devient inatteignable et contredit le texte.
 *   - à 1/12   : 270 h → décalage 22, il reste ~6 jours que le seuil des
 *     27 jours vient couper. Les deux règles s'emboîtent.
 *
 * Test décisif sur un relevé France Travail réel : un mois à 3 cachets (36 h)
 * retire 4 jours à 1,34/10, et 3 jours à 1/12.
 *
 * Basculer = changer la seule ligne `"10"` de DECALAGE ci-dessus en
 * `{ diviseur: 12, coefficient: 1 }`, puis relancer `npm run check:intermittence`.
 */

/** Équivalence d'un cachet en heures. Identique pour un cachet isolé ou groupé. */
export const CACHET_HEURES = 12;

/**
 * Annexe 10 : à partir de ce nombre de jours d'activité dans le mois civil,
 * aucune indemnisation n'est versée. Les jours d'activité se déduisent des
 * heures sur une base de 10 h par jour.
 * Pas d'équivalent connu en annexe 8, d'où `null`.
 */
export const JOURS_ACTIVITE_MAX: Record<Annexe, number | null> = { "8": null, "10": 27 };

/** Base de conversion heures → jours d'activité, pour le seuil ci-dessus. */
export const HEURES_PAR_JOUR_ACTIVITE: Record<Annexe, number> = { "8": 8, "10": 10 };

/** Plafond du nombre de cachets pris en compte dans un mois civil. */
export const CACHETS_MAX_MOIS = 28;

/** Heures requises pour l'ouverture de droits, sur 12 mois. */
export const HEURES_REQUISES = 507;

/** Montant minimum servi, en euros. */
export const AJ_MINIMUM_SERVI: Record<Annexe, number> = { "8": 38, "10": 44 };

/** Lien officiel, cité partout où un montant calculé s'affiche. */
export const SIMULATEUR_FRANCE_TRAVAIL = "https://simucalcul.pole-emploi-services.fr/";
