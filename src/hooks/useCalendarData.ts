"use client";

import { useCallback } from "react";
import useSWR from "swr";
import {
  minutesToTimeHHMMSS,
  normalizeCustomTimesForDateRange,
  parseTimeToMinutes,
} from "@/lib/calendar-time";
import { createClient } from "@/lib/supabase";
import { formatTimeForDisplay } from "@/lib/utils";

export type CalendarSector = "live" | "phono" | "admin" | "marketing" | "edition" | "revenus" | "other";

export interface CustomCalendarItem {
  id: string;
  title: string;
  /** Date de début (yyyy-mm-dd). */
  date: string;
  /** Date de fin inclusive (yyyy-mm-dd). Absente / égale à date → un seul jour. */
  endDate?: string;
  time?: string;
  endTime?: string;
  place?: string;
  sector: CalendarSector;
}

const KEY = "calendar_events";

/** Colonnes date Postgres / ISO → `yyyy-mm-dd`. */
function normalizePgDate(value: unknown): string {
  if (value == null) return "";
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : s;
}

function rowToItem(row: Record<string, unknown>): CustomCalendarItem {
  const timeRaw = row.time as string | null | undefined;
  const endRaw = row.end_time as string | null | undefined;
  const dateStr = normalizePgDate(row.date);
  const endDateRawRaw = row.end_date as string | null | undefined;
  const endDateRaw = endDateRawRaw != null ? normalizePgDate(endDateRawRaw) : undefined;
  return {
    id: row.source_id as string,
    title: row.label as string,
    date: dateStr,
    endDate: endDateRaw && endDateRaw !== dateStr ? endDateRaw : undefined,
    time: timeRaw ? formatTimeForDisplay(timeRaw) : undefined,
    endTime: endRaw ? formatTimeForDisplay(endRaw) : undefined,
    place: (row.place as string) ?? undefined,
    sector: (row.sector as CalendarSector) ?? "other",
  };
}

function itemToRow(item: CustomCalendarItem): Record<string, unknown> {
  const { time, endTime } = normalizeCustomTimesForDateRange(item);
  const timeDb =
    time && parseTimeToMinutes(time) !== null
      ? minutesToTimeHHMMSS(parseTimeToMinutes(time)!)
      : null;
  const endDb =
    time && endTime && parseTimeToMinutes(endTime) !== null
      ? minutesToTimeHHMMSS(parseTimeToMinutes(endTime)!)
      : null;

  const endDate =
    item.endDate?.trim() && item.endDate >= item.date ? item.endDate.trim() : item.date;

  return {
    source_module: "custom",
    source_id: item.id,
    label: item.title,
    date: item.date,
    end_date: endDate,
    time: timeDb,
    end_time: endDb,
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
    let snapshot: CustomCalendarItem[] = [];
    let next: CustomCalendarItem[] = [];

    mutateLocal((prev) => {
      snapshot = prev ?? [];
      next = fn(snapshot);
      return next;
    }, false);

    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        mutateLocal(snapshot, false);
        return;
      }

      const prevMap = new Map(snapshot.map((e) => [e.id, e]));
      const nextMap = new Map(next.map((e) => [e.id, e]));

      const toUpsert = next.filter((e) => {
        const old = prevMap.get(e.id);
        return !old || JSON.stringify(old) !== JSON.stringify(e);
      });
      const toDelete = snapshot
        .filter((e) => !nextMap.has(e.id))
        .map((e) => e.id);

      let persistenceError: string | null = null;

      for (const e of toUpsert) {
        const basePayload = itemToRow(e);
        const payload = { ...basePayload, user_id: user.id } as Record<
          string,
          unknown
        >;
        const existedBeforeMutation = prevMap.has(e.id);

        if (existedBeforeMutation) {
          const { end_date: _ed, ...withoutEnd } = payload;
          let { error } = await supabase
            .from("calendar_events")
            .update(payload)
            .eq("user_id", user.id)
            .eq("source_module", "custom")
            .eq("source_id", e.id);
          if (
            error &&
            /\bend_date\b/i.test(error.message) &&
            /does not exist|could not find|schema cache/i.test(error.message)
          ) {
            ({ error } = await supabase
              .from("calendar_events")
              .update(withoutEnd)
              .eq("user_id", user.id)
              .eq("source_module", "custom")
              .eq("source_id", e.id));
          }
          if (error) persistenceError = error.message;
        } else {
          const { end_date: _ed2, ...withoutEndIns } = payload;
          let { error } = await supabase
            .from("calendar_events")
            .insert(payload);
          if (
            error &&
            /\bend_date\b/i.test(error.message) &&
            /does not exist|could not find|schema cache/i.test(error.message)
          ) {
            ({ error } = await supabase
              .from("calendar_events")
              .insert(withoutEndIns));
          }
          if (error) persistenceError = error.message;
        }

        if (persistenceError) break;
      }

      if (!persistenceError && toDelete.length > 0) {
        const { error } = await supabase
          .from("calendar_events")
          .delete()
          .in("source_id", toDelete)
          .eq("source_module", "custom")
          .eq("user_id", user.id);
        if (error) persistenceError = error.message;
      }

      if (persistenceError) {
        mutateLocal(snapshot, false);
      } else {
        // Ne pas passer `undefined` à mutate : SWR écraserait le cache avec undefined
        // (flash vide / données incorrectes) avant la fin du refetch.
        await mutateLocal((list) => list ?? [], { revalidate: true });
      }
    })();
  }, [mutateLocal]);

  return { customEvents, setCustomEvents, loading: isLoading, error };
}
