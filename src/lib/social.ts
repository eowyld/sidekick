/**
 * Comptes publics de la marque.
 *
 * Même logique que `src/lib/legal.ts` : une seule source, pour qu'un compte
 * renommé ne laisse pas trois liens morts dans le site. Le `sameAs` du JSON-LD
 * (`app/layout.tsx`) lira d'ici le jour où il sera renseigné.
 */

export const SOCIAL_INSTAGRAM = {
  handle: "sidekick.artists",
  url: "https://www.instagram.com/sidekick.artists/",
} as const;

/**
 * L'URL porte l'identifiant numérique de la page, pas un nom : c'est la forme
 * que LinkedIn donne tant qu'aucune URL personnalisée n'est réclamée. Elle
 * restera valable après, mais elle vaut la peine d'être remplacée le jour où la
 * page en a une — un lien lisible se partage, un matricule non.
 */
export const SOCIAL_LINKEDIN = {
  label: "SIDEKICK",
  url: "https://www.linkedin.com/company/143617034/",
} as const;
