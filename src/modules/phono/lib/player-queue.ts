import type { Album, Mix, Track, TrackVersion } from "@/lib/sidekick-store";
import { albumTrackVersions } from "./album";
import { sortCatalog, type SortKey } from "./catalog-sort";

/**
 * Une entrée lisible de la file du lecteur.
 *
 * Toujours porteuse d'un `audioPath` : ce qui n'a pas de fichier n'entre pas
 * dans la file. Le lecteur n'a donc jamais à gérer d'entrée injouable, et
 * « suivant » ne peut pas tomber dans le vide.
 */
export interface PlayerQueueItem {
  /**
   * Identité stable dans la file. Sert à retrouver la position courante après
   * un rechargement de page, et à repérer l'entrée en cours quand le tri a
   * changé entre-temps.
   */
  key: string;
  /** Entité source : titre pour une version, mix pour un mix. */
  trackId: string;
  /** Version pour un titre, id du mix pour un mix. */
  versionId: string;
  title: string;
  versionLabel: string;
  coverSrc?: string;
  audioPath: string;
  peaks?: number[];
  durationMs?: number;
  /** D'où vient l'entrée. Le lecteur l'affiche pour situer ce qui joue. */
  origin: "track" | "album" | "mix";
  /** Nom de l'album, quand `origin` vaut `album`. */
  originLabel?: string;
}

export interface CatalogSorts {
  tracks: SortKey;
  albums: SortKey;
  mixes: SortKey;
}

export const DEFAULT_CATALOG_SORTS: CatalogSorts = {
  tracks: "date-desc",
  albums: "date-desc",
  mixes: "date-desc",
};

function versionItem(
  track: Track,
  version: TrackVersion,
  album?: Album
): PlayerQueueItem | null {
  if (!version.audioPath) return null;
  return {
    key: album
      ? `album:${album.id}:${track.id}:${version.id}`
      : `track:${track.id}:${version.id}`,
    trackId: track.id,
    versionId: version.id,
    title: track.title || "Sans titre",
    versionLabel: version.label,
    coverSrc: album?.cover ?? track.cover,
    audioPath: version.audioPath,
    peaks: version.peaks,
    durationMs: version.durationMs,
    origin: album ? "album" : "track",
    originLabel: album?.title,
  };
}

export function trackQueueItem(
  track: Track,
  version: TrackVersion
): PlayerQueueItem | null {
  return versionItem(track, version);
}

/**
 * Entrée d'une version **écoutée depuis un album**.
 *
 * Même fonction, même clé que celles produites par `buildPlayerQueue` pour le
 * bloc des albums : lancer une piste depuis la tracklist d'un album fait donc
 * enchaîner « suivant » sur la piste d'après *de cet album*, et non sur la
 * version suivante du bloc des titres.
 */
export function albumQueueItem(
  album: Album,
  track: Track,
  version: TrackVersion
): PlayerQueueItem | null {
  return versionItem(track, version, album);
}

export function mixQueueItem(mix: Mix): PlayerQueueItem | null {
  if (!mix.audioPath) return null;
  return {
    key: `mix:${mix.id}`,
    trackId: mix.id,
    versionId: mix.id,
    title: mix.title || "Sans titre",
    versionLabel: mix.artists || "Mix",
    coverSrc: mix.cover,
    audioPath: mix.audioPath,
    peaks: mix.peaks,
    durationMs: mix.durationMs,
    origin: "mix",
  };
}

/**
 * File d'écoute complète du catalogue, dans l'ordre affiché.
 *
 * Trois blocs enchaînés — titres, puis albums, puis mixes — chacun trié comme
 * son onglet. Le bouclage de fin de file sur son début suffit à obtenir le
 * comportement demandé (« au dernier mix, on repart au premier titre ») sans
 * logique de catégorie : la file *est* déjà la boucle.
 *
 * Un titre présent dans un album y figure deux fois, sous deux clés
 * distinctes. C'est voulu : parcourir un album doit le faire entendre à sa
 * place dans l'album, pas le sauter parce qu'on l'a croisé plus haut.
 */
export function buildPlayerQueue(
  tracks: readonly Track[],
  albums: readonly Album[],
  mixes: readonly Mix[],
  sorts: CatalogSorts
): PlayerQueueItem[] {
  const items: PlayerQueueItem[] = [];

  for (const track of sortCatalog(tracks, sorts.tracks)) {
    for (const version of track.versions ?? []) {
      const item = versionItem(track, version);
      if (item) items.push(item);
    }
  }

  const byId = new Map(tracks.map((t) => [t.id, t]));
  for (const album of sortCatalog(albums, sorts.albums)) {
    for (const trackId of album.trackIds ?? []) {
      const track = byId.get(trackId);
      if (!track) continue;
      // Un album fait entendre les versions que l'artiste y a retenues, dans
      // l'ordre où il les a rangées — deux déclinaisons d'un même titre y
      // comptent pour deux pistes. `albumTrackVersions` retombe sur la
      // première version pourvue d'un fichier pour les albums enregistrés
      // avant ce choix, ce qui était exactement le comportement d'ici.
      for (const version of albumTrackVersions(album, track)) {
        const item = versionItem(track, version, album);
        if (item) items.push(item);
      }
    }
  }

  for (const mix of sortCatalog(mixes, sorts.mixes)) {
    const item = mixQueueItem(mix);
    if (item) items.push(item);
  }

  return items;
}

/**
 * Entrée à proposer quand rien n'a encore été écouté : le dernier titre ajouté.
 *
 * `tracks` arrive du hook trié sur `created_at` décroissant — la tête de liste
 * est donc l'ajout le plus récent, indépendamment du tri d'affichage choisi.
 */
export function defaultQueueItem(
  queue: readonly PlayerQueueItem[],
  tracks: readonly Track[]
): PlayerQueueItem | null {
  for (const track of tracks) {
    const item = queue.find(
      (q) => q.origin === "track" && q.trackId === track.id
    );
    if (item) return item;
  }
  return queue[0] ?? null;
}
