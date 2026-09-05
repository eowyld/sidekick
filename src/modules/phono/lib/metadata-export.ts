// src/modules/phono/lib/metadata-export.ts
import type { Album, Track, TrackVersion } from "@/lib/sidekick-store";
import {
  buildMetadataPayload,
  type MetadataPayload,
} from "@/modules/phono/lib/metadata-payload";
import { albumTracks } from "@/modules/phono/lib/album";

export type MetadataExportTarget =
  | { kind: "version"; trackId: string; versionId: string }
  | { kind: "track"; trackId: string }
  | { kind: "album"; albumId: string };

/** Un fichier audio à produire. */
export interface ExportItem {
  key: string;
  track: Track;
  version?: TrackVersion;
  album?: Album;
  /** Position 1-indexée dans l'album, si l'élément en fait partie. */
  trackNumber?: number;
  trackTotal?: number;
  payload: MetadataPayload;
  /** Fichier déjà hébergé sur la version, s'il existe. */
  hosted?: { path: string; name: string; size?: number };
}

/** Extension avec le point, `.audio` par défaut — repli de l'ancien export. */
export function extOf(name: string | undefined): string {
  const m = name ? name.match(/\.[^.]+$/) : null;
  return m ? m[0] : ".audio";
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Première version porteuse d'un fichier, sinon la première version. */
export function pickVersion(track: Track): TrackVersion | undefined {
  return track.versions.find((v) => v.audioPath) ?? track.versions[0];
}

export function hostedOf(version: TrackVersion | undefined): ExportItem["hosted"] {
  if (!version?.audioPath) return undefined;
  return {
    path: version.audioPath,
    name: version.audioName || version.audioPath.split("/").pop() || "audio",
    size: version.sizeBytes,
  };
}

export function buildItems(
  target: MetadataExportTarget,
  tracks: Track[],
  albums: Album[]
): { items: ExportItem[]; scope: string; release?: Album } {
  if (target.kind === "album") {
    const album = albums.find((a) => a.id === target.albumId);
    if (!album) return { items: [], scope: "" };
    const at = albumTracks(album, tracks);
    const items = at.map((track, i): ExportItem => {
      const version = pickVersion(track);
      return {
        key: track.id,
        track,
        version,
        album,
        trackNumber: i + 1,
        trackTotal: at.length,
        payload: buildMetadataPayload({
          track,
          version,
          album,
          trackNumber: i + 1,
          trackTotal: at.length,
        }),
        hosted: hostedOf(version),
      };
    });
    return {
      items,
      scope: `Les ${at.length} titre${at.length > 1 ? "s" : ""} de « ${
        album.title || "album"
      } »`,
      release: album,
    };
  }

  const track = tracks.find((t) => t.id === target.trackId);
  if (!track) return { items: [], scope: "" };
  const album = albums.find((a) => a.trackIds.includes(track.id));
  const trackNumber = album
    ? album.trackIds.indexOf(track.id) + 1 || undefined
    : undefined;
  const trackTotal = album ? album.trackIds.length : undefined;

  const makeItem = (
    version: TrackVersion | undefined,
    key: string
  ): ExportItem => ({
    key,
    track,
    version,
    album,
    trackNumber,
    trackTotal,
    payload: buildMetadataPayload({ track, version, album, trackNumber, trackTotal }),
    hosted: hostedOf(version),
  });

  if (target.kind === "version") {
    const version = track.versions.find((v) => v.id === target.versionId);
    return {
      items: [makeItem(version, `${track.id}:${target.versionId}`)],
      scope: `Version « ${version?.label || "?"} » de « ${track.title || "titre"} »`,
    };
  }

  const versions: (TrackVersion | undefined)[] =
    track.versions.length > 0 ? track.versions : [undefined];
  const items = versions.map((v, i) =>
    makeItem(v, v ? `${track.id}:${v.id}` : `${track.id}:${i}`)
  );
  return {
    items,
    scope:
      items.length === 1
        ? `Version unique de « ${track.title || "titre"} »`
        : `Les ${items.length} versions de « ${track.title || "titre"} »`,
  };
}
