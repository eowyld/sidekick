"use client";

import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase";

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
  source: "invoice" | "manual";
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

  const [linesRes, expensesRes, invoicesRes, manualsRes] = await Promise.all([
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
  ]);

  const lines = linesRes.error ? [] : (linesRes.data ?? []).map((r) => rowToBudgetLine(r as Record<string, unknown>));
  const expenses = expensesRes.error ? [] : (expensesRes.data ?? []).map((r) => rowToExpense(r as Record<string, unknown>));

  const revenues: ProjectRevenue[] = [];

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

  const error = swrError ? (swrError as Error).message : null;

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
