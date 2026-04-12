"use client";

import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase";

export type CalendarSector = "live" | "phono" | "admin" | "marketing" | "edition" | "revenus" | "other";

export interface CustomCalendarItem {
  id: string;
  title: string;
  date: string;
  time?: string;
  place?: string;
  sector: CalendarSector;
}

const KEY = "calendar_events";

function rowToItem(row: Record<string, unknown>): CustomCalendarItem {
  return {
    id: row.source_id as string,
    title: row.label as string,
    date: row.date as string,
    time: (row.time as string) ?? undefined,
    place: (row.place as string) ?? undefined,
    sector: (row.sector as CalendarSector) ?? "other",
  };
}

function itemToRow(item: CustomCalendarItem): Record<string, unknown> {
  return {
    source_module: "custom",
    source_id: item.id,
    label: item.title,
    date: item.date,
    time: item.time ?? null,
    place: item.place ?? null,
    sector: item.sector,
    type: "custom",
  };
}

async function fetchCalendarEvents(): Promise<CustomCalendarItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("source_module", "custom")
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToItem);
}

export function useCalendarData() {
  const { data: customEvents = [], isLoading, error: swrError, mutate: mutateLocal } = useSWR<CustomCalendarItem[]>(KEY, fetchCalendarEvents);

  const error = swrError ? (swrError as Error).message : null;

  const setCustomEvents = useCallback((fn: (prev: CustomCalendarItem[]) => CustomCalendarItem[]) => {
    const snapshot = customEvents;
    const next = fn(customEvents);

    mutateLocal(next, false);

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { mutateLocal(snapshot, false); return; }

      const prevMap = new Map(snapshot.map((e) => [e.id, e]));
      const nextMap = new Map(next.map((e) => [e.id, e]));

      const toUpsert = next.filter((e) => {
        const old = prevMap.get(e.id);
        return !old || JSON.stringify(old) !== JSON.stringify(e);
      });
      const toDelete = snapshot.filter((e) => !nextMap.has(e.id)).map((e) => e.id);

      const ops: Array<PromiseLike<{ error: { message: string } | null }>> = [];

      if (toUpsert.length > 0) {
        ops.push(
          supabase.from("calendar_events")
            .upsert(toUpsert.map((e) => ({ ...itemToRow(e), user_id: user.id })))
            .then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }
      if (toDelete.length > 0) {
        ops.push(
          supabase.from("calendar_events")
            .delete().in("source_id", toDelete).eq("source_module", "custom")
            .then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }

      const results = await Promise.all(ops);
      if (results.find((r) => r.error)) {
        mutateLocal(snapshot, false);
      } else {
        mutate(KEY);
      }
    })();
  }, [customEvents, mutateLocal]);

  return { customEvents, setCustomEvents, loading: isLoading, error };
}
