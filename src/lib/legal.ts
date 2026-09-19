/**
 * Source unique des informations légales affichées sur le site : identité de
 * l'éditeur, contact, versions des documents.
 *
 * Mentions légales, CGU et politique de confidentialité lisent toutes ce
 * fichier. Une adresse ou un numéro RCS ne s'écrit jamais en dur dans une page :
 * c'est comme ça qu'on finit avec trois versions différentes du siège social.
 *
 * Reste à renseigner avant l'ouverture du 24/09 : le médiateur de la
 * consommation. Voir `docs/legal/README.md`.
 */

export const LEGAL_EDITOR = {
  /** Dénomination sociale exacte, telle qu'au Kbis. */
  companyName: "PHÖS AGENCY",
  legalForm: "SAS",
  /** En euros, tel qu'aux statuts. */
  shareCapital: "6 000",
  rcs: "980 520 142 R.C.S. Lille Métropole",
  /** Siège social, une ligne. */
  address: "117 rue Roger Salengro, 59239 Thumeries, France",
  /** Numéro de TVA intracommunautaire, s'il existe. Chaîne vide sinon. */
  vatNumber: "FR33980520142",
  /** Président de la SAS, qui est aussi directeur de la publication. */
  publicationDirector: "Eliott Matton",
  /** Obligatoire pour un éditeur professionnel (LCEN). */
  phone: "+33 6 49 51 93 27",
  /**
   * L'éditeur est en franchise en base de TVA : aucune TVA n'est facturée, et
   * toute facture doit porter la mention de l'article 293 B du CGI. Le numéro
   * de TVA intracommunautaire existe pour les achats auprès de prestataires
   * établis hors de France (autoliquidation), pas pour collecter.
   */
  vatExempt: true,
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
  cgu: "24 septembre 2026",
  confidentialite: "24 septembre 2026",
  mentions: "24 septembre 2026",
} as const;

/** Âge minimum pour créer un compte. */
export const MIN_AGE = 18;
