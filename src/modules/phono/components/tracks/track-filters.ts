import type { ReleaseStatus } from "@/lib/sidekick-store";
import type { CatalogFilter } from "../CatalogHeader";

export type SortKey = "date-desc" | "title-asc" | "status" | "recent";

/**
 * États du filtre Audio que `CatalogFilter` ne sait pas représenter.
 * Le bandeau du catalogue ne propose que « sans audio » ; « avec audio » n'a de
 * sens que dans la barre d'outils, d'où cet état local complémentaire.
 */
export type AudioExtra = "all" | "with";

/** Idem pour l'ISRC : le bandeau ne propose que « manquant ». */
export type IsrcExtra = "all" | "present";

export interface EffectiveFilterValues {
  status: ReleaseStatus | "all";
  audio: "all" | "with" | "without";
  isrc: "all" | "present" | "missing";
}

/**
 * Valeurs effectives des filtres, dérivées du filtre du bandeau et des états
 * locaux de la barre d'outils.
 *
 * `filter` l'emporte toujours : cliquer « 5 sans ISRC » dans le bandeau doit
 * positionner le Select correspondant, quelle que soit sa valeur précédente.
 *
 * Cette dérivation a deux consommateurs — la barre d'outils, qui en tire la
 * `value` de ses Select, et l'onglet, qui en tire son prédicat de filtrage.
 * Elle vit donc ici plutôt qu'en double : deux copies désynchronisées
 * afficheraient un Select qui contredit la liste qu'il est censé décrire.
 */
export function effectiveFilterValues(
  filter: CatalogFilter,
  audioExtra: AudioExtra,
  isrcExtra: IsrcExtra
): EffectiveFilterValues {
  return {
    status: filter.kind === "status" ? filter.status : "all",
    audio: filter.kind === "missing-audio" ? "without" : audioExtra,
    isrc: filter.kind === "missing-isrc" ? "missing" : isrcExtra,
  };
}
