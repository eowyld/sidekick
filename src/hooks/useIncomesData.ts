"use client";

import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import { createClient } from "@/lib/supabase";
import type {
  Distributor,
  DistributorImport,
  ImportsStore,
  ManualEntry,
} from "@/modules/incomes/parsers/royalties-types";
import { EMPTY_IMPORTS } from "@/modules/incomes/parsers/royalties-types";
import type { IntermittenceMission } from "@/modules/incomes/components/intermittence-types";

export type { Distributor, DistributorImport, ImportsStore, ManualEntry, IntermittenceMission };

// ─── Invoice types (local to InvoicesPage, reproduced here) ──────────────────

export type InvoiceStatus = "en_attente" | "payee";
export type IncomeType = "Live" | "Phono" | "Edition" | "Merchandising" | "Autre";
export type LineType = "service" | "vente de marchandise";

export interface InvoiceLine {
  id: number;
  description: string;
  type: LineType;
  quantity: string;
  unitPrice: string;
  vatPercent: string;
}

export interface Invoice {
  id: string;
  number: string;
  client: string;
  subject: string;
  amount: string;
  dueDate: string;
  status: InvoiceStatus;
  /** ISO YYYY-MM-DD (jour local) — renseigné à la première mise en « payée ». */
  encaissementDate?: string;
  address?: string;
  siret?: string;
  incomeType?: IncomeType;
  lines?: InvoiceLine[];
  notes?: string;
  projectId?: string;   // → user_projects.id (phase 2+)
}

// ─── Row mappers ─────────────────────────────────────────────────────────────

function importToRow(imp: DistributorImport, userId: string): Record<string, unknown> {
  return {
    id: `${userId}:${imp.distributor}`,
    user_id: userId,
    distributor: imp.distributor,
    file_name: imp.fileName,
    imported_at: imp.importedAt,
    entries: imp.entries,
  };
}

function rowToImport(row: Record<string, unknown>): DistributorImport {
  return {
    distributor: row.distributor as Distributor,
    fileName: row.file_name as string,
    importedAt: row.imported_at as string,
    entries: (row.entries as DistributorImport["entries"]) ?? [],
  };
}

function manualEntryToRow(e: ManualEntry, userId: string): Record<string, unknown> {
  return {
    id: e.id,
    user_id: userId,
    distributor: "manual",
    period: e.period,
    store: e.store,
    country: e.country,
    track_title: e.trackTitle,
    album: e.album ?? null,
    isrc: e.isrc ?? null,
    streams: e.streams,
    revenue: e.revenue,
    currency: e.currency,
    project_id: e.projectId ?? null,
  };
}

function rowToManualEntry(row: Record<string, unknown>): ManualEntry {
  return {
    id: row.id as string,
    distributor: "manual",
    period: row.period as string,
    store: row.store as string,
    country: row.country as string,
    trackTitle: row.track_title as string,
    album: (row.album as string) ?? undefined,
    isrc: (row.isrc as string) ?? undefined,
    streams: row.streams as number,
    revenue: row.revenue as number,
    currency: row.currency as string,
    projectId: (row.project_id as string) ?? undefined,
  };
}

function invoiceToRow(inv: Invoice, userId: string): Record<string, unknown> {
  return {
    id: inv.id,
    user_id: userId,
    number: inv.number,
    client: inv.client,
    subject: inv.subject,
    amount: inv.amount,
    due_date: inv.dueDate,
    status: inv.status,
    encaissement_date: inv.encaissementDate ?? null,
    address: inv.address ?? null,
    siret: inv.siret ?? null,
    income_type: inv.incomeType ?? null,
    lines: inv.lines ?? [],
    notes: inv.notes ?? null,
    project_id: inv.projectId ?? null,
  };
}

function rowToInvoice(row: Record<string, unknown>): Invoice {
  const rawEnc = row.encaissement_date;
  const encaissementDate =
    typeof rawEnc === "string" && rawEnc.trim() ? rawEnc.trim() : undefined;
  return {
    id: row.id as string,
    number: row.number as string,
    client: row.client as string,
    subject: row.subject as string,
    amount: row.amount as string,
    dueDate: row.due_date as string,
    status: row.status as InvoiceStatus,
    encaissementDate,
    address: (row.address as string) ?? undefined,
    siret: (row.siret as string) ?? undefined,
    incomeType: (row.income_type as IncomeType) ?? undefined,
    lines: (row.lines as InvoiceLine[]) ?? [],
    notes: (row.notes as string) ?? undefined,
    projectId: (row.project_id as string) ?? undefined,
  };
}

function missionToRow(m: IntermittenceMission, userId: string): Record<string, unknown> {
  return {
    id: m.id,
    user_id: userId,
    date: m.date,
    employer: m.employer,
    type: m.type,
    hours: m.hours,
    gross_amount: m.grossAmount,
    charges: m.charges,
    net_amount: m.netAmount,
    notes: m.notes,
    statut_juridique_id: m.statutJuridiqueId ?? null,
  };
}

function rowToMission(row: Record<string, unknown>): IntermittenceMission {
  return {
    id: row.id as string,
    date: row.date as string,
    employer: row.employer as string,
    type: row.type as IntermittenceMission["type"],
    hours: row.hours as number,
    grossAmount: row.gross_amount as number,
    charges: row.charges as number,
    netAmount: row.net_amount as number,
    notes: (row.notes as string) ?? "",
    statutJuridiqueId: (row.statut_juridique_id as string) ?? undefined,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface IncomesData {
  imports: ImportsStore;
  manualEntries: ManualEntry[];
  invoices: Invoice[];
  missions: IntermittenceMission[];
}

const FALLBACK: IncomesData = {
  imports: EMPTY_IMPORTS,
  manualEntries: [],
  invoices: [],
  missions: [],
};

const KEY = "user_incomes";

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchIncomesData(): Promise<IncomesData> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return FALLBACK;

  const [imp, man, inv, mis] = await Promise.all([
    supabase.from("user_royalties_imports").select("*"),
    supabase.from("user_royalties_manual").select("*").order("created_at", { ascending: false }),
    supabase.from("user_invoices").select("*").order("created_at", { ascending: false }),
    supabase.from("user_intermittence_missions").select("*").order("date", { ascending: false }),
  ]);

  const imports: ImportsStore = { ...EMPTY_IMPORTS };
  if (!imp.error) {
    for (const row of imp.data ?? []) {
      const d = rowToImport(row as Record<string, unknown>);
      imports[d.distributor] = d;
    }
  }

  const manualEntries = man.error ? [] : (man.data ?? []).map((r) => rowToManualEntry(r as Record<string, unknown>));
  const invoices = inv.error ? [] : (inv.data ?? []).map((r) => rowToInvoice(r as Record<string, unknown>));
  const missions = mis.error ? [] : (mis.data ?? []).map((r) => rowToMission(r as Record<string, unknown>));

  return { imports, manualEntries, invoices, missions };
}

// ─── Generic optimistic updater factory ──────────────────────────────────────

function makeUpdater<T extends { id: string }>(
  table: string,
  toRow: (item: T, userId: string) => Record<string, unknown>,
  sliceKey: keyof IncomesData,
  allData: IncomesData,
  mutateLocal: (data: IncomesData, revalidate: boolean) => void,
  mutateGlobal: (key: string) => void
) {
  return (fn: (prev: T[]) => T[]) => {
    const snapshot = allData;
    const next = fn(snapshot[sliceKey] as unknown as T[]);
    mutateLocal({ ...snapshot, [sliceKey]: next }, false);

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { mutateLocal(snapshot, false); return; }

      const prevMap = new Map((snapshot[sliceKey] as unknown as T[]).map((e) => [e.id, e]));
      const nextMap = new Map(next.map((e) => [e.id, e]));

      const toInsert = next.filter((e) => !prevMap.has(e.id));
      const toUpdate = next.filter((e) => {
        const old = prevMap.get(e.id);
        return old && JSON.stringify(old) !== JSON.stringify(e);
      });
      const toDelete = (snapshot[sliceKey] as unknown as T[]).filter((e) => !nextMap.has(e.id)).map((e) => e.id);

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
        mutateLocal(snapshot, false);
      } else {
        mutateGlobal(KEY);
      }
    })();
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useIncomesData() {
  const { mutate } = useSWRConfig();
  const { data: allData, isLoading, mutate: mutateLocal } = useSWR<IncomesData>(
    KEY,
    fetchIncomesData,
    { fallbackData: FALLBACK }
  );

  const data = allData ?? FALLBACK;

  // ─── Imports updater (upsert per distributor) ─────────────────────────────

  const setImport = useCallback((distributor: Distributor, imp: DistributorImport) => {
    const snapshot = allData ?? FALLBACK;
    mutateLocal({ ...snapshot, imports: { ...snapshot.imports, [distributor]: imp } }, false);

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { mutateLocal(snapshot, false); return; }
      const { error: err } = await supabase
        .from("user_royalties_imports")
        .upsert(importToRow(imp, user.id), { onConflict: "id" });
      if (err) {
        mutateLocal(snapshot, false);
      } else {
        mutate(KEY);
      }
    })();
  }, [allData, mutate, mutateLocal]);

  const setManualEntries = useCallback(
    (fn: (prev: ManualEntry[]) => ManualEntry[]) =>
      makeUpdater<ManualEntry>(
        "user_royalties_manual",
        manualEntryToRow,
        "manualEntries",
        data,
        (d, r) => mutateLocal(d, r),
        (k) => mutate(k)
      )(fn),
    [data, mutate, mutateLocal]
  );

  const setInvoices = useCallback(
    (fn: (prev: Invoice[]) => Invoice[]) =>
      makeUpdater<Invoice>(
        "user_invoices",
        invoiceToRow,
        "invoices",
        data,
        (d, r) => mutateLocal(d, r),
        (k) => mutate(k)
      )(fn),
    [data, mutate, mutateLocal]
  );

  const setMissions = useCallback(
    (fn: (prev: IntermittenceMission[]) => IntermittenceMission[]) =>
      makeUpdater<IntermittenceMission>(
        "user_intermittence_missions",
        missionToRow,
        "missions",
        data,
        (d, r) => mutateLocal(d, r),
        (k) => mutate(k)
      )(fn),
    [data, mutate, mutateLocal]
  );

  return {
    imports: data.imports,
    setImport,
    manualEntries: data.manualEntries,
    setManualEntries,
    invoices: data.invoices,
    setInvoices,
    missions: data.missions,
    setMissions,
    loading: isLoading,
    error: null,
  };
}
