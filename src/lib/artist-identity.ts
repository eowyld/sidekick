import type { Person } from "@/lib/sidekick-store";

/**
 * Identité de l'artiste — voir CLAUDE.md, section « Identité de l'artiste ».
 *
 * Deux noms coexistent :
 * - le nom affiché (`user_preferences.artist_name`), nom d'artiste ou « Prénom
 *   Nom » selon `identity_mode` : il signe les sorties (titres, albums, mixes)
 *   et l'en-tête du lien d'écoute ;
 * - le nom civil (`user_metadata`) : il signe les œuvres, qui se déclarent
 *   sous l'identité civile de leurs auteurs, jamais sous un nom de scène.
 */

export type IdentityMode = "artist" | "legal";

export type LegalNameParts = {
  firstName: string;
  lastName: string;
  /** « Prénom Nom », chaîne vide si rien n'est connu. */
  full: string;
};

/**
 * Nom civil depuis `user_metadata`. L'inscription par email n'écrit que
 * `full_name` ; Réglages écrit `first_name` / `last_name` ; Google fournit
 * `given_name` / `family_name` et `full_name`. Les champs séparés priment.
 */
export function legalNameParts(meta: Record<string, unknown>): LegalNameParts {
  const str = (key: string) =>
    typeof meta[key] === "string" ? (meta[key] as string).trim() : "";

  let firstName = str("first_name") || str("firstname") || str("given_name");
  let lastName = str("last_name") || str("lastname") || str("family_name");

  if (!firstName && !lastName) {
    const [first, ...rest] = (str("full_name") || str("name"))
      .split(/\s+/)
      .filter(Boolean);
    firstName = first ?? "";
    lastName = rest.join(" ");
  }

  return {
    firstName,
    lastName,
    full: [firstName, lastName].filter(Boolean).join(" "),
  };
}

/**
 * Valeur initiale d'un champ « artiste » de sortie (titre, album, mix) à la
 * création. Tout nouveau champ de ce type passe par ici, jamais par une
 * lecture directe de `artist_title` (presskit) ou de `full_name`.
 */
export function defaultArtist(artistName: string): string {
  return artistName.trim();
}

/**
 * L'utilisateur comme ayant droit d'une nouvelle œuvre : nom civil, nom
 * d'artiste en pseudonyme, auteur et compositeur. Un point de départ,
 * retirable et modifiable comme n'importe quel ayant droit. `null` si le nom
 * civil est inconnu : mieux vaut aucune entrée qu'une entrée vide.
 */
export function selfPerson(
  legal: LegalNameParts,
  identityMode: IdentityMode | null,
  artistName: string
): Person | null {
  if (!legal.full) return null;
  return {
    id: crypto.randomUUID(),
    // `name` est le champ obligatoire d'un ayant droit : sans nom de famille
    // connu, le prénom y prend place.
    firstName: legal.lastName ? legal.firstName : "",
    name: legal.lastName || legal.firstName,
    pseudonym: identityMode === "artist" ? artistName.trim() : "",
    roles: ["author", "composer"],
  };
}
