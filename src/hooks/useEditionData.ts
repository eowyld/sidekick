"use client";

import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import { createClient, getSessionUser } from "@/lib/supabase";
import type { Work, SyncData } from "@/lib/sidekick-store";

export type { Work, SyncData };

// ─── Row mappers ─────────────────────────────────────────────────────────────

function workToRow(w: Work, userId: string): Record<string, unknown> {
  return {
    id: w.id,
    user_id: userId,
    artist_name: w.artistName,
    title: w.title,
    status: w.status,
    persons: w.persons ?? [],
    dep_repartition: w.depRepartition ?? {},
    drm_repartition: w.drmRepartition ?? {},
    splits_authors: w.splitsAuthors ?? [],
    splits_composers: w.splitsComposers ?? [],
    self_published: w.selfPublished ?? true,
    external_publishers: w.externalPublishers ?? [],
    iswc: w.iswc ?? "",
    first_exploitation_date: w.firstExploitationDate ?? "",
    genre: w.genre ?? "",
    duration: w.duration ?? "",
    files: w.files ?? {},
    exploitation_types: w.exploitationTypes ?? [],
    first_broadcaster: w.firstBroadcaster ?? "",
    worldwide_rights: w.worldwideRights ?? true,
    territories: w.territories ?? [],
    notes: w.notes ?? "",
    linked_track_ids: w.linkedTrackIds ?? [],
  };
}

function rowToWork(row: Record<string, unknown>): Work {
  return {
    id: row.id as string,
    artistName: row.artist_name as string,
    title: row.title as string,
    status: row.status as Work["status"],
    persons: (row.persons as Work["persons"]) ?? [],
    depRepartition: (row.dep_repartition as Work["depRepartition"]) ?? { authors: 33.33, composers: 33.33, publishers: 33.33 },
    drmRepartition: (row.drm_repartition as Work["drmRepartition"]) ?? { authors: 25, composers: 25, publishers: 50 },
    splitsAuthors: (row.splits_authors as Work["splitsAuthors"]) ?? [],
    splitsComposers: (row.splits_composers as Work["splitsComposers"]) ?? [],
    selfPublished: row.self_published as boolean,
    externalPublishers: (row.external_publishers as Work["externalPublishers"]) ?? [],
    iswc: (row.iswc as string) ?? "",
    firstExploitationDate: (row.first_exploitation_date as string) ?? "",
    genre: (row.genre as string) ?? "",
    duration: (row.duration as string) ?? "",
    files: (row.files as Work["files"]) ?? {},
    exploitationTypes: (row.exploitation_types as Work["exploitationTypes"]) ?? [],
    firstBroadcaster: (row.first_broadcaster as string) ?? "",
    worldwideRights: row.worldwide_rights as boolean,
    territories: (row.territories as string[]) ?? [],
    notes: (row.notes as string) ?? "",
    linkedTrackIds: (row.linked_track_ids as string[]) ?? [],
  };
}

function syncToRow(s: SyncData, userId: string): Record<string, unknown> {
  return {
    work_id: s.workId,
    user_id: userId,
    data: s,
  };
}

function rowToSync(row: Record<string, unknown>): SyncData {
  const d = (row.data ?? {}) as SyncData;
  return {
    workId: (row.work_id as string) ?? d.workId,
    status: d.status ?? "not-ready",
    moods: d.moods ?? [],
    tempo: d.tempo ?? "",
    pitchShort: d.pitchShort ?? "",
    usageContext: d.usageContext ?? "",
    themes: d.themes ?? [],
    privateLinks: d.privateLinks ?? [],
    exploitants: d.exploitants ?? [],
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditionData {
  works: Work[];
  syncMap: Record<string, SyncData>;
}

const FALLBACK: EditionData = { works: [], syncMap: {} };
const KEY = "user_edition";

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchEditionData(): Promise<EditionData> {
  const supabase = createClient();
  const { data: { user } } = await getSessionUser(supabase);
  if (!user) return FALLBACK;

  const [w, s] = await Promise.all([
    supabase.from("user_edition_works").select("*").order("created_at", { ascending: false }),
    supabase.from("user_edition_sync").select("*"),
  ]);

  const works = w.error ? [] : (w.data ?? []).map((r) => rowToWork(r as Record<string, unknown>));

  const syncMap: Record<string, SyncData> = {};
  if (!s.error) {
    for (const row of s.data ?? []) {
      const sync = rowToSync(row as Record<string, unknown>);
      syncMap[sync.workId] = sync;
    }
  }

  return { works, syncMap };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEditionData() {
  const { mutate } = useSWRConfig();
  const { data: allData, isLoading, mutate: mutateLocal } = useSWR<EditionData>(
    KEY,
    fetchEditionData,
    { fallbackData: FALLBACK }
  );

  const works = allData?.works ?? [];
  const syncMap = allData?.syncMap ?? {};

  // ─── Works updater ───────────────────────────────────────────────────────────

  const setWorks = useCallback((fn: (prev: Work[]) => Work[]) => {
    const snapshot = allData ?? FALLBACK;
    const next = fn(snapshot.works);
    mutateLocal({ ...snapshot, works: next }, false);

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await getSessionUser(supabase);
      if (!user) { mutateLocal(snapshot, false); return; }

      const prevMap = new Map(snapshot.works.map((e) => [e.id, e]));
      const nextMap = new Map(next.map((e) => [e.id, e]));

      const toInsert = next.filter((e) => !prevMap.has(e.id));
      const toUpdate = next.filter((e) => {
        const old = prevMap.get(e.id);
        return old && JSON.stringify(old) !== JSON.stringify(e);
      });
      const toDelete = snapshot.works.filter((e) => !nextMap.has(e.id)).map((e) => e.id);

      const ops: Array<PromiseLike<{ error: { message: string } | null }>> = [];

      if (toInsert.length > 0) {
        ops.push(
          Promise.resolve(
            supabase.from("user_edition_works").insert(toInsert.map((e) => workToRow(e, user.id)))
          ).then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }
      for (const e of toUpdate) {
        ops.push(
          Promise.resolve(
            supabase.from("user_edition_works").update(workToRow(e, user.id)).eq("id", e.id).eq("user_id", user.id)
          ).then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }
      if (toDelete.length > 0) {
        ops.push(
          Promise.resolve(
            supabase.from("user_edition_works").delete().in("id", toDelete).eq("user_id", user.id)
          ).then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }

      const results = await Promise.all(ops);
      const firstError = results.find((r) => r.error);
      if (firstError?.error) {
        mutateLocal(snapshot, false);
      } else {
        mutate(KEY);
      }
    })();
  }, [allData, mutate, mutateLocal]);

  // ─── Sync updater ────────────────────────────────────────────────────────────

  const setSyncData = useCallback((s: SyncData) => {
    const snapshot = allData ?? FALLBACK;
    mutateLocal({ ...snapshot, syncMap: { ...snapshot.syncMap, [s.workId]: s } }, false);

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await getSessionUser(supabase);
      if (!user) { mutateLocal(snapshot, false); return; }

      const { error: err } = await supabase
        .from("user_edition_sync")
        .upsert(syncToRow(s, user.id), { onConflict: "work_id" });
      if (err) {
        mutateLocal(snapshot, false);
      } else {
        mutate(KEY);
      }
    })();
  }, [allData, mutate, mutateLocal]);

  return {
    works, setWorks,
    syncMap, setSyncData,
    loading: isLoading,
    error: null,
  };
}
