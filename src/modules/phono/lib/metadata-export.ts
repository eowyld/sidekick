// src/modules/phono/lib/metadata-export.ts
import type { Album, Track, TrackVersion } from "@/lib/sidekick-store";
import { createClient, getSessionUser } from "@/lib/supabase";
import { deleteStorageFile, uploadDriveFileToPath } from "@/lib/drive-db";
import {
  buildMetadataPayload,
  type MetadataPayload,
} from "@/modules/phono/lib/metadata-payload";
import { albumTracks, albumTrackVersions } from "@/modules/phono/lib/album";

/** Même dossier que les téléversements du catalogue — voir `audio-gc.ts`. */
const AUDIO_PREFIX = "Phono/Catalogue";

/**
 * Dépose dans le Storage un fichier choisi ponctuellement pour l'export, et
 * rend son chemin.
 *
 * Pourquoi ne pas l'envoyer directement à `/api/phono/apply-metadata` : le
 * corps d'une **requête** de fonction Vercel est plafonné à 4,5 Mo, et
 * contrairement à la réponse, aucun flux ne contourne ce plafond. Or un MP3 de
 * 4 minutes pèse déjà le double. Le fichier monte donc au Storage depuis le
 * navigateur — comme le fait déjà `AudioAttachField` — et la route le
 * télécharge elle-même par `audioPath`, chemin qui existe déjà et qui vérifie
 * le propriétaire.
 *
 * Le fichier est supprimé en fin d'export par `unstageLocalAudio`. S'il survit
 * à un onglet fermé en cours de route, il est rattrapé par `pruneOrphanAudio` :
 * il est dans le dossier du catalogue et n'est référencé par aucune version ni
 * aucun mix, donc c'est exactement un orphelin au sens du nettoyeur, au délai
 * de grâce d'une heure près.
 */
export async function stageLocalAudio(file: File): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await getSessionUser(supabase);
  if (!user) throw new Error("Session expirée.");

  // `uploadDriveFileToPath` monte en `upsert: false` : sans ce préfixe, deux
  // exports du même fichier entreraient en collision.
  const unique = new File(
    [file],
    `${crypto.randomUUID().slice(0, 8)}-${file.name}`,
    { type: file.type }
  );
  const { path } = await uploadDriveFileToPath(
    supabase,
    user.id,
    unique,
    AUDIO_PREFIX
  );
  return path;
}

/** Retire un fichier déposé par `stageLocalAudio`. Silencieux : un échec ici
 *  ne doit pas faire échouer un export réussi, le nettoyeur repassera. */
export async function unstageLocalAudio(path: string): Promise<void> {
  try {
    await deleteStorageFile(createClient(), path);
  } catch {
    /* rattrapé par pruneOrphanAudio */
  }
}

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
    // Une piste par version retenue, pas une par titre : deux déclinaisons d'un
    // même titre cochées sur l'album y comptent pour deux pistes, comme dans la
    // file du lecteur. `albumTrackVersions` retombe sur la première version
    // pourvue d'un fichier pour les albums d'avant ce choix, donc l'export d'un
    // album existant ne change pas.
    const pieces = at.flatMap((track) =>
      albumTrackVersions(album, track).map((version) => ({ track, version }))
    );
    const trackTotal = pieces.length;
    const items = pieces.map(({ track, version }, i): ExportItem => ({
      key: `${track.id}:${version.id}`,
      track,
      version,
      album,
      trackNumber: i + 1,
      trackTotal,
      payload: buildMetadataPayload({
        track,
        version,
        album,
        trackNumber: i + 1,
        trackTotal,
      }),
      hosted: hostedOf(version),
    }));
    return {
      items,
      scope:
        trackTotal > 1
          ? `Les ${trackTotal} pistes de « ${album.title || "album"} »`
          : `Piste unique de « ${album.title || "album"} »`,
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
