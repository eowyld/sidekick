/**
 * Source unique des informations légales affichées sur le site : identité de
 * l'éditeur, contact, versions des documents.
 *
 * Mentions légales, CGU et politique de confidentialité lisent toutes ce
 * fichier. Une adresse ou un numéro RCS ne s'écrit jamais en dur dans une page :
 * c'est comme ça qu'on finit avec trois versions différentes du siège social.
 *
 * Les champs `TODO_` doivent être remplis avant l'ouverture du 21/09 — voir
 * `docs/legal/README.md`.
 */

export const LEGAL_EDITOR = {
  /** Dénomination sociale exacte, telle qu'au Kbis. */
  companyName: "PHÖS AGENCY",
  legalForm: "SAS",
  /** En euros, tel qu'aux statuts. */
  shareCapital: "6 000",
  /** Ville du greffe à relire sur le Kbis : Thumeries dépend de l'arrondissement de Lille. */
  rcs: "980 520 142 R.C.S. TODO_VILLE_GREFFE",
  /** Siège social, une ligne. */
  address: "117 rue Roger Salengro, 59239 Thumeries, France",
  /** Numéro de TVA intracommunautaire, s'il existe. Chaîne vide sinon. */
  vatNumber: "FR33980520142",
  /** Président de la SAS, qui est aussi directeur de la publication. */
  publicationDirector: "TODO_NOM_PRESIDENT",
  /** Obligatoire pour un éditeur professionnel (LCEN). */
  phone: "TODO_TELEPHONE",
} as const;

export const LEGAL_CONTACT_EMAIL = "hello@sidekickartists.com";

export const LEGAL_HOST = {
  name: "Vercel Inc.",
  address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
  phone: "+1 559 288 7060",
  website: "https://vercel.com",
} as const;

/**
 * Médiateur de la consommation (art. L612-1 du Code de la consommation).
 * Adhésion à souscrire avant l'ouverture, voir `docs/legal/README.md`.
 */
export const LEGAL_MEDIATOR = {
  name: "TODO_NOM_MEDIATEUR",
  website: "TODO_SITE_MEDIATEUR",
} as const;

/** Date d'entrée en vigueur des versions en ligne. À changer à chaque révision. */
export const LEGAL_UPDATED = {
  cgu: "21 septembre 2026",
  confidentialite: "21 septembre 2026",
  mentions: "21 septembre 2026",
} as const;

/** Âge minimum pour créer un compte. */
export const MIN_AGE = 18;
