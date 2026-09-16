"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { createClient, getSessionUser } from "@/lib/supabase";
import type { TourDate, TimetableItem } from "@/modules/live/data/defaultRepresentations";

export type { TourDate, TimetableItem };

export type RehearsalItem = {
  id: string;
  label?: string;
  date: string;
  time: string;
  location: string;
  city?: string;
  address?: string;
  note?: string;
  remunerations: { id: number; label: string; amount?: string }[];
  equipments: { id: number; label: string }[];
};

export type EquipmentInventoryItem = {
  id: string;
  name: string;
  quantity: number;
  condition: string;
  comment?: string;
};

export type EquipmentList = {
  id: string;
  name: string;
  description: string;
  itemIds: string[];
};

export type ProspectionChannel = "mail" | "instagram" | "phone" | "in-person";
export type ProspectionDirection = "outbound" | "inbound" | "replied" | "no-answer";
export type ReliabilityTier = "easy" | "neutral" | "hard";

export type ContactTouchpoint = {
  id: string;
  date: string;
  channel: ProspectionChannel;
  direction?: ProspectionDirection;
  note?: string;
  eventType?: "contact" | "status-change";
  statusValue?: string;
  previousStatus?: string;
};

export type ProspectionEntry = {
  id: string;
  venueName: string;
  city: string;
  contact: string;
  email: string;
  instagram: string;
  facebook: string;
  phone: string;
  status: string;
  notes?: string;
  lastContact?: string;
  touchpoints: ContactTouchpoint[];
  reliabilityTier: ReliabilityTier;
};

type LiveData = {
  tourDates: TourDate[];
  rehearsals: RehearsalItem[];
  inventory: EquipmentInventoryItem[];
  lists: EquipmentList[];
  prospection: ProspectionEntry[];
};

const KEY = "user_live";

const EMPTY: LiveData = {
  tourDates: [],
  rehearsals: [],
  inventory: [],
  lists: [],
  prospection: [],
};

// ─── Row mappers ─────────────────────────────────────────────────────────────

function tourDateToRow(d: TourDate, userId: string): Record<string, unknown> {
  return {
    id: String(d.id),
    user_id: userId,
    city: d.city,
    venue: d.venue,
    date: d.date,
    status: d.status,
    address: d.address ?? "",
    organisateur: d.organisateur ?? null,
    note: d.note ?? null,
    transport: d.transport,
    lodging: d.lodging,
    remuneration: d.remuneration,
    equipment: d.equipment,
    timetable: d.timetable ?? [],
    invoice_ids: d.invoiceIds ?? [],
    mission_ids: d.missionIds ?? [],
  };
}

function rowToTourDate(row: Record<string, unknown>): TourDate {
  return {
    id: row.id as number,
    city: row.city as string,
    venue: row.venue as string,
    date: row.date as string,
    status: row.status as TourDate["status"],
    address: row.address as string,
    organisateur: (row.organisateur as string) ?? undefined,
    note: (row.note as string) ?? undefined,
    transport: row.transport as boolean,
    lodging: row.lodging as boolean,
    remuneration: row.remuneration as boolean,
    equipment: row.equipment as boolean,
    timetable: (row.timetable as TimetableItem[]) ?? [],
    invoiceIds: (row.invoice_ids as string[]) ?? [],
    missionIds: (row.mission_ids as string[]) ?? [],
  };
}

function rehearsalToRow(r: RehearsalItem, userId: string): Record<string, unknown> {
  return {
    id: String(r.id),
    user_id: userId,
    label: r.label ?? null,
    date: r.date,
    time: r.time,
    location: r.location,
    city: r.city ?? null,
    address: r.address ?? null,
    note: r.note ?? null,
    remunerations: r.remunerations ?? [],
    equipments: r.equipments ?? [],
  };
}

function rowToRehearsal(row: Record<string, unknown>): RehearsalItem {
  return {
    id: row.id as string,
    label: (row.label as string) ?? undefined,
    date: row.date as string,
    time: row.time as string,
    location: row.location as string,
    city: (row.city as string) ?? undefined,
    address: (row.address as string) ?? undefined,
    note: (row.note as string) ?? undefined,
    remunerations: (row.remunerations as RehearsalItem["remunerations"]) ?? [],
    equipments: (row.equipments as RehearsalItem["equipments"]) ?? [],
  };
}

function inventoryItemToRow(item: EquipmentInventoryItem, userId: string): Record<string, unknown> {
  return {
    id: String(item.id),
    user_id: userId,
    name: item.name,
    quantity: item.quantity,
    condition: item.condition,
    comment: item.comment ?? null,
  };
}

function rowToInventoryItem(row: Record<string, unknown>): EquipmentInventoryItem {
  return {
    id: row.id as string,
    name: row.name as string,
    quantity: row.quantity as number,
    condition: row.condition as string,
    comment: (row.comment as string) ?? undefined,
  };
}

function equipmentListToRow(list: EquipmentList, userId: string): Record<string, unknown> {
  return {
    id: String(list.id),
    user_id: userId,
    name: list.name,
    description: list.description,
    item_ids: list.itemIds ?? [],
  };
}

function rowToEquipmentList(row: Record<string, unknown>): EquipmentList {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    itemIds: (row.item_ids as string[]) ?? [],
  };
}

function isValidTier(value: unknown): value is ReliabilityTier {
  return value === "easy" || value === "neutral" || value === "hard";
}

function getLastContactFromTouchpoints(touchpoints: ContactTouchpoint[]): string | undefined {
  const timestamps = touchpoints
    .map((tp) => ({ date: tp.date, ts: new Date(tp.date).getTime() }))
    .filter((item) => Number.isFinite(item.ts));

  if (timestamps.length === 0) return undefined;

  timestamps.sort((a, b) => b.ts - a.ts);
  return timestamps[0].date;
}

function prospectionToRow(e: ProspectionEntry, userId: string): Record<string, unknown> {
  const touchpoints = e.touchpoints ?? [];
  const lastContact = getLastContactFromTouchpoints(touchpoints);
  return {
    id: String(e.id),
    user_id: userId,
    venue_name: e.venueName,
    city: e.city,
    contact: e.contact,
    email: e.email,
    instagram: e.instagram,
    facebook: e.facebook,
    phone: e.phone,
    status: e.status,
    notes: e.notes ?? null,
    touchpoints,
    reliability_tier: e.reliabilityTier ?? "neutral",
    last_contact: lastContact ?? null,
  };
}

function rowToProspection(row: Record<string, unknown>): ProspectionEntry {
  const touchpoints = ((row.touchpoints as ContactTouchpoint[]) ?? []).filter(Boolean);
  const reliabilityTier = isValidTier(row.reliability_tier) ? row.reliability_tier : "neutral";
  return {
    id: row.id as string,
    venueName: row.venue_name as string,
    city: row.city as string,
    contact: row.contact as string,
    email: row.email as string,
    instagram: (row.instagram as string) ?? "",
    facebook: (row.facebook as string) ?? "",
    phone: row.phone as string,
    status: row.status as string,
    notes: (row.notes as string) ?? undefined,
    touchpoints,
    reliabilityTier,
    lastContact: getLastContactFromTouchpoints(touchpoints),
  };
}

// ─── Fetcher ─────────────────────────────────────────────────────────────────

async function fetchLiveData(): Promise<LiveData> {
  const supabase = createClient();
  const { data: { user } } = await getSessionUser(supabase);
  if (!user) return EMPTY;

  const [td, rh, inv, lists, pro] = await Promise.all([
    supabase.from("user_tour_dates").select("*").order("date"),
    supabase.from("user_rehearsals").select("*").order("date"),
    supabase.from("user_equipment_inventory").select("*").order("name"),
    supabase.from("user_equipment_lists").select("*").order("name"),
    supabase.from("user_live_prospection").select("*").order("venue_name"),
  ]);

  return {
    tourDates: td.error ? [] : (td.data ?? []).map(rowToTourDate),
    rehearsals: rh.error ? [] : (rh.data ?? []).map(rowToRehearsal),
    inventory: inv.error ? [] : (inv.data ?? []).map(rowToInventoryItem),
    lists: lists.error ? [] : (lists.data ?? []).map(rowToEquipmentList),
    prospection: pro.error ? [] : (pro.data ?? []).map(rowToProspection),
  };
}

// ─── Generic optimistic setter factory ───────────────────────────────────────

function makeOptimisticSetter<T extends { id: string | number }>(
  table: string,
  toRow: (item: T, userId: string) => Record<string, unknown>,
  slice: keyof LiveData,
  setError: (msg: string | null) => void
) {
  return (fn: (prev: T[]) => T[]) => {
    let snapshot: T[] = [];
    let next: T[] = [];

    mutate(
      KEY,
      (current: LiveData | undefined) => {
        const cur = current ?? EMPTY;
        snapshot = cur[slice] as unknown as T[];
        next = fn(snapshot);
        return { ...cur, [slice]: next };
      },
      false
    );

    (async () => {
      setError(null);
      const supabase = createClient();
      const { data: { user } } = await getSessionUser(supabase);
      if (!user) {
        setError("Not authenticated");
        mutate(KEY, (cur: LiveData | undefined) => ({ ...(cur ?? EMPTY), [slice]: snapshot }), false);
        return;
      }

      const prevMap = new Map(snapshot.map((e) => [String(e.id), e]));
      const nextMap = new Map(next.map((e) => [String(e.id), e]));

      const toInsert = next.filter((e) => !prevMap.has(String(e.id)));
      const toUpdate = next.filter((e) => {
        const old = prevMap.get(String(e.id));
        return old && JSON.stringify(old) !== JSON.stringify(e);
      });
      const toDelete = snapshot.filter((e) => !nextMap.has(String(e.id))).map((e) => String(e.id));

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
            supabase.from(table).update(toRow(e, user.id)).eq("id", String(e.id)).eq("user_id", user.id)
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
        setError(firstError.error.message);
        mutate(KEY, (cur: LiveData | undefined) => ({ ...(cur ?? EMPTY), [slice]: snapshot }), false);
      } else {
        mutate(KEY);
      }
    })();
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLiveData() {
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: fetchError } = useSWR(KEY, fetchLiveData, {
    fallbackData: EMPTY,
  });

  const allData = data ?? EMPTY;

  const setTourDates = makeOptimisticSetter<TourDate>(
    "user_tour_dates", tourDateToRow, "tourDates", setError
  );

  const setRehearsals = makeOptimisticSetter<RehearsalItem>(
    "user_rehearsals", rehearsalToRow, "rehearsals", setError
  );

  const setEquipmentInventory = makeOptimisticSetter<EquipmentInventoryItem>(
    "user_equipment_inventory", inventoryItemToRow, "inventory", setError
  );

  const setEquipmentLists = makeOptimisticSetter<EquipmentList>(
    "user_equipment_lists", equipmentListToRow, "lists", setError
  );

  const setProspection = makeOptimisticSetter<ProspectionEntry>(
    "user_live_prospection", prospectionToRow, "prospection", setError
  );

  return {
    tourDates: allData.tourDates,
    setTourDates,
    rehearsals: allData.rehearsals,
    setRehearsals,
    equipmentInventory: allData.inventory,
    setEquipmentInventory,
    equipmentLists: allData.lists,
    setEquipmentLists,
    prospection: allData.prospection,
    setProspection,
    loading: isLoading,
    error: error ?? (fetchError ? String(fetchError) : null),
  };
}
