# Projets Hub — Phase 2 (Budget & finances) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter l'onglet Budget au dashboard projet : prévisionnel éditables, dépenses réelles, revenus rattachés agrégés, comparatif visuel, et cockpit Budget mis à jour avec les vrais chiffres.

**Architecture:** Deux nouvelles tables Supabase (`user_project_budget_lines`, `user_project_expenses`) + hook `useProjectBudgetData(projectId)`. L'agrégation des revenus réels se fait par query directe depuis le hook (factures + saisies manuelles avec `project_id` + royalties d'import des titres liés). Le type `Invoice` dans `useIncomesData` est étendu avec `projectId?` pour permettre le rattachement depuis les modules Revenus (Phase 4). L'onglet `BudgetTab` remplace le `PlaceholderTab` existant.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres + RLS), SWR, TypeScript, Tailwind, Radix UI, Lucide.

**Spec:** `docs/superpowers/specs/2026-06-03-projects-hub-1-socle-donnees-design.md` — Section 3 (Budget).

**Prérequis:** Phase 1 appliquée (table `user_projects` existante, colonnes `project_id` sur `user_invoices` et `user_royalties_manual` existantes).

---

## Conventions de ce plan

- **Pas de suite de tests** (cf. `CLAUDE.md`). Vérification : `npx tsc --noEmit` + `npm run dev` + inspection manuelle.
- **Commits** : uniquement sur demande explicite de l'utilisateur.
- **Migrations Supabase** : créer le fichier SQL ; l'utilisateur l'exécute dans le SQL Editor.
- **Dark-only** : accent `#F0FF00`, fond `#101010`, carte `rgba(44,44,46,0.72)`, bordure `rgba(245,245,245,0.12)`.

---

## File Structure

**Créés :**
- `supabase/migrations/20260625110000_projects_hub_phase2.sql` — tables `user_project_budget_lines` + `user_project_expenses`.
- `src/hooks/useProjectBudgetData.ts` — hook SWR CRUD optimiste pour budget_lines + expenses, + fetch revenus rattachés.
- `src/modules/projects/components/tabs/BudgetTab.tsx` — onglet Budget complet.

**Modifiés :**
- `src/hooks/useIncomesData.ts` — `projectId?: string` sur `Invoice` + mise à jour `rowToInvoice`/`invoiceToRow`.
- `src/modules/incomes/parsers/royalties-types.ts` — `projectId?: string` sur `RoyaltyEntry` (propagé à `ManualEntry`).
- `src/hooks/useIncomesData.ts` — `rowToManualEntry` extrait `project_id`.
- `src/modules/projects/components/tabs/OverviewTab.tsx` — cockpit Budget card avec vrais KPIs.
- `src/modules/projects/components/ProjectTabs.tsx` — `BudgetTab` remplace `PlaceholderTab` budget.

---

## Task 1: SQL migration — tables `user_project_budget_lines` + `user_project_expenses`

**Files:**
- Create: `supabase/migrations/20260625110000_projects_hub_phase2.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- Projets Hub — Phase 2 : budget prévisionnel + dépenses réelles.
-- À exécuter dans le SQL Editor Supabase (Dashboard → SQL Editor).

-- 1. Postes du budget prévisionnel
create table if not exists public.user_project_budget_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.user_projects(id) on delete cascade,
  kind text not null default 'expense',   -- 'expense' | 'income'
  category text not null default '',
  label text not null,
  amount_planned numeric(12,2) not null default 0,
  created_at timestamptz default now()
);

create index if not exists idx_budget_lines_project_id on public.user_project_budget_lines(project_id);

alter table public.user_project_budget_lines enable row level security;

drop policy if exists "Users can manage own budget lines" on public.user_project_budget_lines;
create policy "Users can manage own budget lines"
  on public.user_project_budget_lines for all
  using (
    project_id in (
      select id from public.user_projects where user_id = auth.uid()
    )
  )
  with check (
    project_id in (
      select id from public.user_projects where user_id = auth.uid()
    )
  );

-- 2. Dépenses réelles
create table if not exists public.user_project_expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.user_projects(id) on delete cascade,
  label text not null,
  category text not null default '',
  amount numeric(12,2) not null default 0,
  date date not null,
  notes text default '',
  created_at timestamptz default now()
);

create index if not exists idx_expenses_project_id on public.user_project_expenses(project_id);

alter table public.user_project_expenses enable row level security;

drop policy if exists "Users can manage own project expenses" on public.user_project_expenses;
create policy "Users can manage own project expenses"
  on public.user_project_expenses for all
  using (
    project_id in (
      select id from public.user_projects where user_id = auth.uid()
    )
  )
  with check (
    project_id in (
      select id from public.user_projects where user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Checkpoint — application manuelle**

Demander à l'utilisateur d'exécuter ce fichier dans le SQL Editor Supabase. Vérifier que `user_project_budget_lines` et `user_project_expenses` existent avec RLS. **Ne pas continuer tant que les tables ne sont pas créées.**

---

## Task 2: Étendre `Invoice` et `RoyaltyEntry` avec `projectId`

**Files:**
- Modify: `src/modules/incomes/parsers/royalties-types.ts:11-26` (interface `RoyaltyEntry`)
- Modify: `src/hooks/useIncomesData.ts` (mappers `rowToInvoice`, `invoiceToRow`, `rowToManualEntry`, `manualEntryToRow`)

- [ ] **Step 1: Ajouter `projectId?` à `RoyaltyEntry`**

Dans `src/modules/incomes/parsers/royalties-types.ts`, dans `interface RoyaltyEntry`, ajouter après `currency: string;` :

```typescript
  projectId?: string;   // → user_projects.id (phase 2+)
```

- [ ] **Step 2: Ajouter `projectId?` à `Invoice`**

Dans `src/hooks/useIncomesData.ts`, dans `interface Invoice`, ajouter après `notes?: string;` :

```typescript
  projectId?: string;   // → user_projects.id (phase 2+)
```

- [ ] **Step 3: Mettre à jour `rowToInvoice`**

Dans `src/hooks/useIncomesData.ts`, ajouter dans l'objet retourné par `rowToInvoice` après `notes:` :

```typescript
    projectId: (row.project_id as string) ?? undefined,
```

- [ ] **Step 4: Mettre à jour `invoiceToRow`**

Dans `src/hooks/useIncomesData.ts`, ajouter dans l'objet retourné par `invoiceToRow` après `notes:` :

```typescript
    project_id: inv.projectId ?? null,
```

- [ ] **Step 5: Mettre à jour `rowToManualEntry`**

Dans `src/hooks/useIncomesData.ts`, `rowToManualEntry` retourne un objet construit depuis les champs de `row`. Il faut ajouter `projectId` via le spread ou directement. Remplacer le corps de `rowToManualEntry` :

```typescript
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
```

- [ ] **Step 6: Mettre à jour `manualEntryToRow`**

Dans `src/hooks/useIncomesData.ts`, ajouter dans l'objet retourné par `manualEntryToRow` après `revenue:` :

```typescript
    project_id: e.projectId ?? null,
```

- [ ] **Step 7: Vérifier le typage**

Run: `npx tsc --noEmit`
Expected: aucune erreur liée aux types `Invoice`/`ManualEntry`/`RoyaltyEntry`.

---

## Task 3: Hook `useProjectBudgetData`

**Files:**
- Create: `src/hooks/useProjectBudgetData.ts`

- [ ] **Step 1: Définir les types et écrire le hook**

```typescript
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

  const totalRealExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);

  const totalRealIncome = data.revenues.reduce((sum, r) => sum + r.amount, 0);

  const balance = totalRealIncome - totalRealExpenses;

  return {
    lines: data.lines,
    expenses: data.expenses,
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
```

- [ ] **Step 2: Vérifier le typage**

Run: `npx tsc --noEmit`
Expected: `useProjectBudgetData.ts` compile sans erreur.

---

## Task 4: `BudgetTab` — onglet Budget complet

**Files:**
- Create: `src/modules/projects/components/tabs/BudgetTab.tsx`

- [ ] **Step 1: Écrire le composant**

```tsx
"use client";

import { useState } from "react";
import type { Project } from "@/lib/sidekick-store";
import { useProjectBudgetData } from "@/hooks/useProjectBudgetData";
import type { BudgetLine, ProjectExpense } from "@/hooks/useProjectBudgetData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Plus,
  Trash2,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "positive" | "negative" | "neutral";
}) {
  const accentClass =
    accent === "positive"
      ? "text-green-400"
      : accent === "negative"
      ? "text-red-400"
      : "text-[#F5F5F5]";
  return (
    <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-4">
      <p className="text-[11px] uppercase tracking-wider text-[#F5F5F5]/40 mb-1">{label}</p>
      <p className={`text-xl font-semibold ${accentClass}`}>{value}</p>
      {sub && <p className="text-[11px] text-[#F5F5F5]/30 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#F5F5F5]/40">{title}</h3>
      {children}
    </div>
  );
}

// ─── Add Budget Line form ──────────────────────────────────────────────────────

function AddBudgetLineForm({
  projectId,
  kind,
  onAdd,
}: {
  projectId: string;
  kind: "expense" | "income";
  onAdd: (line: BudgetLine) => void;
}) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    if (!label.trim() || !amount) return;
    onAdd({
      id: crypto.randomUUID(),
      projectId,
      kind,
      category: category.trim(),
      label: label.trim(),
      amountPlanned: parseFloat(amount) || 0,
    });
    setLabel("");
    setCategory("");
    setAmount("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/30 hover:text-[#F0FF00] transition-colors"
      >
        <Plus size={13} /> Ajouter un poste
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-end flex-wrap">
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Libellé"
        className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] text-xs h-8 flex-1 min-w-[140px]"
        autoFocus
      />
      <Input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Catégorie"
        className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] text-xs h-8 w-32"
      />
      <Input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Montant €"
        type="number"
        min="0"
        step="0.01"
        className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] text-xs h-8 w-28"
      />
      <Button size="sm" onClick={handleAdd} disabled={!label.trim() || !amount}>
        Ajouter
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Annuler
      </Button>
    </div>
  );
}

// ─── Add Expense form ─────────────────────────────────────────────────────────

function AddExpenseForm({
  projectId,
  onAdd,
}: {
  projectId: string;
  onAdd: (e: ProjectExpense) => void;
}) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    if (!label.trim() || !amount || !date) return;
    onAdd({
      id: crypto.randomUUID(),
      projectId,
      label: label.trim(),
      category: category.trim(),
      amount: parseFloat(amount) || 0,
      date,
      notes: notes.trim(),
    });
    setLabel("");
    setCategory("");
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/30 hover:text-[#F0FF00] transition-colors"
      >
        <Plus size={13} /> Ajouter une dépense
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[rgba(245,245,245,0.08)] p-3 space-y-2">
      <div className="flex gap-2 flex-wrap">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Libellé *"
          className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] text-xs h-8 flex-1 min-w-[140px]"
          autoFocus
        />
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Catégorie"
          className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] text-xs h-8 w-32"
        />
      </div>
      <div className="flex gap-2 flex-wrap">
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Montant € *"
          type="number"
          min="0"
          step="0.01"
          className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] text-xs h-8 w-28"
        />
        <Input
          value={date}
          onChange={(e) => setDate(e.target.value)}
          type="date"
          className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] text-xs h-8 w-36"
        />
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] text-xs h-8 flex-1"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
        <Button size="sm" onClick={handleAdd} disabled={!label.trim() || !amount || !date}>Ajouter</Button>
      </div>
    </div>
  );
}

// ─── Comparatif bar ───────────────────────────────────────────────────────────

function ComparBar({
  label,
  planned,
  real,
  max,
}: {
  label: string;
  planned: number;
  real: number;
  max: number;
}) {
  const plannedPct = max > 0 ? (planned / max) * 100 : 0;
  const realPct = max > 0 ? (real / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-[#F5F5F5]/60">{label}</span>
        <span className="text-[#F5F5F5]/40">{fmt(planned)} prévu · {fmt(real)} réel</span>
      </div>
      <div className="relative h-3 bg-[rgba(245,245,245,0.06)] rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-[rgba(245,245,245,0.2)] rounded-full"
          style={{ width: `${plannedPct}%` }}
        />
        <div
          className="absolute h-full bg-[#F0FF00]/70 rounded-full"
          style={{ width: `${realPct}%` }}
        />
      </div>
    </div>
  );
}

// ─── BudgetTab ────────────────────────────────────────────────────────────────

export function BudgetTab({ project }: { project: Project }) {
  const {
    lines,
    expenses,
    revenues,
    setLines,
    setExpenses,
    loading,
    error,
    kpis,
  } = useProjectBudgetData(project.id);

  if (loading) {
    return <p className="text-[13px] text-[#F5F5F5]/20 py-8">Chargement...</p>;
  }

  if (error) {
    return <p className="text-[13px] text-red-400/70 py-4">{error}</p>;
  }

  // Regroupement dépenses prévues par catégorie pour le comparatif
  const expenseCategories = Array.from(
    new Set([
      ...lines.filter((l) => l.kind === "expense").map((l) => l.category || "Sans catégorie"),
      ...expenses.map((e) => e.category || "Sans catégorie"),
    ])
  );

  const maxCompar = Math.max(
    ...expenseCategories.map((cat) => {
      const planned = lines
        .filter((l) => l.kind === "expense" && (l.category || "Sans catégorie") === cat)
        .reduce((s, l) => s + l.amountPlanned, 0);
      const real = expenses
        .filter((e) => (e.category || "Sans catégorie") === cat)
        .reduce((s, e) => s + e.amount, 0);
      return Math.max(planned, real);
    }),
    1
  );

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label="Prévu (charges)"
          value={fmt(kpis.totalPlannedExpenses)}
          sub={`dont ${fmt(kpis.totalPlannedIncome)} attendus en revenus`}
        />
        <KpiCard
          label="Dépenses réelles"
          value={fmt(kpis.totalRealExpenses)}
          accent={kpis.totalRealExpenses > kpis.totalPlannedExpenses ? "negative" : "neutral"}
        />
        <KpiCard
          label="Balance"
          value={fmt(kpis.balance)}
          sub="Revenus réels − Dépenses réelles"
          accent={kpis.balance >= 0 ? "positive" : "negative"}
        />
      </div>

      {/* Prévisionnel — charges */}
      <Section title="Charges prévues">
        {lines.filter((l) => l.kind === "expense").length === 0 && (
          <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucun poste de charge. Ajoute un poste ci-dessous.</p>
        )}
        {lines.filter((l) => l.kind === "expense").map((line) => (
          <div
            key={line.id}
            className="flex items-center justify-between gap-3 py-2 border-b border-[rgba(245,245,245,0.06)]"
          >
            <div className="flex-1 min-w-0">
              <span className="text-[13px] text-[#F5F5F5]/80">{line.label}</span>
              {line.category && (
                <span className="ml-2 text-[11px] text-[#F5F5F5]/30">{line.category}</span>
              )}
            </div>
            <span className="text-[13px] text-[#F5F5F5]/60 tabular-nums">{fmt(line.amountPlanned)}</span>
            <button
              onClick={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
              className="text-[#F5F5F5]/20 hover:text-red-400 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <AddBudgetLineForm
          projectId={project.id}
          kind="expense"
          onAdd={(line) => setLines((prev) => [...prev, line])}
        />
        {lines.filter((l) => l.kind === "expense").length > 0 && (
          <div className="flex justify-end pt-1">
            <span className="text-[12px] text-[#F5F5F5]/40">
              Total prévu : <strong className="text-[#F5F5F5]/70">{fmt(kpis.totalPlannedExpenses)}</strong>
            </span>
          </div>
        )}
      </Section>

      {/* Prévisionnel — revenus attendus */}
      <Section title="Revenus attendus">
        {lines.filter((l) => l.kind === "income").length === 0 && (
          <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucun revenu attendu renseigné.</p>
        )}
        {lines.filter((l) => l.kind === "income").map((line) => (
          <div
            key={line.id}
            className="flex items-center justify-between gap-3 py-2 border-b border-[rgba(245,245,245,0.06)]"
          >
            <div className="flex-1 min-w-0">
              <span className="text-[13px] text-[#F5F5F5]/80">{line.label}</span>
              {line.category && (
                <span className="ml-2 text-[11px] text-[#F5F5F5]/30">{line.category}</span>
              )}
            </div>
            <span className="text-[13px] text-green-400/70 tabular-nums">{fmt(line.amountPlanned)}</span>
            <button
              onClick={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
              className="text-[#F5F5F5]/20 hover:text-red-400 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <AddBudgetLineForm
          projectId={project.id}
          kind="income"
          onAdd={(line) => setLines((prev) => [...prev, line])}
        />
        {lines.filter((l) => l.kind === "income").length > 0 && (
          <div className="flex justify-end pt-1">
            <span className="text-[12px] text-[#F5F5F5]/40">
              Total attendu : <strong className="text-green-400/70">{fmt(kpis.totalPlannedIncome)}</strong>
            </span>
          </div>
        )}
      </Section>

      {/* Dépenses réelles */}
      <Section title="Dépenses réelles">
        {expenses.length === 0 && (
          <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucune dépense saisie.</p>
        )}
        {expenses.map((exp) => (
          <div
            key={exp.id}
            className="flex items-center justify-between gap-3 py-2 border-b border-[rgba(245,245,245,0.06)]"
          >
            <div className="flex-1 min-w-0">
              <span className="text-[13px] text-[#F5F5F5]/80">{exp.label}</span>
              {exp.category && (
                <span className="ml-2 text-[11px] text-[#F5F5F5]/30">{exp.category}</span>
              )}
            </div>
            <span className="text-[11px] text-[#F5F5F5]/30">{exp.date}</span>
            <span className="text-[13px] text-red-400/70 tabular-nums">{fmt(exp.amount)}</span>
            <button
              onClick={() => setExpenses((prev) => prev.filter((e) => e.id !== exp.id))}
              className="text-[#F5F5F5]/20 hover:text-red-400 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <AddExpenseForm
          projectId={project.id}
          onAdd={(exp) => setExpenses((prev) => [exp, ...prev])}
        />
        {expenses.length > 0 && (
          <div className="flex justify-end pt-1">
            <span className="text-[12px] text-[#F5F5F5]/40">
              Total réel : <strong className="text-red-400/70">{fmt(kpis.totalRealExpenses)}</strong>
            </span>
          </div>
        )}
      </Section>

      {/* Revenus rattachés */}
      <Section title="Revenus réels rattachés">
        {revenues.length === 0 ? (
          <p className="text-[12px] text-[#F5F5F5]/20 italic">
            Aucun revenu rattaché. Utilise « Rattacher une facture » dans le module Revenus, ou tague des saisies manuelles à ce projet.
          </p>
        ) : (
          <div className="space-y-0">
            {revenues.map((rev) => (
              <div
                key={rev.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-[rgba(245,245,245,0.06)]"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    rev.source === "invoice"
                      ? "border-blue-500/30 text-blue-400"
                      : "border-purple-500/30 text-purple-400"
                  }`}>
                    {rev.source === "invoice" ? "Facture" : "Royalties"}
                  </span>
                  <span className="text-[13px] text-[#F5F5F5]/70 truncate">{rev.label}</span>
                </div>
                <span className="text-[11px] text-[#F5F5F5]/30 shrink-0">{rev.date}</span>
                <span className="text-[13px] text-green-400/70 tabular-nums shrink-0">{fmt(rev.amount)}</span>
              </div>
            ))}
            <div className="flex justify-end pt-1">
              <span className="text-[12px] text-[#F5F5F5]/40">
                Total réel : <strong className="text-green-400/70">{fmt(kpis.totalRealIncome)}</strong>
              </span>
            </div>
          </div>
        )}
        <a
          href="/incomes/facturation"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/30 hover:text-[#F0FF00] transition-colors mt-2"
        >
          <ExternalLink size={12} /> Gérer les factures dans Revenus
        </a>
      </Section>

      {/* Comparatif par catégorie */}
      {expenseCategories.length > 0 && (
        <Section title="Comparatif charges prévues / réelles">
          <div className="space-y-4">
            {expenseCategories.map((cat) => {
              const planned = lines
                .filter((l) => l.kind === "expense" && (l.category || "Sans catégorie") === cat)
                .reduce((s, l) => s + l.amountPlanned, 0);
              const real = expenses
                .filter((e) => (e.category || "Sans catégorie") === cat)
                .reduce((s, e) => s + e.amount, 0);
              return (
                <ComparBar
                  key={cat}
                  label={cat}
                  planned={planned}
                  real={real}
                  max={maxCompar}
                />
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Vérifier le typage**

Run: `npx tsc --noEmit`
Expected: `BudgetTab.tsx` compile. Corriger d'éventuelles erreurs sur `Select` non utilisé (supprimer l'import).

---

## Task 5: Brancher `BudgetTab` dans `ProjectTabs` et mettre à jour le cockpit

**Files:**
- Modify: `src/modules/projects/components/ProjectTabs.tsx`
- Modify: `src/modules/projects/components/tabs/OverviewTab.tsx`

- [ ] **Step 1: Remplacer `PlaceholderTab` budget par `BudgetTab` dans `ProjectTabs`**

Dans `src/modules/projects/components/ProjectTabs.tsx`, ajouter l'import :

```typescript
import { BudgetTab } from "./tabs/BudgetTab";
```

Puis remplacer :

```tsx
{active === "budget" && <PlaceholderTab name="Budget" />}
```

par :

```tsx
{active === "budget" && <BudgetTab project={project} />}
```

- [ ] **Step 2: Mettre à jour le cockpit Budget dans `OverviewTab`**

Dans `src/modules/projects/components/tabs/OverviewTab.tsx`, ajouter l'import du hook :

```typescript
import { useProjectBudgetData } from "@/hooks/useProjectBudgetData";
```

Dans le composant `OverviewTab`, après le premier `const { setProjects }`, ajouter :

```typescript
const { kpis, loading: budgetLoading } = useProjectBudgetData(project.id);
```

Puis remplacer la carte Budget :

```tsx
<CockpitCard label="💶 Budget & finances" onClick={() => onGoTab("budget")}>
  <p className="text-[13px] text-[#F5F5F5]/30 italic">À configurer</p>
</CockpitCard>
```

par :

```tsx
<CockpitCard label="💶 Budget & finances" onClick={() => onGoTab("budget")}>
  {budgetLoading ? (
    <p className="text-[12px] text-[#F5F5F5]/20">…</p>
  ) : kpis.totalPlannedExpenses === 0 && kpis.totalRealExpenses === 0 ? (
    <p className="text-[13px] text-[#F5F5F5]/30 italic">Budget non configuré</p>
  ) : (
    <p className="text-[12px] text-[#F5F5F5]/70 leading-relaxed">
      📋 {fmt(kpis.totalPlannedExpenses)} prévu<br />
      💸 {fmt(kpis.totalRealExpenses)} dépensé<br />
      <span className={kpis.balance >= 0 ? "text-green-400" : "text-red-400"}>
        {kpis.balance >= 0 ? "+" : ""}{fmt(kpis.balance)} balance
      </span>
    </p>
  )}
</CockpitCard>
```

Aussi ajouter la fonction `fmt` dans `OverviewTab.tsx` (même implémentation que dans `BudgetTab`), juste avant le composant `CockpitCard` :

```typescript
function fmt(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}
```

- [ ] **Step 3: Vérifier typage + lint**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

Run: `npm run dev` → ouvrir un projet → onglet Budget : saisir des postes de charge/revenus, des dépenses réelles ; vérifier que les KPIs se mettent à jour ; vérifier la Vue d'ensemble (cockpit Budget). Recharger la page : tout persist.

---

## Self-Review (effectuée)

- **Couverture spec** : 3 chiffres clés (T3 `kpis` + T4 `KpiCard`) ✓ ; prévisionnel éditables (T4 `AddBudgetLineForm`) ✓ ; dépenses réelles saisissables (T4 `AddExpenseForm`) ✓ ; revenus rattachés lecture + renvoi Revenus (T4 section revenus) ✓ ; comparatif barres (T4 `ComparBar`) ✓ ; cockpit Budget avec vrais chiffres (T5) ✓.
- **Bouton « Rattacher une facture »** : en Phase 2 on affiche uniquement les factures déjà taguées `project_id = X` et un lien vers `/incomes/facturation`. Le tagging depuis les Revenus est en Phase 4. `attachInvoice`/`detachInvoice` dans le hook sont prêts pour Phase 4.
- **Royalties d'import via `linkedTracks`** : non affichées en Phase 2 (requêtes multi-tables complexes). Un message explicatif est présent dans la section revenus. Ajout en Phase 4.
- **Placeholders** : `PlaceholderTab` marketing et admin restent intentionnellement en attente.
- **Cohérence des types** : `BudgetLine.id` = `crypto.randomUUID()` côté client, upsert avec `id` fourni fonctionne sur Postgres. `ProjectExpense` idem.
- **Import `Select` inutilisé** dans `BudgetTab` : à supprimer avant le `tsc --noEmit` (le Step 2 de Task 4 le mentionne).
