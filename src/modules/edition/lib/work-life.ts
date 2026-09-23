import type { Track, Work } from "@/lib/sidekick-store";
import type { TourDate } from "@/modules/live/data/defaultRepresentations";
import type { SetlistTrack } from "@/modules/live/lib/live-model";
import { dateISO } from "@/modules/live/lib/live-model";
import { manualStatus } from "./work-lifecycle";

/**
 * Vie d'une œuvre hors d'Édition : ses enregistrements (Phono) et les concerts
 * où elle a été jouée (Live). Ce que la SACEM ne peut pas dire, puisqu'elle ne
 * voit que ce qu'on lui déclare.
 */

type WorkRef = Pick<Work, "id" | "title" | "status" | "linkedTrackIds">;

/** Le lien existe dans les deux sens (`work.linkedTrackIds`, `track.linkedWorkId`) : on lit les deux. */
export function linkedTracks(work: WorkRef, tracks: Track[]): Track[] {
  const ids = new Set(work.linkedTrackIds ?? []);
  return tracks.filter((t) => ids.has(t.id) || t.linkedWorkId === work.id);
}

export function isReleased(track: Pick<Track, "status" | "releaseDate">, today: string): boolean {
  if (track.status === "publie") return true;
  return !!track.releaseDate && dateISO(track.releaseDate) <= today;
}

export function normalizeTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Un morceau de setlist joue l'œuvre s'il pointe vers un de ses
 * enregistrements, ou, saisi à la main, s'il porte exactement son titre sans
 * être attribué à un autre artiste (une reprise homonyme ne compte pas).
 */
export function setlistItemPlaysWork(
  item: SetlistTrack,
  work: Pick<Work, "title">,
  workTrackIds: Set<string>,
  artistName: string,
): boolean {
  if (item.trackId) return workTrackIds.has(item.trackId);
  if (!work.title.trim() || normalizeTitle(item.title) !== normalizeTitle(work.title)) return false;
  const artist = normalizeTitle(item.artist ?? "");
  return !artist || artist === normalizeTitle(artistName);
}

/** Une date en option qui est passée n'a pas eu lieu, ou personne ne l'a confirmée : elle ne compte pas. */
export function isPlayedPerformance(date: TourDate, today: string): boolean {
  return dateISO(date.date) < today && date.status !== "En option";
}

export function isProgramDeclared(date: TourDate): boolean {
  return date.details?.sacemProgramDeclared === true;
}

export function performancesOf(
  work: WorkRef,
  tourDates: TourDate[],
  tracks: Track[],
  artistName: string,
  today: string,
): TourDate[] {
  const trackIds = new Set(linkedTracks(work, tracks).map((t) => t.id));
  return tourDates
    .filter((d) => isPlayedPerformance(d, today))
    .filter((d) => (d.details?.setlist ?? []).some((item) => setlistItemPlaysWork(item, work, trackIds, artistName)))
    .sort((a, b) => dateISO(b.date).localeCompare(dateISO(a.date)));
}

export interface WorkLife {
  tracks: Track[];
  released: Track[];
  performances: TourDate[];
  undeclaredPrograms: TourDate[];
  /** Un enregistrement est sorti, l'œuvre n'est pas déclarée : des droits qui dorment. */
  releasedUndeclared: boolean;
}

export function workLife(work: WorkRef, tracks: Track[], tourDates: TourDate[], artistName: string, today: string): WorkLife {
  const linked = linkedTracks(work, tracks);
  const released = linked.filter((t) => isReleased(t, today));
  const performances = performancesOf(work, tourDates, tracks, artistName, today);
  return {
    tracks: linked,
    released,
    performances,
    undeclaredPrograms: performances.filter((d) => !isProgramDeclared(d)),
    releasedUndeclared: released.length > 0 && manualStatus(work.status) === "draft",
  };
}

/** Représentations passées qui jouent au moins une œuvre du catalogue et dont le programme n'est pas déclaré. */
export function undeclaredProgramDates(
  works: WorkRef[],
  tourDates: TourDate[],
  tracks: Track[],
  artistName: string,
  today: string,
): TourDate[] {
  const seen = new Map<number, TourDate>();
  for (const work of works) {
    for (const d of performancesOf(work, tourDates, tracks, artistName, today)) {
      if (!isProgramDeclared(d)) seen.set(d.id, d);
    }
  }
  return [...seen.values()].sort((a, b) => dateISO(b.date).localeCompare(dateISO(a.date)));
}
