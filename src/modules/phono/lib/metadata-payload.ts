// src/modules/phono/lib/metadata-payload.ts
import type { Album, Track, TrackVersion } from "@/lib/sidekick-store";
import { normalizeTrackGuests } from "./track";

/** Tags écrits dans le fichier par `/api/phono/apply-metadata`. */
export interface MetadataPayload {
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  trackNumber?: number;
  trackTotal?: number;
  genre?: string;
  label?: string;
  copyright?: string;
  year?: number;
  fullDate?: string;
  composers?: string;
  isrc?: string;
  comment?: string;
}

/** Rôles comptés comme interprètes dans le tag `artist`. */
const PERFORMER_ROLES = new Set(["Artiste secondaire", "Artiste principal"]);

/** Rôles comptés comme auteurs dans le tag `composers`. */
const COMPOSER_ROLES = new Set(["Compositeur", "Beatmaker"]);

export function buildMetadataPayload(args: {
  track: Track;
  version?: TrackVersion;
  album?: Album;
  /** 1-indexé. Requis pour un export d'album. */
  trackNumber?: number;
  trackTotal?: number;
}): MetadataPayload {
  const { track, version, album, trackNumber, trackTotal } = args;
  const guests = normalizeTrackGuests(track.guestArtists);

  // L'artiste de l'album sert de valeur de repli, comme le faisait l'export
  // d'album. Sans ce repli, un titre sans artiste principal produirait des tags
  // `artist`, `label` et `copyright` vides dans une livraison au distributeur.
  const mainArtist =
    (track.mainArtist ?? "").trim() || (album?.artist ?? "").trim();

  // artist : artiste principal puis interprètes, dans l'ordre de saisie.
  const performers = guests
    .filter((g) => PERFORMER_ROLES.has(g.role))
    .map((g) => g.name);
  const artist = [mainArtist, ...performers].filter(Boolean).join(", ");

  // composers : dédoublonné, l'artiste principal compte s'il est crédité auteur.
  const composerNames = new Set<string>();
  if (mainArtist && (track.role === "compositeur" || track.role === "beatmaker")) {
    composerNames.add(mainArtist);
  }
  guests.forEach((g) => {
    if (COMPOSER_ROLES.has(g.role)) composerNames.add(g.name);
  });

  const rawDate = (album?.releaseDate || track.releaseDate || "").trim();
  const year = rawDate.match(/(\d{4})/)?.[1];

  const genre = (track.genre ?? "").trim() || (album?.genre ?? "").trim();

  // label : album, sinon le label du titre s'il n'est pas auto-produit,
  // sinon l'artiste — un auto-produit est son propre label.
  const label =
    (album?.label ?? "").trim() ||
    (!track.selfProduced ? (track.label ?? "").trim() : "") ||
    mainArtist;

  // copyright : porte l'éditeur. Album, sinon titre, sinon artiste.
  const editor =
    (album?.editor ?? "").trim() || (track.editor ?? "").trim() || mainArtist;

  // Le titre exporté distingue la version, sauf pour l'originale.
  const versionLabel = (version?.label ?? "").trim();
  const title =
    versionLabel && versionLabel.toLowerCase() !== "original"
      ? `${track.title} (${versionLabel})`
      : track.title;

  // ISRC : celui de la version prime, le titre sert de valeur héritée.
  const isrc = (version?.isrc ?? "").trim() || (track.isrc ?? "").trim();

  return {
    title,
    artist: artist || mainArtist,
    album: album?.title ?? "",
    albumArtist: album?.artist ?? mainArtist,
    trackNumber,
    trackTotal,
    genre: genre || undefined,
    label: label || undefined,
    copyright: editor || undefined,
    year: year ? parseInt(year, 10) : undefined,
    fullDate: rawDate || undefined,
    composers: composerNames.size > 0 ? Array.from(composerNames).join(", ") : undefined,
    isrc: isrc || undefined,
    comment: (track.notes ?? "").trim() || undefined,
  };
}

/** Nom de fichier sûr, accents français conservés. */
export function safeFileName(raw: string, fallback = "audio"): string {
  return (
    raw.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæ\s_-]/gi, "").trim() || fallback
  );
}

/** Libellés lisibles des tags, pour l'aperçu avant écriture. */
export const METADATA_FIELD_LABELS: Record<keyof MetadataPayload, string> = {
  title: "Titre",
  artist: "Artiste",
  album: "Album",
  albumArtist: "Artiste de l'album",
  trackNumber: "Piste",
  trackTotal: "Total pistes",
  genre: "Genre",
  label: "Label",
  copyright: "Copyright / éditeur",
  year: "Année",
  fullDate: "Date de sortie",
  composers: "Compositeurs",
  isrc: "ISRC",
  comment: "Commentaire",
};
