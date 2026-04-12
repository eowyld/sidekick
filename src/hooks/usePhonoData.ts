"use client";

import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase";
import type { Track, Album, Podcast } from "@/lib/sidekick-store";

// ─── Local session type (SessionsStudioPage) ─────────────────────────────────

export type SessionParticipant = {
  id: number;
  name: string;
  role: string;
};

export type StudioSession = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  address?: string;
  sessionType: string;
  sessionTypeOther?: string;
  participants: SessionParticipant[];
  note?: string;
};

export type { Track, Album, Podcast };

// ─── SWR key ─────────────────────────────────────────────────────────────────

const KEY = "user_phono";

type PhonoData = {
  tracks: Track[];
  albums: Album[];
  podcasts: Podcast[];
  sessions: StudioSession[];
};

const FALLBACK: PhonoData = { tracks: [], albums: [], podcasts: [], sessions: [] };

// ─── Row mappers ─────────────────────────────────────────────────────────────

function trackToRow(t: Track, userId: string): Record<string, unknown> {
  return {
    id: t.id,
    user_id: userId,
    title: t.title,
    main_artist: t.mainArtist,
    role: t.role,
    guest_artists: t.guestArtists ?? [],
    isrc: t.isrc ?? "",
    release_date: t.releaseDate ?? "",
    self_produced: t.selfProduced ?? true,
    label: t.label ?? null,
    editor: t.editor ?? null,
    versions: t.versions ?? [],
    genre: t.genre ?? null,
    distribution: t.distribution ?? null,
    notes: t.notes ?? "",
    status: t.status ?? "en_production",
    cover: t.cover ?? null,
    linked_work_id: t.linkedWorkId ?? null,
  };
}

function rowToTrack(row: Record<string, unknown>): Track {
  return {
    id: row.id as string,
    title: row.title as string,
    mainArtist: row.main_artist as string,
    role: row.role as Track["role"],
    guestArtists: (row.guest_artists as string[]) ?? [],
    isrc: (row.isrc as string) ?? "",
    releaseDate: (row.release_date as string) ?? "",
    selfProduced: row.self_produced as boolean,
    label: (row.label as string) ?? undefined,
    editor: (row.editor as string) ?? undefined,
    versions: (row.versions as Track["versions"]) ?? [],
    genre: (row.genre as string) ?? undefined,
    distribution: (row.distribution as string) ?? undefined,
    notes: (row.notes as string) ?? "",
    status: (row.status as Track["status"]) ?? "en_production",
    cover: (row.cover as string) ?? undefined,
    linkedWorkId: (row.linked_work_id as string) ?? undefined,
  };
}

function albumToRow(a: Album, userId: string): Record<string, unknown> {
  return {
    id: a.id,
    user_id: userId,
    title: a.title,
    type: a.type,
    status: a.status,
    artist: a.artist,
    release_date: a.releaseDate ?? "",
    upc_ean: a.upcEan ?? "",
    track_ids: a.trackIds ?? [],
    label: a.label ?? null,
    genre: a.genre ?? null,
    editor: a.editor ?? null,
    distribution: a.distribution ?? null,
    notes: a.notes ?? "",
    cover: a.cover ?? null,
    guests: a.guests ?? [],
  };
}

function rowToAlbum(row: Record<string, unknown>): Album {
  return {
    id: row.id as string,
    title: row.title as string,
    type: row.type as Album["type"],
    status: row.status as Album["status"],
    artist: row.artist as string,
    releaseDate: (row.release_date as string) ?? "",
    upcEan: (row.upc_ean as string) ?? "",
    trackIds: (row.track_ids as string[]) ?? [],
    label: (row.label as string) ?? undefined,
    genre: (row.genre as string) ?? undefined,
    editor: (row.editor as string) ?? undefined,
    distribution: (row.distribution as string) ?? undefined,
    notes: (row.notes as string) ?? "",
    cover: (row.cover as string) ?? undefined,
    guests: (row.guests as Album["guests"]) ?? [],
  };
}

function podcastToRow(p: Podcast, userId: string): Record<string, unknown> {
  return {
    id: p.id,
    user_id: userId,
    title: p.title,
    artists: p.artists ?? "",
    published_on: p.publishedOn ?? "",
    is_video: p.isVideo ?? false,
    is_live: p.isLive ?? false,
    status: p.status ?? "en_production",
    release_date: p.releaseDate ?? "",
    tracklist: p.tracklist ?? [],
    cover: p.cover ?? null,
  };
}

function rowToPodcast(row: Record<string, unknown>): Podcast {
  return {
    id: row.id as string,
    title: row.title as string,
    artists: (row.artists as string) ?? "",
    publishedOn: (row.published_on as string) ?? "",
    isVideo: row.is_video as boolean,
    isLive: row.is_live as boolean,
    status: (row.status as Podcast["status"]) ?? "en_production",
    releaseDate: (row.release_date as string) ?? "",
    tracklist: (row.tracklist as Podcast["tracklist"]) ?? [],
    cover: (row.cover as string) ?? undefined,
  };
}

function sessionToRow(s: StudioSession, userId: string): Record<string, unknown> {
  return {
    id: s.id,
    user_id: userId,
    title: s.title,
    date: s.date,
    time: s.time,
    location: s.location,
    address: s.address ?? null,
    session_type: s.sessionType,
    session_type_other: s.sessionTypeOther ?? null,
    participants: s.participants ?? [],
    note: s.note ?? null,
  };
}

function rowToSession(row: Record<string, unknown>): StudioSession {
  return {
    id: row.id as string,
    title: row.title as string,
    date: row.date as string,
    time: row.time as string,
    location: row.location as string,
    address: (row.address as string) ?? undefined,
    sessionType: row.session_type as string,
    sessionTypeOther: (row.session_type_other as string) ?? undefined,
    participants: (row.participants as SessionParticipant[]) ?? [],
    note: (row.note as string) ?? undefined,
  };
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchPhonoData(): Promise<PhonoData> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return FALLBACK;

  const [t, a, p, s] = await Promise.all([
    supabase.from("user_phono_tracks").select("*").order("created_at", { ascending: false }),
    supabase.from("user_phono_albums").select("*").order("created_at", { ascending: false }),
    supabase.from("user_phono_podcasts").select("*").order("created_at", { ascending: false }),
    supabase.from("user_phono_sessions").select("*").order("date", { ascending: false }),
  ]);

  return {
    tracks: t.error ? [] : (t.data ?? []).map(rowToTrack),
    albums: a.error ? [] : (a.data ?? []).map(rowToAlbum),
    podcasts: p.error ? [] : (p.data ?? []).map(rowToPodcast),
    sessions: s.error ? [] : (s.data ?? []).map(rowToSession),
  };
}

// ─── Generic optimistic setter factory ───────────────────────────────────────

type Slice = keyof PhonoData;

function makeOptimisticSetter<T extends { id: string }>(
  slice: Slice,
  table: string,
  toRow: (item: T, userId: string) => Record<string, unknown>
) {
  return (fn: (prev: T[]) => T[]) => {
    // Capture snapshot and compute next synchronously via optimistic mutate
    let snapshot: T[] = [];
    let next: T[] = [];

    mutate(
      KEY,
      (current: PhonoData | undefined) => {
        const allData = current ?? FALLBACK;
        snapshot = allData[slice] as unknown as T[];
        next = fn(snapshot);
        return { ...allData, [slice]: next };
      },
      false
    );

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        mutate(KEY, (current: PhonoData | undefined) => ({ ...(current ?? FALLBACK), [slice]: snapshot }), false);
        return;
      }

      const prevMap = new Map(snapshot.map((e) => [e.id, e]));
      const nextMap = new Map(next.map((e) => [e.id, e]));

      const toInsert = next.filter((e) => !prevMap.has(e.id));
      const toUpdate = next.filter((e) => {
        const old = prevMap.get(e.id);
        return old && JSON.stringify(old) !== JSON.stringify(e);
      });
      const toDelete = snapshot.filter((e) => !nextMap.has(e.id)).map((e) => e.id);

      const ops: Array<PromiseLike<{ error: { message: string } | null }>> = [];

      if (toInsert.length > 0) {
        ops.push(
          Promise.resolve(
            supabase.from(table).insert(toInsert.map((e) => toRow(e, user.id)))
          ).then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }
      for (const e of toUpdate) {
        ops.push(
          Promise.resolve(
            supabase.from(table).update(toRow(e, user.id)).eq("id", e.id).eq("user_id", user.id)
          ).then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }
      if (toDelete.length > 0) {
        ops.push(
          Promise.resolve(
            supabase.from(table).delete().in("id", toDelete).eq("user_id", user.id)
          ).then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }

      const results = await Promise.all(ops);
      const firstError = results.find((r) => r.error);
      if (firstError?.error) {
        // Rollback
        mutate(KEY, (current: PhonoData | undefined) => ({ ...(current ?? FALLBACK), [slice]: snapshot }), false);
      } else {
        // Revalidate from server
        mutate(KEY);
      }
    })();
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePhonoData() {
  const { data, isLoading, error: swrError } = useSWR<PhonoData>(KEY, fetchPhonoData, {
    fallbackData: FALLBACK,
  });

  const allData = data ?? FALLBACK;

  const setTracks = useCallback(
    makeOptimisticSetter<Track>("tracks", "user_phono_tracks", trackToRow),
    []
  );

  const setAlbums = useCallback(
    makeOptimisticSetter<Album>("albums", "user_phono_albums", albumToRow),
    []
  );

  const setPodcasts = useCallback(
    makeOptimisticSetter<Podcast>("podcasts", "user_phono_podcasts", podcastToRow),
    []
  );

  const setSessions = useCallback(
    makeOptimisticSetter<StudioSession>("sessions", "user_phono_sessions", sessionToRow),
    []
  );

  return {
    tracks: allData.tracks,
    setTracks,
    albums: allData.albums,
    setAlbums,
    podcasts: allData.podcasts,
    setPodcasts,
    sessions: allData.sessions,
    setSessions,
    loading: isLoading,
    error: swrError ? String(swrError) : null,
  };
}
