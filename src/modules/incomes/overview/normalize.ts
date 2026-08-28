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
