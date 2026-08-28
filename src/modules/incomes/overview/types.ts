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
