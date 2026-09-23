"use client";

import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase";
import { money, dateISO, type LiveDetails } from "@/modules/live/lib/live-model";
import { frToIso } from "@/lib/date-format";
import { userErrorMessage } from "@/lib/user-error";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BudgetLine {
  id: string;
  projectId: string;
  kind: "expense" | "income";
  category: string;
  label: string;
  amountPlanned: number;
}

export interface ProjectExpense {
  id: string;
  projectId: string;
  kind: "expense" | "income";
  label: string;
  category: string;
  amount: number;
  date: string;   // ISO YYYY-MM-DD
  notes: string;
}

export interface ProjectRevenue {
  id: string;
  source: "invoice" | "manual" | "live";
  label: string;
  amount: number;
  date: string;
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToBudgetLine(row: Record<string, unknown>): BudgetLine {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    kind: (row.kind as "expense" | "income") ?? "expense",
    category: (row.category as string) ?? "",
    label: (row.label as string) ?? "",
    amountPlanned: Number(row.amount_planned ?? 0),
  };
}

function budgetLineToRow(l: BudgetLine): Record<string, unknown> {
  return {
    id: l.id,
    project_id: l.projectId,
    kind: l.kind,
    category: l.category,
    label: l.label,
    amount_planned: l.amountPlanned,
  };
}

function rowToExpense(row: Record<string, unknown>): ProjectExpense {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    kind: ((row.kind as string) === "income" ? "income" : "expense"),
    label: (row.label as string) ?? "",
    category: (row.category as string) ?? "",
    amount: Number(row.amount ?? 0),
    date: (row.date as string) ?? "",
    notes: (row.notes as string) ?? "",
  };
}

function expenseToRow(e: ProjectExpense): Record<string, unknown> {
  return {
    id: e.id,
    project_id: e.projectId,
    kind: e.kind,
    label: e.label,
    category: e.category,
    amount: e.amount,
    date: e.date,
    notes: e.notes,
  };
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

interface BudgetData {
  lines: BudgetLine[];
  expenses: ProjectExpense[];
  revenues: ProjectRevenue[];
}

const FALLBACK: BudgetData = { lines: [], expenses: [], revenues: [] };

async function fetchBudgetData(projectId: string): Promise<BudgetData> {
  const supabase = createClient();

  const [linesRes, expensesRes, invoicesRes, manualsRes, projectRes, sessionsRes, datesRes, liveRes] = await Promise.all([
    supabase.from("user_project_budget_lines")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase.from("user_project_expenses")
      .select("*")
      .eq("project_id", projectId)
      .order("date", { ascending: false }),
    supabase.from("user_invoices")
      .select("id, number, client, subject, amount, due_date, status, encaissement_date")
      .eq("project_id", projectId),
    supabase.from("user_royalties_manual")
      .select("id, track_title, revenue, currency, period")
      .eq("project_id", projectId),
    supabase.from("user_projects")
      .select("linked_albums, linked_tracks, linked_tour_dates")
      .eq("id", projectId)
      .maybeSingle(),
    supabase.from("user_phono_sessions")
      .select("id, title, date, album_ids, track_ids, studio_cost, other_costs"),
    supabase.from("user_tour_dates").select("id, venue, date, details, invoice_ids, mission_ids"),
    supabase.from("user_live_productions").select("id, data"),
  ]);

  const lines = linesRes.error ? [] : (linesRes.data ?? []).map((r) => rowToBudgetLine(r as Record<string, unknown>));
  const expenses = expensesRes.error ? [] : (expensesRes.data ?? []).map((r) => rowToExpense(r as Record<string, unknown>));
  const projectAlbums = new Set((projectRes.data?.linked_albums as string[] | null) ?? []);
  const projectTracks = new Set((projectRes.data?.linked_tracks as string[] | null) ?? []);
  for (const raw of sessionsRes.data ?? []) {
    const row = raw as Record<string, unknown>;
    const albumIds = (row.album_ids as string[] | null) ?? [];
    const trackIds = (row.track_ids as string[] | null) ?? [];
    if (!albumIds.some((id) => projectAlbums.has(id)) && !trackIds.some((id) => projectTracks.has(id))) continue;
    const amount = Number(row.studio_cost ?? 0) + Number(row.other_costs ?? 0);
    if (amount <= 0) continue;
    const storedDate = (row.date as string) ?? "";
    expenses.push({ id: `studio-session:${row.id as string}`, projectId, kind: "expense", label: `Session studio — ${(row.title as string) || "Sans titre"}`, category: "Studio", amount, date: storedDate.includes("/") ? frToIso(storedDate) : storedDate, notes: "Coût synchronisé automatiquement depuis Phono." });
  }

  const linkedDateIds = new Set((projectRes.data?.linked_tour_dates as string[] | null) ?? []);
  const linkedProductionIds = new Set((liveRes.data ?? []).filter(row => row.data?.projectId === projectId).map(row => row.id));
  const liveDates = (datesRes.data ?? []).filter(row => linkedDateIds.has(String(row.id)) || linkedProductionIds.has(row.details?.productionId) || linkedProductionIds.has(row.details?.tourId));
  for (const row of liveDates) {
    const details = (row.details ?? {}) as LiveDetails;
    const ownCosts = [...(details.transports ?? []), ...(details.lodgings ?? [])].filter(e => e.paymentMode === "self");
    const amount = ownCosts.reduce((sum, e) => sum + money(e.amount), 0);
    if (amount > 0) expenses.push({ id: `live-date:${row.id}`, projectId, kind: "expense", label: `Live — ${row.venue}`, category: "Logistique live", amount, date: dateISO(row.date), notes: "Frais à ta charge, synchronisés depuis la représentation." });
  }
  const revenues: ProjectRevenue[] = [];
  const invoiceIds = [...new Set(liveDates.flatMap(row => (row.invoice_ids ?? []) as string[]))].filter(id => !(invoicesRes.data ?? []).some(i => i.id === id));
  const missionIds = [...new Set(liveDates.flatMap(row => (row.mission_ids ?? []) as string[]))];
  if (invoiceIds.length) {
    const { data } = await supabase.from("user_invoices").select("id, number, client, amount, due_date").in("id", invoiceIds);
    for (const row of data ?? []) revenues.push({ id: row.id, source: "invoice", label: `Facture ${row.number} — ${row.client}`, amount: money(row.amount), date: row.due_date });
  }
  if (missionIds.length) {
    const { data } = await supabase.from("user_intermittence_missions").select("id, employer, net_amount, date").in("id", missionIds);
    for (const row of data ?? []) revenues.push({ id: row.id, source: "live", label: `Cachet — ${row.employer}`, amount: Number(row.net_amount) || 0, date: row.date });
  }


  for (const inv of invoicesRes.data ?? []) {
    const row = inv as Record<string, unknown>;
    revenues.push({
      id: row.id as string,
      source: "invoice",
      label: `Facture ${row.number as string} – ${row.client as string}`,
      amount: parseFloat((row.amount as string) ?? "0") || 0,
      date: (row.due_date as string) ?? "",
    });
  }

  for (const m of manualsRes.data ?? []) {
    const row = m as Record<string, unknown>;
    revenues.push({
      id: row.id as string,
      source: "manual",
      label: `${row.track_title as string} (${row.period as string})`,
      amount: Number(row.revenue ?? 0),
      date: (row.period as string) ?? "",
    });
  }

  return { lines, expenses, revenues };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProjectBudgetData(projectId: string) {
  const key = projectId ? `budget:${projectId}` : null;

  const { data = FALLBACK, isLoading, error: swrError, mutate: mutateLocal } =
    useSWR<BudgetData>(key, () => fetchBudgetData(projectId));

  const error = swrError ? userErrorMessage(swrError, "Impossible de charger le budget du projet. Réessaie dans un instant.") : null;

  // ─── Budget lines setters ──────────────────────────────────────────────────

  const setLines = useCallback((fn: (prev: BudgetLine[]) => BudgetLine[]) => {
    const snapshot = data.lines;
    const next = fn(data.lines);
    mutateLocal({ ...data, lines: next }, false);

    (async () => {
      const supabase = createClient();
      const prevMap = new Map(snapshot.map((l) => [l.id, l]));
      const nextMap = new Map(next.map((l) => [l.id, l]));
      const toUpsert = next.filter((l) => {
        const old = prevMap.get(l.id);
        return !old || JSON.stringify(old) !== JSON.stringify(l);
      });
      const toDelete = snapshot.filter((l) => !nextMap.has(l.id)).map((l) => l.id);

      const ops: Array<PromiseLike<{ error: { message: string } | null }>> = [];
      if (toUpsert.length > 0) {
        ops.push(
          supabase.from("user_project_budget_lines")
            .upsert(toUpsert.map(budgetLineToRow))
            .then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }
      if (toDelete.length > 0) {
        ops.push(
          supabase.from("user_project_budget_lines")
            .delete().in("id", toDelete)
            .then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }

      const results = await Promise.all(ops);
      if (results.find((r) => r.error)) {
        mutateLocal({ ...data, lines: snapshot }, false);
      } else {
        mutate(key);
      }
    })();
  }, [data, mutateLocal, key]);

  // ─── Expenses setters ──────────────────────────────────────────────────────

  const setExpenses = useCallback((fn: (prev: ProjectExpense[]) => ProjectExpense[]) => {
    const snapshot = data.expenses;
    const next = fn(data.expenses);
    mutateLocal({ ...data, expenses: next }, false);

    (async () => {
      const supabase = createClient();
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
          supabase.from("user_project_expenses")
            .upsert(toUpsert.map(expenseToRow))
            .then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }
      if (toDelete.length > 0) {
        ops.push(
          supabase.from("user_project_expenses")
            .delete().in("id", toDelete)
            .then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }

      const results = await Promise.all(ops);
      if (results.find((r) => r.error)) {
        mutateLocal({ ...data, expenses: snapshot }, false);
      } else {
        mutate(key);
      }
    })();
  }, [data, mutateLocal, key]);

  // ─── Attacher une facture ──────────────────────────────────────────────────

  const attachInvoice = useCallback(async (invoiceId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("user_invoices")
      .update({ project_id: projectId })
      .eq("id", invoiceId);
    if (!error) mutate(key);
  }, [projectId, key]);

  const detachInvoice = useCallback(async (invoiceId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("user_invoices")
      .update({ project_id: null })
      .eq("id", invoiceId);
    if (!error) mutate(key);
  }, [projectId, key]);

  // ─── KPIs dérivés ─────────────────────────────────────────────────────────

  const totalPlannedExpenses = data.lines
    .filter((l) => l.kind === "expense")
    .reduce((sum, l) => sum + l.amountPlanned, 0);

  const totalPlannedIncome = data.lines
    .filter((l) => l.kind === "income")
    .reduce((sum, l) => sum + l.amountPlanned, 0);

  const realExpenses = data.expenses.filter((e) => e.kind !== "income");
  const manualRevenues = data.expenses.filter((e) => e.kind === "income");

  const totalRealExpenses = realExpenses.reduce((sum, e) => sum + e.amount, 0);

  const totalRealIncome =
    data.revenues.reduce((sum, r) => sum + r.amount, 0) +
    manualRevenues.reduce((sum, r) => sum + r.amount, 0);

  const balance = totalRealIncome - totalRealExpenses;

  return {
    lines: data.lines,
    expenses: realExpenses,
    manualRevenues,
    revenues: data.revenues,
    setLines,
    setExpenses,
    attachInvoice,
    detachInvoice,
    loading: isLoading,
    error,
    kpis: { totalPlannedExpenses, totalPlannedIncome, totalRealExpenses, totalRealIncome, balance },
  };
}
