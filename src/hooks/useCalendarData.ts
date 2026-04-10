"use client";

import { useCallback, useEffect, useState } from "react";
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

function rowToItem(row: Record<string, unknown>): CustomCalendarItem {
  const data = (row.data ?? {}) as Record<string, unknown>;
  return {
    id: row.id as string,
    title: row.title as string,
    date: row.start as string,
    time: (data.time as string) ?? undefined,
    place: (data.place as string) ?? undefined,
    sector: (data.sector as CalendarSector) ?? "other",
  };
}

function itemToRow(item: CustomCalendarItem): Record<string, unknown> {
  return {
    id: item.id,
    title: item.title,
    start: item.date,
    data: {
      time: item.time ?? null,
      place: item.place ?? null,
      sector: item.sector,
    },
  };
}

export function useCalendarData() {
  const [customEvents, setCustomEventsState] = useState<CustomCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    supabase
      .from("user_calendar_events")
      .select("*")
      .order("start", { ascending: true })
      .then(({ data, error: err }) => {
        if (!alive) return;
        if (err) setError(err.message);
        else setCustomEventsState((data ?? []).map(rowToItem));
        setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  const setCustomEvents = useCallback((fn: (prev: CustomCalendarItem[]) => CustomCalendarItem[]) => {
    let snapshot: CustomCalendarItem[] = [];
    let next: CustomCalendarItem[] = [];

    setCustomEventsState((prev) => {
      snapshot = prev;
      next = fn(prev);
      return next;
    });

    (async () => {
      setError(null);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        setCustomEventsState(() => snapshot);
        return;
      }

      const prevMap = new Map(snapshot.map((e) => [e.id, e]));
      const nextMap = new Map(next.map((e) => [e.id, e]));

      const toUpsert = next.filter((e) => {
        const old = prevMap.get(e.id);
        return !old || JSON.stringify(old) !== JSON.stringify(e);
      });
      const toDelete = snapshot.filter((e) => !nextMap.has(e.id)).map((e) => e.id);

      const ops: Promise<{ error: { message: string } | null }>[] = [];

      if (toUpsert.length > 0) {
        ops.push(
          Promise.resolve(
            supabase
              .from("user_calendar_events")
              .upsert(toUpsert.map((e) => ({ ...itemToRow(e), user_id: user.id })))
          ).then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }

      if (toDelete.length > 0) {
        ops.push(
          Promise.resolve(
            supabase
              .from("user_calendar_events")
              .delete()
              .in("id", toDelete)
          ).then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }

      const results = await Promise.all(ops);
      const firstError = results.find((r) => r.error);
      if (firstError?.error) {
        setError(firstError.error.message);
        setCustomEventsState(() => snapshot);
      }
    })();
  }, []);

  return { customEvents, setCustomEvents, loading, error };
}
