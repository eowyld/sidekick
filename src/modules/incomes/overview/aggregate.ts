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
