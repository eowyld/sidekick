import type { Person, SacemRepartition } from "@/lib/sidekick-store";

/**
 * Clés de répartition SACEM par catégorie d'ayants droit.
 *
 * Quatre catégories et non trois : l'arrangeur a sa propre part (2/24 en DEP,
 * 1/16 en DRM), prise sur celle des compositeurs. L'ancienne version rangeait
 * cette part tantôt dans `publishers`, tantôt nulle part, si bien que la clé
 * DRM « auteur + compositeur + arrangeur + éditeur » totalisait 87,5 %.
 *
 * Chaque clé totalise 100. L'adaptateur est compté avec les auteurs.
 */
export interface SacemKey {
  authors: number;
  composers: number;
  arrangers: number;
  publishers: number;
}

export type RightsKind = "dep" | "drm";

const r2 = (n: number) => Math.round(n * 100) / 100;

export function rolesPresent(persons: Person[]) {
  return {
    author: persons.some((p) => p.roles.includes("author") || p.roles.includes("adapter")),
    composer: persons.some((p) => p.roles.includes("composer")),
    arranger: persons.some((p) => p.roles.includes("arranger")),
  };
}

export function computeKey(kind: RightsKind, persons: Person[], hasPublisher: boolean): SacemKey {
  const { author, composer: hasComposer, arranger: hasArranger } = rolesPresent(persons);
  // Un arrangement suppose une composition : sans compositeur déclaré,
  // l'arrangeur est traité comme compositeur.
  const composer = hasComposer || hasArranger;
  const arranger = hasComposer && hasArranger;

  const arrangerShare = arranger ? (kind === "dep" ? 100 / 12 : 6.25) : 0;
  const publisherShare = hasPublisher ? (kind === "dep" ? 100 / 3 : 50) : 0;
  const creators = 100 - arrangerShare - publisherShare;

  let authors = 0;
  let composers = 0;
  if (author && composer) {
    authors = creators / 2;
    composers = creators / 2;
  } else if (author) {
    authors = creators;
  } else if (composer) {
    composers = creators;
  }

  // Personne n'a de rôle créateur : la part éditeur n'a pas de sens seule.
  if (!author && !composer) return { authors: 0, composers: 0, arrangers: 0, publishers: 0 };

  // Précision complète : arrondir ici ferait totaliser 99,99 à trois tiers.
  // L'arrondi se fait à l'affichage (`formatPct`).
  return { authors, composers, arrangers: arrangerShare, publishers: publisherShare };
}

/** « 33,33 % », « 50 % », « — » pour zéro. */
export function formatPct(n: number): string {
  if (!n) return "—";
  return `${(Math.round(n * 100) / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
}

export function hasExternalPublisher(work: { selfPublished: boolean; externalPublishers: unknown[] }): boolean {
  return !work.selfPublished && work.externalPublishers.length > 0;
}

/** Forme stockée en base (`dep_repartition`, `drm_repartition`) : arrangeurs comptés avec les compositeurs. */
export function toStoredRepartition(key: SacemKey): SacemRepartition {
  return { authors: key.authors, composers: r2(key.composers + key.arrangers), publishers: key.publishers };
}
