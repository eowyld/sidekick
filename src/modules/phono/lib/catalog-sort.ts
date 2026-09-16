import { toIsoDatePickerValue } from "@/lib/date-format";

export type SortKey = "date-desc" | "title-asc" | "recent";

export const CATALOG_SORTS: { value: SortKey; label: string }[] = [
  { value: "date-desc", label: "Date de sortie" },
  { value: "title-asc", label: "Titre A→Z" },
  { value: "recent", label: "Date de création" },
];

/** Le minimum commun aux titres, albums et mixes pour être triables. */
interface Sortable {
  title?: string;
  releaseDate?: string;
}

/**
 * Ordre d'affichage d'une catégorie du catalogue.
 *
 * Une seule implémentation pour les trois onglets **et** pour la file du
 * lecteur : c'est ce qui garantit que « suivant » enchaîne bien dans l'ordre
 * que l'artiste a sous les yeux. Deux tris parallèles finiraient par diverger,
 * et la file sauterait alors des morceaux sans raison visible.
 */
export function sortCatalog<T extends Sortable>(
  rows: readonly T[],
  key: SortKey
): T[] {
  const sorted = [...rows];

  if (key === "title-asc") {
    sorted.sort((a, b) => (a.title || "").localeCompare(b.title || "", "fr"));
    return sorted;
  }

  if (key === "date-desc") {
    // Sans date de sortie, une entrée passe en fin de liste plutôt qu'en tête :
    // une fiche encore vide n'a pas à occuper la première place.
    sorted.sort((a, b) => {
      const da = toIsoDatePickerValue(a.releaseDate || "");
      const db = toIsoDatePickerValue(b.releaseDate || "");
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db.localeCompare(da);
    });
    return sorted;
  }

  // « Date de création » : l'ordre d'arrivée du hook, qui trie déjà sur
  // `created_at` décroissant. Rien à faire de plus.
  return sorted;
}
