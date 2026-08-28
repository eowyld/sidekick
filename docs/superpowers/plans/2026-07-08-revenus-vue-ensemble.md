# Revenus — Vue d'ensemble Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer le stub `IncomesOverviewPage` en tableau de bord analytique des revenus (année / mois / module / projet) avec comparaison N-1.

**Architecture:** Une couche pure (normalisation des 4 sources en un type unifié `NormalizedRevenue`, puis agrégats dérivés) alimentée par un hook `useIncomesOverview`, consommée par une page orchestratrice qui distribue les données agrégées à 5 composants de présentation isolés.

**Tech Stack:** Next.js 16, React, TypeScript, recharts v3 (déjà installé), Tailwind, palette dark-only de l'app.

**Spec de référence:** `docs/superpowers/specs/2026-07-08-revenus-vue-ensemble-design.md`

**Note commits:** le `CLAUDE.md` du projet impose « ne committer que sur demande explicite ». Les étapes « Commit » ci-dessous s'exécutent quand l'utilisateur pilote l'exécution ; ne pas committer sans son accord.

**Note tests:** le projet n'a **pas** de test runner. La vérification de chaque tâche = `npx tsc --noEmit` (types) + `npm run lint` + contrôle visuel dans `npm run dev` sur `/incomes`. Les fonctions de `normalize.ts` et `aggregate.ts` sont pures et prêtes à être unit-testées si un runner (vitest) est ajouté plus tard.

---

## File Structure

**Créés :**
- `src/modules/incomes/overview/types.ts` — types partagés, constantes (couleurs/labels modules, taux USD→EUR).
- `src/modules/incomes/overview/normalize.ts` — fonctions pures : 4 sources → `NormalizedRevenue[]`.
- `src/modules/incomes/overview/aggregate.ts` — fonctions pures : agrégats (KPIs, mois, module, projet, année) + orchestrateur `buildOverview`.
- `src/hooks/useIncomesOverview.ts` — lit les sources (Supabase + mock SACEM + projets) et expose `NormalizedRevenue[]`.
- `src/modules/incomes/overview/components/OverviewKpis.tsx`
- `src/modules/incomes/overview/components/MonthlyRevenueChart.tsx`
- `src/modules/incomes/overview/components/ModuleBreakdown.tsx`
- `src/modules/incomes/overview/components/ProjectBreakdown.tsx`
- `src/modules/incomes/overview/components/YearlyComparison.tsx`

**Modifiés :**
- `src/modules/incomes/components/IncomesOverviewPage.tsx` — orchestration complète (remplace le stub).

---

## Task 1: Types & constantes partagés

**Files:**
- Create: `src/modules/incomes/overview/types.ts`

- [ ] **Step 1: Créer le fichier de types**

```ts
// src/modules/incomes/overview/types.ts

export type RevenueModule = "facture" | "royalties" | "sacem" | "intermittence";

/** Entrée de revenu normalisée, source-agnostique. */
export interface NormalizedRevenue {
  date: Date;          // date retenue (encaissement/period/date selon la source)
  amountEUR: number;   // montant BRUT, converti en EUR
  module: RevenueModule;
  projectId?: string;  // undefined → bucket « Sans projet »
}

export const MODULE_ORDER: RevenueModule[] = ["facture", "royalties", "sacem", "intermittence"];

export const MODULE_LABELS: Record<RevenueModule, string> = {
  facture: "Facturation",
  royalties: "Droits phono",
  sacem: "Droits d'auteur",
  intermittence: "Intermittence",
};

export const MODULE_COLORS: Record<RevenueModule, string> = {
  facture: "#F0FF00",
  royalties: "#60a5fa",
  sacem: "#f472b6",
  intermittence: "#34d399",
};

/** Taux de conversion USD→EUR (fixe, v1). À déplacer vers les préférences plus tard. */
export const USD_TO_EUR = 0.92;

/** Clé du bucket « Sans projet ». */
export const UNASSIGNED_PROJECT = "__unassigned__";

// ─── Types d'agrégats ────────────────────────────────────────────────────────

export interface MonthPoint {
  monthIndex: number;   // 0-11
  label: string;        // "janv.", "févr.", …
  facture: number;
  royalties: number;
  sacem: number;
  intermittence: number;
  total: number;
  prevYearTotal: number; // même mois de l'année N-1 (ligne fantôme)
}

export interface ModuleSlice {
  module: RevenueModule;
  label: string;
  color: string;
  amount: number;
  pct: number;
}

export interface ProjectSlice {
  projectId: string;    // id projet, ou UNASSIGNED_PROJECT
  label: string;
  amount: number;
}

export interface YearBar {
  year: number;
  facture: number;
  royalties: number;
  sacem: number;
  intermittence: number;
  total: number;
}

export interface OverviewKpiData {
  encaisse: number;
  deltaPctVsPrevYear: number | null; // null si période « Tout » ou pas de N-1 exploitable
  aVenir: number;                    // somme EUR des factures en attente
  aVenirCount: number;
  moyenneParMois: number;
  topModule: { module: RevenueModule; label: string; pct: number } | null;
}

export interface OverviewData {
  kpis: OverviewKpiData;
  byMonth: MonthPoint[];
  byModule: ModuleSlice[];
  byProject: ProjectSlice[];
  byYear: YearBar[];
  chartYear: number; // année affichée par le graphe mensuel
}

export type YearSelection = number | "all";
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: PASS (aucune erreur nouvelle).

- [ ] **Step 3: Commit**

```bash
git add src/modules/incomes/overview/types.ts
git commit -m "feat(revenus): types & constantes vue d'ensemble"
```

---

## Task 2: Normalisation des 4 sources

**Files:**
- Create: `src/modules/incomes/overview/normalize.ts`

- [ ] **Step 1: Créer le fichier de normalisation**

```ts
// src/modules/incomes/overview/normalize.ts

import type { Invoice, IntermittenceMission } from "@/hooks/useIncomesData";
import type { RoyaltyEntry } from "@/modules/incomes/parsers/royalties-types";
import type { CopyrightReleve } from "@/modules/incomes/parsers/copyright-types";
import { type NormalizedRevenue, USD_TO_EUR } from "./types";

/** Parse un montant stocké en string (« 1 200,50 » / « 1200.5 ») en number. */
export function parseAmount(value: string | number): number {
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  const cleaned = String(value).replace(/\s/g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/** Parse une date « YYYY-MM-DD » (jour local). */
function parseISODate(value: string): Date | null {
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

/** Parse une période « YYYY-MM » → 1er du mois (jour local). */
function parsePeriodMonth(value: string): Date | null {
  const m = String(value).match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return isNaN(d.getTime()) ? null : d;
}

/** Factures : payées uniquement, à la date d'encaissement, montant brut EUR. */
export function normalizeInvoices(invoices: Invoice[]): NormalizedRevenue[] {
  return invoices
    .filter((i) => i.status === "payee" && !!i.encaissementDate)
    .map((i): NormalizedRevenue | null => {
      const date = parseISODate(i.encaissementDate as string);
      if (!date) return null;
      return { date, amountEUR: parseAmount(i.amount), module: "facture", projectId: i.projectId };
    })
    .filter((x): x is NormalizedRevenue => x !== null);
}

/** Royalties streaming : conversion USD→EUR sauf si déjà en EUR. */
export function normalizeRoyalties(entries: RoyaltyEntry[]): NormalizedRevenue[] {
  return entries
    .map((e): NormalizedRevenue | null => {
      const date = parsePeriodMonth(e.period);
      if (!date) return null;
      const amountEUR = e.currency === "EUR" ? e.revenue : e.revenue * USD_TO_EUR;
      return { date, amountEUR, module: "royalties", projectId: e.projectId };
    })
    .filter((x): x is NormalizedRevenue => x !== null);
}

/** Droits d'auteur SACEM : montant EUR, date de l'entrée. Pas de projectId. */
export function normalizeSacem(releves: CopyrightReleve[]): NormalizedRevenue[] {
  return releves
    .flatMap((r) => r.entries)
    .map((e): NormalizedRevenue | null => {
      const date = parseISODate(e.date);
      if (!date) return null;
      return { date, amountEUR: e.montant, module: "sacem", projectId: undefined };
    })
    .filter((x): x is NormalizedRevenue => x !== null);
}

/** Intermittence : montant BRUT (grossAmount), date de la mission. Pas de projectId. */
export function normalizeIntermittence(missions: IntermittenceMission[]): NormalizedRevenue[] {
  return missions
    .map((m): NormalizedRevenue | null => {
      const date = parseISODate(m.date);
      if (!date) return null;
      return { date, amountEUR: m.grossAmount, module: "intermittence", projectId: undefined };
    })
    .filter((x): x is NormalizedRevenue => x !== null);
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: PASS. (Vérifie notamment que `Invoice`, `IntermittenceMission` sont bien exportés par `@/hooks/useIncomesData` et `RoyaltyEntry` par royalties-types, `CopyrightReleve` par copyright-types — c'est le cas.)

- [ ] **Step 3: Commit**

```bash
git add src/modules/incomes/overview/normalize.ts
git commit -m "feat(revenus): normalisation des 4 sources de revenus"
```

---

## Task 3: Agrégation

**Files:**
- Create: `src/modules/incomes/overview/aggregate.ts`

- [ ] **Step 1: Créer le fichier d'agrégation**

```ts
// src/modules/incomes/overview/aggregate.ts

import type { Invoice } from "@/hooks/useIncomesData";
import { parseAmount } from "./normalize";
import {
  type NormalizedRevenue,
  type MonthPoint,
  type ModuleSlice,
  type ProjectSlice,
  type YearBar,
  type OverviewKpiData,
  type OverviewData,
  type YearSelection,
  type RevenueModule,
  MODULE_ORDER,
  MODULE_LABELS,
  MODULE_COLORS,
  UNASSIGNED_PROJECT,
} from "./types";

const MONTH_LABELS: string[] = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString("fr-FR", { month: "short" })
);

/** Années présentes dans les données, ordre décroissant. */
export function availableYears(revenues: NormalizedRevenue[]): number[] {
  const set = new Set(revenues.map((r) => r.date.getFullYear()));
  return Array.from(set).sort((a, b) => b - a);
}

function filterByYear(revenues: NormalizedRevenue[], year: YearSelection): NormalizedRevenue[] {
  return year === "all" ? revenues : revenues.filter((r) => r.date.getFullYear() === year);
}

/** Nombre de mois distincts (YYYY-MM) couverts par les données, min 1. */
function distinctMonths(revenues: NormalizedRevenue[]): number {
  const set = new Set(revenues.map((r) => `${r.date.getFullYear()}-${r.date.getMonth()}`));
  return Math.max(1, set.size);
}

/** Factures en attente → cash à venir (toutes années confondues). */
export function computeUpcoming(invoices: Invoice[]): { total: number; count: number } {
  const pending = invoices.filter((i) => i.status === "en_attente");
  return {
    total: pending.reduce((s, i) => s + parseAmount(i.amount), 0),
    count: pending.length,
  };
}

/** 12 points mensuels pour `year`, avec total N-1 par mois pour la ligne fantôme. */
export function computeByMonth(revenues: NormalizedRevenue[], year: number): MonthPoint[] {
  const bucket = (y: number) => {
    const months = Array.from({ length: 12 }, () => ({
      facture: 0, royalties: 0, sacem: 0, intermittence: 0,
    }));
    revenues
      .filter((r) => r.date.getFullYear() === y)
      .forEach((r) => { months[r.date.getMonth()][r.module] += r.amountEUR; });
    return months;
  };
  const cur = bucket(year);
  const prev = bucket(year - 1);
  return cur.map((m, i) => {
    const total = m.facture + m.royalties + m.sacem + m.intermittence;
    const p = prev[i];
    return {
      monthIndex: i,
      label: MONTH_LABELS[i],
      facture: m.facture, royalties: m.royalties, sacem: m.sacem, intermittence: m.intermittence,
      total,
      prevYearTotal: p.facture + p.royalties + p.sacem + p.intermittence,
    };
  });
}

/** Répartition par module (revenus déjà filtrés par période). */
export function computeByModule(revenues: NormalizedRevenue[]): ModuleSlice[] {
  const totals: Record<RevenueModule, number> = { facture: 0, royalties: 0, sacem: 0, intermittence: 0 };
  revenues.forEach((r) => { totals[r.module] += r.amountEUR; });
  const grand = MODULE_ORDER.reduce((s, m) => s + totals[m], 0);
  return MODULE_ORDER.map((m) => ({
    module: m,
    label: MODULE_LABELS[m],
    color: MODULE_COLORS[m],
    amount: totals[m],
    pct: grand > 0 ? (totals[m] / grand) * 100 : 0,
  }));
}

/** Répartition par projet + bucket « Sans projet » (revenus déjà filtrés). */
export function computeByProject(
  revenues: NormalizedRevenue[],
  projectNames: Record<string, string>
): ProjectSlice[] {
  const map = new Map<string, number>();
  revenues.forEach((r) => {
    const key = r.projectId ?? UNASSIGNED_PROJECT;
    map.set(key, (map.get(key) ?? 0) + r.amountEUR);
  });
  return Array.from(map.entries())
    .map(([projectId, amount]) => ({
      projectId,
      label:
        projectId === UNASSIGNED_PROJECT
          ? "Sans projet"
          : projectNames[projectId] ?? "Projet inconnu",
      amount,
    }))
    .sort((a, b) => {
      if (a.projectId === UNASSIGNED_PROJECT) return 1;  // « Sans projet » toujours en dernier
      if (b.projectId === UNASSIGNED_PROJECT) return -1;
      return b.amount - a.amount;
    });
}

/** Barres empilées par année (toutes années confondues). */
export function computeByYear(revenues: NormalizedRevenue[]): YearBar[] {
  const map = new Map<number, YearBar>();
  revenues.forEach((r) => {
    const y = r.date.getFullYear();
    const bar = map.get(y) ?? { year: y, facture: 0, royalties: 0, sacem: 0, intermittence: 0, total: 0 };
    bar[r.module] += r.amountEUR;
    bar.total += r.amountEUR;
    map.set(y, bar);
  });
  return Array.from(map.values()).sort((a, b) => a.year - b.year);
}

function computeKpis(
  forPeriod: NormalizedRevenue[],
  prevYear: NormalizedRevenue[] | null,
  upcoming: { total: number; count: number },
  monthsCount: number
): OverviewKpiData {
  const encaisse = forPeriod.reduce((s, r) => s + r.amountEUR, 0);
  let deltaPctVsPrevYear: number | null = null;
  if (prevYear) {
    const prev = prevYear.reduce((s, r) => s + r.amountEUR, 0);
    deltaPctVsPrevYear = prev > 0 ? ((encaisse - prev) / prev) * 100 : null;
  }
  const top = computeByModule(forPeriod)
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount)[0] ?? null;
  return {
    encaisse,
    deltaPctVsPrevYear,
    aVenir: upcoming.total,
    aVenirCount: upcoming.count,
    moyenneParMois: monthsCount > 0 ? encaisse / monthsCount : 0,
    topModule: top ? { module: top.module, label: top.label, pct: top.pct } : null,
  };
}

/** Orchestrateur : produit toutes les données de la page pour l'année sélectionnée. */
export function buildOverview(
  revenues: NormalizedRevenue[],
  invoices: Invoice[],
  projectNames: Record<string, string>,
  selectedYear: YearSelection,
  currentYear: number
): OverviewData {
  const forPeriod = filterByYear(revenues, selectedYear);
  const chartYear = selectedYear === "all" ? currentYear : selectedYear;
  const prevYear =
    selectedYear === "all"
      ? null
      : revenues.filter((r) => r.date.getFullYear() === selectedYear - 1);
  const monthsCount = selectedYear === "all" ? distinctMonths(revenues) : 12;

  return {
    kpis: computeKpis(forPeriod, prevYear, computeUpcoming(invoices), monthsCount),
    byMonth: computeByMonth(revenues, chartYear),
    byModule: computeByModule(forPeriod),
    byProject: computeByProject(forPeriod, projectNames),
    byYear: computeByYear(revenues),
    chartYear,
  };
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/incomes/overview/aggregate.ts
git commit -m "feat(revenus): agrégation KPIs/mois/module/projet/année"
```

---

## Task 4: Hook `useIncomesOverview`

**Files:**
- Create: `src/hooks/useIncomesOverview.ts`

- [ ] **Step 1: Créer le hook**

```ts
// src/hooks/useIncomesOverview.ts
"use client";

import { useMemo } from "react";
import { useIncomesData, type Invoice } from "@/hooks/useIncomesData";
import { useSidekickData } from "@/hooks/useSidekickData";
import { MOCK_RELEVES } from "@/modules/incomes/parsers/copyright-types";
import type { RoyaltyEntry } from "@/modules/incomes/parsers/royalties-types";
import {
  normalizeInvoices,
  normalizeRoyalties,
  normalizeSacem,
  normalizeIntermittence,
} from "@/modules/incomes/overview/normalize";
import type { NormalizedRevenue } from "@/modules/incomes/overview/types";

export function useIncomesOverview(): {
  revenues: NormalizedRevenue[];
  invoices: Invoice[];
  projectNames: Record<string, string>;
  loading: boolean;
  error: unknown;
} {
  const { imports, manualEntries, invoices, missions, loading, error } = useIncomesData();
  const { data } = useSidekickData();

  const royaltyEntries: RoyaltyEntry[] = useMemo(() => {
    const fromImports = Object.values(imports)
      .filter((imp): imp is NonNullable<typeof imp> => imp !== null)
      .flatMap((imp) => imp.entries);
    return [...fromImports, ...manualEntries];
  }, [imports, manualEntries]);

  const revenues: NormalizedRevenue[] = useMemo(
    () => [
      ...normalizeInvoices(invoices),
      ...normalizeRoyalties(royaltyEntries),
      ...normalizeSacem(MOCK_RELEVES),
      ...normalizeIntermittence(missions),
    ],
    [invoices, royaltyEntries, missions]
  );

  const projectNames: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    (data.projects?.projects ?? []).forEach((p) => { map[p.id] = p.title; });
    return map;
  }, [data.projects]);

  return { revenues, invoices, projectNames, loading, error };
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: PASS. (Confirme que `useIncomesData` retourne bien `loading` et `error` — oui ; `data.projects.projects` existe dans `SidekickData` — oui.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useIncomesOverview.ts
git commit -m "feat(revenus): hook useIncomesOverview (sources → NormalizedRevenue)"
```

---

## Task 5: Composant `OverviewKpis`

**Files:**
- Create: `src/modules/incomes/overview/components/OverviewKpis.tsx`

- [ ] **Step 1: Créer le composant KPI**

```tsx
// src/modules/incomes/overview/components/OverviewKpis.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Clock, CalendarDays, Crown } from "lucide-react";
import { formatEUR } from "@/modules/incomes/parsers/copyright-types";
import type { OverviewKpiData } from "../types";

interface OverviewKpisProps {
  kpis: OverviewKpiData;
  periodLabel: string; // ex. "2026" ou "Tout"
}

const CARD = "border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] text-[#F5F5F5] backdrop-blur-xl";

export function OverviewKpis({ kpis, periodLabel }: OverviewKpisProps) {
  const delta = kpis.deltaPctVsPrevYear;
  const deltaEl =
    delta === null ? null : (
      <span className={delta >= 0 ? "text-[#34d399]" : "text-[#f87171]"}>
        {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}% vs N-1
      </span>
    );

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card className={CARD}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
            Encaissé {periodLabel}
          </CardTitle>
          <Wallet className="h-4 w-4 text-[#F0FF00]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tabular-nums">{formatEUR(kpis.encaisse)}</div>
          <p className="mt-1 text-xs text-[#F5F5F5]/50">{deltaEl ?? "argent réellement perçu"}</p>
        </CardContent>
      </Card>

      <Card className={CARD}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
            À venir
          </CardTitle>
          <Clock className="h-4 w-4 text-[#F0FF00]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tabular-nums">{formatEUR(kpis.aVenir)}</div>
          <p className="mt-1 text-xs text-[#F5F5F5]/50">
            {kpis.aVenirCount} facture{kpis.aVenirCount > 1 ? "s" : ""} en attente
          </p>
        </CardContent>
      </Card>

      <Card className={CARD}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
            Moyenne / mois
          </CardTitle>
          <CalendarDays className="h-4 w-4 text-[#F0FF00]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tabular-nums">{formatEUR(kpis.moyenneParMois)}</div>
          <p className="mt-1 text-xs text-[#F5F5F5]/50">sur la période</p>
        </CardContent>
      </Card>

      <Card className={CARD}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
            Source n°1
          </CardTitle>
          <Crown className="h-4 w-4 text-[#F0FF00]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{kpis.topModule?.label ?? "—"}</div>
          <p className="mt-1 text-xs text-[#F5F5F5]/50">
            {kpis.topModule ? `${kpis.topModule.pct.toFixed(0)}% du total` : "aucune donnée"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: PASS. (Confirme que `formatEUR` est bien exporté par copyright-types — oui.)

- [ ] **Step 3: Commit**

```bash
git add src/modules/incomes/overview/components/OverviewKpis.tsx
git commit -m "feat(revenus): composant OverviewKpis"
```

---

## Task 6: Composant `MonthlyRevenueChart` (empilé + ligne N-1)

**Files:**
- Create: `src/modules/incomes/overview/components/MonthlyRevenueChart.tsx`

- [ ] **Step 1: Créer le graphe mensuel**

```tsx
// src/modules/incomes/overview/components/MonthlyRevenueChart.tsx
"use client";

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEUR } from "@/modules/incomes/parsers/copyright-types";
import { MODULE_COLORS, MODULE_LABELS, type MonthPoint } from "../types";

interface MonthlyRevenueChartProps {
  data: MonthPoint[];
  year: number;
}

const CARD = "border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] text-[#F5F5F5] backdrop-blur-xl";

export function MonthlyRevenueChart({ data, year }: MonthlyRevenueChartProps) {
  return (
    <Card className={CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Évolution mensuelle {year}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,245,245,0.08)" vertical={false} />
            <XAxis dataKey="label" stroke="rgba(245,245,245,0.5)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke="rgba(245,245,245,0.5)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(20,20,20,0.95)",
                border: "1px solid rgba(245,245,245,0.14)",
                borderRadius: 10,
                color: "#f5f5f5",
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [formatEUR(value), name]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="facture" stackId="rev" name={MODULE_LABELS.facture} fill={MODULE_COLORS.facture} radius={[0, 0, 0, 0]} />
            <Bar dataKey="royalties" stackId="rev" name={MODULE_LABELS.royalties} fill={MODULE_COLORS.royalties} />
            <Bar dataKey="sacem" stackId="rev" name={MODULE_LABELS.sacem} fill={MODULE_COLORS.sacem} />
            <Bar dataKey="intermittence" stackId="rev" name={MODULE_LABELS.intermittence} fill={MODULE_COLORS.intermittence} radius={[3, 3, 0, 0]} />
            <Line
              type="monotone"
              dataKey="prevYearTotal"
              name={`Total ${year - 1}`}
              stroke="rgba(245,245,245,0.55)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: PASS. (recharts v3 exporte `ComposedChart`, `Bar`, `Line`.)

- [ ] **Step 3: Commit**

```bash
git add src/modules/incomes/overview/components/MonthlyRevenueChart.tsx
git commit -m "feat(revenus): graphe mensuel empilé + ligne N-1"
```

---

## Task 7: Composants `ModuleBreakdown` & `ProjectBreakdown`

**Files:**
- Create: `src/modules/incomes/overview/components/ModuleBreakdown.tsx`
- Create: `src/modules/incomes/overview/components/ProjectBreakdown.tsx`

- [ ] **Step 1: Créer le donut par module**

```tsx
// src/modules/incomes/overview/components/ModuleBreakdown.tsx
"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEUR } from "@/modules/incomes/parsers/copyright-types";
import type { ModuleSlice } from "../types";

interface ModuleBreakdownProps {
  data: ModuleSlice[];
}

const CARD = "border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] text-[#F5F5F5] backdrop-blur-xl";

export function ModuleBreakdown({ data }: ModuleBreakdownProps) {
  const slices = data.filter((s) => s.amount > 0);

  return (
    <Card className={CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Répartition par module</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={160}>
            <PieChart>
              <Pie data={slices} dataKey="amount" nameKey="label" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={2} stroke="none">
                {slices.map((s) => (
                  <Cell key={s.module} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "rgba(20,20,20,0.95)",
                  border: "1px solid rgba(245,245,245,0.14)",
                  borderRadius: 10,
                  color: "#f5f5f5",
                  fontSize: 12,
                }}
                formatter={(value: number) => formatEUR(value)}
              />
            </PieChart>
          </ResponsiveContainer>
          <ul className="flex-1 space-y-2">
            {data.map((s) => (
              <li key={s.module} className="flex items-center gap-2 text-xs">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                <span className="text-[#F5F5F5]/80">{s.label}</span>
                <span className="ml-auto tabular-nums text-[#F5F5F5]/60">{s.pct.toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Créer les barres par projet**

```tsx
// src/modules/incomes/overview/components/ProjectBreakdown.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEUR } from "@/modules/incomes/parsers/copyright-types";
import { UNASSIGNED_PROJECT, type ProjectSlice } from "../types";

interface ProjectBreakdownProps {
  data: ProjectSlice[];
}

const CARD = "border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] text-[#F5F5F5] backdrop-blur-xl";

export function ProjectBreakdown({ data }: ProjectBreakdownProps) {
  const max = data.reduce((m, s) => Math.max(m, s.amount), 0);

  return (
    <Card className={CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Répartition par projet</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-6 text-center text-xs text-[#F5F5F5]/40">Aucun revenu sur la période.</p>
        ) : (
          <ul className="space-y-3">
            {data.map((s) => {
              const isUnassigned = s.projectId === UNASSIGNED_PROJECT;
              const width = max > 0 ? (s.amount / max) * 100 : 0;
              return (
                <li key={s.projectId} className="text-xs">
                  <div className="mb-1 flex items-center justify-between">
                    <span className={isUnassigned ? "text-[#F5F5F5]/50" : "text-[#F5F5F5]/85"}>{s.label}</span>
                    <span className="tabular-nums text-[#F5F5F5]/60">{formatEUR(s.amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[rgba(245,245,245,0.08)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${width}%`,
                        background: isUnassigned ? "rgba(245,245,245,0.3)" : "#F0FF00",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/modules/incomes/overview/components/ModuleBreakdown.tsx src/modules/incomes/overview/components/ProjectBreakdown.tsx
git commit -m "feat(revenus): répartitions par module (donut) et par projet (barres)"
```

---

## Task 8: Composant `YearlyComparison`

**Files:**
- Create: `src/modules/incomes/overview/components/YearlyComparison.tsx`

- [ ] **Step 1: Créer le comparatif annuel**

```tsx
// src/modules/incomes/overview/components/YearlyComparison.tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEUR } from "@/modules/incomes/parsers/copyright-types";
import { MODULE_COLORS, MODULE_LABELS, type YearBar } from "../types";

interface YearlyComparisonProps {
  data: YearBar[];
}

const CARD = "border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] text-[#F5F5F5] backdrop-blur-xl";

export function YearlyComparison({ data }: YearlyComparisonProps) {
  return (
    <Card className={CARD}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Comparatif annuel</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(245,245,245,0.08)" vertical={false} />
            <XAxis dataKey="year" stroke="rgba(245,245,245,0.5)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke="rgba(245,245,245,0.5)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(20,20,20,0.95)",
                border: "1px solid rgba(245,245,245,0.14)",
                borderRadius: 10,
                color: "#f5f5f5",
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [formatEUR(value), name]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="facture" stackId="y" name={MODULE_LABELS.facture} fill={MODULE_COLORS.facture} maxBarSize={64} />
            <Bar dataKey="royalties" stackId="y" name={MODULE_LABELS.royalties} fill={MODULE_COLORS.royalties} maxBarSize={64} />
            <Bar dataKey="sacem" stackId="y" name={MODULE_LABELS.sacem} fill={MODULE_COLORS.sacem} maxBarSize={64} />
            <Bar dataKey="intermittence" stackId="y" name={MODULE_LABELS.intermittence} fill={MODULE_COLORS.intermittence} radius={[3, 3, 0, 0]} maxBarSize={64} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/incomes/overview/components/YearlyComparison.tsx
git commit -m "feat(revenus): comparatif annuel empilé"
```

---

## Task 9: Assemblage `IncomesOverviewPage` + vérification end-to-end

**Files:**
- Modify: `src/modules/incomes/components/IncomesOverviewPage.tsx` (remplace intégralement le stub)

- [ ] **Step 1: Réécrire la page d'orchestration**

```tsx
// src/modules/incomes/components/IncomesOverviewPage.tsx
"use client";

import { useMemo, useState } from "react";
import { PageError } from "@/components/ui/page-error";
import { cn } from "@/lib/utils";
import { useIncomesOverview } from "@/hooks/useIncomesOverview";
import { buildOverview, availableYears } from "@/modules/incomes/overview/aggregate";
import type { YearSelection } from "@/modules/incomes/overview/types";
import { OverviewKpis } from "@/modules/incomes/overview/components/OverviewKpis";
import { MonthlyRevenueChart } from "@/modules/incomes/overview/components/MonthlyRevenueChart";
import { ModuleBreakdown } from "@/modules/incomes/overview/components/ModuleBreakdown";
import { ProjectBreakdown } from "@/modules/incomes/overview/components/ProjectBreakdown";
import { YearlyComparison } from "@/modules/incomes/overview/components/YearlyComparison";

export function IncomesOverviewPage() {
  const currentYear = new Date().getFullYear();
  const { revenues, invoices, projectNames, loading, error } = useIncomesOverview();
  const [selectedYear, setSelectedYear] = useState<YearSelection>(currentYear);

  const years = useMemo(() => {
    const set = new Set<number>(availableYears(revenues));
    set.add(currentYear);
    return Array.from(set).sort((a, b) => b - a);
  }, [revenues, currentYear]);

  const overview = useMemo(
    () => buildOverview(revenues, invoices, projectNames, selectedYear, currentYear),
    [revenues, invoices, projectNames, selectedYear, currentYear]
  );

  const periodLabel = selectedYear === "all" ? "Tout" : String(selectedYear);

  return (
    <div className="space-y-6">
      {/* En-tête + sélecteur d'année */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">Vue d&apos;ensemble</h1>
          <p className="text-sm text-[#F5F5F5]/70">
            Synthèse de tes revenus encaissés — tous modules confondus.
          </p>
        </div>
        <div className="flex gap-1.5">
          {(["all", ...years] as YearSelection[]).map((y) => {
            const active = y === selectedYear;
            return (
              <button
                key={String(y)}
                onClick={() => setSelectedYear(y)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                  active
                    ? "border-[#F0FF00] bg-[#F0FF00] font-semibold text-[#101010]"
                    : "border-[rgba(245,245,245,0.18)] text-[#F5F5F5]/70 hover:text-[#F5F5F5]"
                )}
              >
                {y === "all" ? "Tout" : y}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <PageError
          title="Impossible de charger les revenus"
          description="Une erreur est survenue lors du chargement de tes données."
        />
      ) : loading ? (
        <OverviewSkeleton />
      ) : revenues.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.5)] py-16 text-center">
          <p className="text-sm font-medium text-[#F5F5F5]/70">Aucun revenu enregistré</p>
          <p className="mt-1 max-w-sm text-xs text-[#F5F5F5]/40">
            Ajoute des factures, importe des royalties ou saisis des missions d&apos;intermittence
            pour voir apparaître ta synthèse ici.
          </p>
        </div>
      ) : (
        <>
          <OverviewKpis kpis={overview.kpis} periodLabel={periodLabel} />
          <MonthlyRevenueChart data={overview.byMonth} year={overview.chartYear} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ModuleBreakdown data={overview.byModule} />
            <ProjectBreakdown data={overview.byProject} />
          </div>
          <YearlyComparison data={overview.byYear} />
        </>
      )}
    </div>
  );
}

function OverviewSkeleton() {
  const box = "animate-pulse rounded-xl border border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.5)]";
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn(box, "h-24")} />
        ))}
      </div>
      <div className={cn(box, "h-72")} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={cn(box, "h-56")} />
        <div className={cn(box, "h-56")} />
      </div>
      <div className={cn(box, "h-64")} />
    </div>
  );
}
```

- [ ] **Step 2: Vérifier la compilation & le lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS pour les deux.

- [ ] **Step 3: Vérification visuelle en dev**

Run: `npm run dev`, puis ouvrir `http://localhost:3000/incomes`.
Vérifier :
- Les 4 KPIs affichent des montants en EUR ; « Source n°1 » nommée ; delta N-1 visible sur l'année en cours.
- Le graphe mensuel montre des barres empilées 4 couleurs + une ligne pointillée « Total N-1 ».
- Le donut par module + légende %, et les barres par projet (avec « Sans projet » en gris en bas).
- Le comparatif annuel montre une barre empilée par année présente.
- Le sélecteur d'année (Tout / 2024 / 2025 / 2026…) reconfigure toute la page ; en « Tout », le graphe mensuel retombe sur l'année en cours et le delta N-1 disparaît.
- Le tooltip de chaque graphe affiche des montants formatés en EUR.
- Aucun warning recharts « width(0)/height(0) » persistant en console.

- [ ] **Step 4: Vérifier l'état vide (optionnel)**

Si un compte de test sans revenus est disponible, confirmer l'affichage du bloc « Aucun revenu enregistré ». Sinon, relire la branche du JSX pour validation.

- [ ] **Step 5: Commit**

```bash
git add src/modules/incomes/components/IncomesOverviewPage.tsx
git commit -m "feat(revenus): assemblage de la vue d'ensemble analytique"
```

---

## Self-Review (rempli par l'auteur du plan)

**Couverture spec :**
- Devise USD→EUR taux fixe → `USD_TO_EUR` + `normalizeRoyalties` (Task 2). ✓
- Base encaissement, factures payées seules, impayées en KPI « à venir » → `normalizeInvoices` filtre `status === "payee"` + `computeUpcoming` (Tasks 2-3). ✓
- Montant brut partout → `amount`, `revenue`, `grossAmount` (Task 2). ✓
- SACEM incluse via mock, agrégation source-agnostique → `normalizeSacem(MOCK_RELEVES)` (Tasks 2, 4). ✓
- Par projet + bucket « Sans projet » réconcilié à 100% → `computeByProject` (Task 3). ✓
- Axes année/mois/module/projet → `byYear`/`byMonth`/`byModule`/`byProject` (Task 3). ✓
- Bonus N-1 → champ `prevYearTotal` + `<Line>` pointillée (Tasks 3, 6). ✓
- Design (cartes, palette, couleurs modules, formatEUR) → tous les composants. ✓
- États loading/vide/erreur → Task 9. ✓
- Hors périmètre (net estimé, objectif, export…) → non implémentés. ✓

**Placeholders :** aucun — chaque étape contient le code complet.

**Cohérence des types :** `NormalizedRevenue`, `OverviewData`, noms de fonctions (`buildOverview`, `computeByMonth`, `computeByModule`, `computeByProject`, `computeByYear`, `computeUpcoming`, `availableYears`) cohérents entre Tasks 1/3/9. `formatEUR` réutilisé depuis copyright-types partout. Clés `dataKey` recharts (`facture`/`royalties`/`sacem`/`intermittence`/`prevYearTotal`/`total`/`year`) alignées avec les champs des types.
