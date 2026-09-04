// src/modules/phono/lib/album.ts
import type { Album, AlbumType, Track } from "@/lib/sidekick-store";
import { normalizePhonoRole, normalizeTrackGuests, roleLabel } from "./track";

export const ALBUM_TYPES: { value: AlbumType; label: string }[] = [
  { value: "album", label: "Album" },
  { value: "ep", label: "EP" },
  { value: "single", label: "Single" },
];

export function albumTypeLabel(type: AlbumType): string {
  return ALBUM_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function newAlbumId(): string {
  return "a-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

export function normalizeAlbum(a: Album): Album {
  return {
    ...a,
    id: a.id,
    title: a.title ?? "",
    artist: a.artist ?? "",
    type: a.type ?? "album",
    status: a.status ?? "en_production",
    releaseDate: a.releaseDate ?? "",
    upcEan: a.upcEan ?? "",
    trackIds: Array.isArray(a.trackIds) ? a.trackIds : [],
    // Les rôles sont normalisés ici aussi : un album historique portant un
    // invité en `ingenieur_du_son` alimenterait sinon un <Select> dont aucune
    // option ne correspond, et le champ s'afficherait vide.
    guests: Array.isArray(a.guests)
      ? a.guests.map((g) => ({ ...g, role: normalizePhonoRole(g.role) }))
      : [],
    // Coercés en chaîne vide, jamais laissés à `undefined` : ces champs
    // alimentent des <Input value={…}> et un passage undefined → string ferait
    // basculer React du mode contrôlé au mode non contrôlé en cours de saisie.
    label: a.label ?? "",
    genre: a.genre ?? "",
    editor: a.editor ?? "",
    distribution: a.distribution ?? "",
    notes: a.notes ?? "",
  };
}

/** Les titres d'un album, dans l'ordre de la tracklist. */
export function albumTracks(album: Album, allTracks: Track[]): Track[] {
  const byId = new Map(allTracks.map((t) => [t.id, t]));
  return (album.trackIds ?? [])
    .map((id) => byId.get(id))
    .filter((t): t is Track => Boolean(t));
}

/**
 * Crédits d'un album, agrégés depuis ses titres. Un album ne saisit pas ses
 * contributeurs : il les hérite. Un même nom apparaît une fois, avec tous ses
 * rôles réunis ; la casse ne crée pas de doublon.
 */
export function computeAlbumContributors(
  album: Album,
  tracks: Track[]
): Array<{ name: string; roles: string[] }> {
  const byName = new Map<string, { name: string; roles: Set<string> }>();

  const push = (name: string, role?: string) => {
    const cleanName = String(name ?? "").trim();
    if (!cleanName) return;
    const key = cleanName.toLowerCase();
    const label = String(role ?? "").trim();
    const entry = byName.get(key) ?? { name: cleanName, roles: new Set<string>() };
    if (label) entry.roles.add(label);
    byName.set(key, entry);
  };

  push(album.artist, "Artiste principal");
  (album.guests ?? []).forEach((g) => push(g.name, roleLabel(g.role)));
  tracks.forEach((t) => {
    push(t.mainArtist, roleLabel(t.role));
    normalizeTrackGuests(t.guestArtists).forEach((g) => push(g.name, g.role));
  });

  return Array.from(byName.values()).map((v) => ({
    name: v.name,
    roles: Array.from(v.roles),
  }));
}
