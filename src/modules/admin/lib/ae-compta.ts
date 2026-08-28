import type { AdminStatus } from "@/lib/sidekick-store";
import type { Invoice } from "@/hooks/useIncomesData";
import { computeTotals, frToIso, parseAmount } from "@/modules/incomes/components/invoice-utils";
import {
  inferAeMicroHeuristicFromApe,
  microHeuristicLabel,
  normalizeAeDemarchesFromData,
  parseCreationYearFromFrDate,
  shouldSkipCfeProcedure,
  type AeDeclarationCadence,
  type AeMicroHeuristic,
} from "@/modules/admin/lib/ae-demarches";
import { isAeFranchiseBaseVatRegime } from "@/modules/admin/data/statuts-form-config";

/** Références indicatives — à mettre à jour selon les textes en vigueur. */
const REF_LABEL = "Règles 2026 (indicatif)";

/** Plafonds micro-entreprise (réforme triennelle, ordre de grandeur publié en presse pro). */
const MICRO_PLAFOND_CA: Record<AeMicroHeuristic, number> = {
  bic_vente: 203_100,
  services: 83_600,
  bnc: 83_600,
  liberal: 83_600,
};

/** Franchise TVA — prestations (seuils classiques, base / majoré). */
const TVA_FRANCHISE_BASE = 37_500;
const TVA_FRANCHISE_MAJORE = 41_250;

/** Taux de versement libératoire indicatifs (ordre de grandeur URSSAF + impôt). */
const LIBERATOIRE_TAUX_PCT: Record<AeMicroHeuristic, number> = {
  bic_vente: 12,
  services: 22,
  bnc: 22,
  liberal: 22,
};

function statusProfile(status: AdminStatus): Record<string, string> {
  const raw = status.data?.profile;
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    out[k] = typeof v === "string" ? v : String(v ?? "");
  }
  return out;
}

function encaissementIso(inv: Invoice): string | null {
  if (inv.encaissementDate?.trim()) return inv.encaissementDate.trim();
  if (inv.dueDate) {
    const iso = frToIso(inv.dueDate);
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
  }
  return null;
}

function invoiceAmountTtc(inv: Invoice): number {
  if (inv.lines && inv.lines.length > 0) return computeTotals(inv.lines).totalTTC;
  return parseAmount(inv.amount);
}

function invoiceAmountHt(inv: Invoice): number {
  if (inv.lines && inv.lines.length > 0) return computeTotals(inv.lines).totalHT;
  return parseAmount(inv.amount);
}

function parseIsoDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function startOfYear(y: number): Date {
  return new Date(y, 0, 1);
}

function endOfYear(y: number): Date {
  return new Date(y, 11, 31, 23, 59, 59, 999);
}

function inRange(iso: string, from: Date, to: Date): boolean {
  const d = parseIsoDate(iso);
  if (!d) return false;
  return d >= from && d <= to;
}

function quarterIndex(m0: number): 0 | 1 | 2 | 3 {
  return (Math.floor(m0 / 3) as 0 | 1 | 2 | 3);
}

function quarterDateRange(y: number, q: 0 | 1 | 2 | 3): { from: Date; to: Date } {
  const startM = q * 3;
  const from = new Date(y, startM, 1);
  const to = new Date(y, startM + 3, 0, 23, 59, 59, 999);
  return { from, to };
}

function lastDayOfMonth(y: number, m0: number): Date {
  return new Date(y, m0 + 1, 0, 23, 59, 59, 999);
}

function creationYearFromStatus(status: AdminStatus): number | null {
  const raw = status.dateDebut?.trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const y = parseInt(raw.slice(0, 4), 10);
    return Number.isFinite(y) ? y : null;
  }
  return parseCreationYearFromFrDate(raw);
}

function sumPaidInRange(
  invoices: Invoice[],
  from: Date,
  to: Date,
  mode: "ttc" | "ht"
): number {
  let sum = 0;
  for (const inv of invoices) {
    if (inv.status !== "payee") continue;
    const iso = encaissementIso(inv);
    if (!iso || !inRange(iso, from, to)) continue;
    sum += mode === "ttc" ? invoiceAmountTtc(inv) : invoiceAmountHt(inv);
  }
  return sum;
}

function sumPaidHtRolling12Months(invoices: Invoice[], ref: Date): number {
  const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999);
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  let sum = 0;
  for (const inv of invoices) {
    if (inv.status !== "payee") continue;
    const iso = encaissementIso(inv);
    if (!iso) continue;
    const d = parseIsoDate(iso);
    if (!d || d < start || d > end) continue;
    sum += invoiceAmountHt(inv);
  }
  return sum;
}

export type AeComptaUrssafCadence = AeDeclarationCadence;

export interface AeComptaSnapshot {
  referenceLabel: string;
  microHeuristic: AeMicroHeuristic;
  microHeuristicLabel: string;
  plafondMicroEuros: number;
  caTtcYear: number;
  caHtYear: number;
  caTtcQuarterCurrent: number;
  caTtcQuarterPrev: number;
  quarterCurrentLabel: string;
  quarterPrevLabel: string;
  progressPct: number;
  versementLiberatoire: boolean;
  cotisationPct: number | null;
  cotisationProvisionYtdEuros: number | null;
  cotisationProvisionPeriodEuros: number | null;
  urssafNextDueLabel: string;
  urssafNextDueIso: string;
  urssafCadence: AeComptaUrssafCadence;
  tvaFranchiseActive: boolean;
  tvaFranchiseSummary: string;
  tvaCaHt12m: number;
  cfeSummary: string;
  disclaimer: string;
}

function nextUrssafDueDate(now: Date, cadence: AeDeclarationCadence): { due: Date; periodHint: string } {
  const y = now.getFullYear();
  const m0 = now.getMonth();
  if (cadence === "monthly") {
    const dueM = m0 + 1;
    const dueY = y + (dueM > 11 ? 1 : 0);
    const dm = dueM > 11 ? dueM - 12 : dueM;
    const due = lastDayOfMonth(dueY, dm);
    const prevM = m0 === 0 ? 11 : m0 - 1;
    const prevY = m0 === 0 ? y - 1 : y;
    const periodHint = `${String(prevM + 1).padStart(2, "0")}/${prevY}`;
    return { due, periodHint };
  }

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fromY = y - 1;
  const toY = y + 1;
  const candidates: { due: Date; periodHint: string }[] = [];
  for (let yy = fromY; yy <= toY; yy++) {
    candidates.push({ due: new Date(yy, 3, 30, 23, 59, 59, 999), periodHint: `T1 ${yy}` });
    candidates.push({ due: new Date(yy, 6, 31, 23, 59, 59, 999), periodHint: `T2 ${yy}` });
    candidates.push({ due: new Date(yy, 9, 31, 23, 59, 59, 999), periodHint: `T3 ${yy}` });
    candidates.push({ due: new Date(yy + 1, 0, 31, 23, 59, 59, 999), periodHint: `T4 ${yy}` });
  }

  let best: { due: Date; periodHint: string } | null = null;
  for (const c of candidates) {
    if (c.due < startToday) continue;
    if (!best || c.due < best.due) best = c;
  }
  if (!best) {
    const due = new Date(y + 1, 3, 30, 23, 59, 59, 999);
    return { due, periodHint: `T1 ${y + 1}` };
  }
  return best;
}

function caForCurrentUrssafPeriod(
  invoices: Invoice[],
  now: Date,
  cadence: AeDeclarationCadence
): number {
  const y = now.getFullYear();
  const m0 = now.getMonth();
  if (cadence === "monthly") {
    const prevM = m0 === 0 ? 11 : m0 - 1;
    const prevY = m0 === 0 ? y - 1 : y;
    const from = new Date(prevY, prevM, 1);
    const to = lastDayOfMonth(prevY, prevM);
    return sumPaidInRange(invoices, from, to, "ttc");
  }
  const q = quarterIndex(m0);
  const { from, to } = quarterDateRange(y, q);
  return sumPaidInRange(invoices, from, to, "ttc");
}

export function formatComptaEuros(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function computeAeComptaSnapshot(
  status: AdminStatus,
  scopedInvoices: Invoice[],
  now = new Date()
): AeComptaSnapshot | null {
  if (status.type !== "auto_entrepreneur") return null;

  const profile = statusProfile(status);
  const dem = normalizeAeDemarchesFromData(status.data?.aeDemarches);
  const ape = profile.ape?.trim() ?? "";
  const microHeuristic = inferAeMicroHeuristicFromApe(ape);
  const plafond = MICRO_PLAFOND_CA[microHeuristic];

  const y = now.getFullYear();
  const caTtcYear = sumPaidInRange(scopedInvoices, startOfYear(y), endOfYear(y), "ttc");
  const caHtYear = sumPaidInRange(scopedInvoices, startOfYear(y), endOfYear(y), "ht");

  const m0 = now.getMonth();
  const q = quarterIndex(m0);
  const qPrev = (q === 0 ? 3 : (q - 1)) as 0 | 1 | 2 | 3;
  const yQ = q === 0 ? y - 1 : y;
  const yPrev = q === 0 ? y - 1 : y;
  const curRange = quarterDateRange(y, q);
  const prevRange = quarterDateRange(yPrev, qPrev);

  const caTtcQuarterCurrent = sumPaidInRange(scopedInvoices, curRange.from, curRange.to, "ttc");
  const caTtcQuarterPrev = sumPaidInRange(scopedInvoices, prevRange.from, prevRange.to, "ttc");

  const quarterCurrentLabel = `T${q + 1} ${y}`;
  const quarterPrevLabel = `T${qPrev + 1} ${yPrev}`;

  const progressPct =
    plafond > 0 ? Math.min(100, Math.round((caHtYear / plafond) * 1000) / 10) : 0;

  const liberatoire = dem.socialFiscalMode === "liberatoire";
  const cotisationPct = liberatoire ? LIBERATOIRE_TAUX_PCT[microHeuristic] : null;
  const cotisationProvisionYtdEuros =
    liberatoire && cotisationPct != null ? (caTtcYear * cotisationPct) / 100 : null;

  const { due, periodHint } = nextUrssafDueDate(now, dem.declarationCadence);
  const periodCaTtc = caForCurrentUrssafPeriod(scopedInvoices, now, dem.declarationCadence);
  const cotisationProvisionPeriodEuros =
    liberatoire && cotisationPct != null ? (periodCaTtc * cotisationPct) / 100 : null;

  const urssafNextDueIso = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;

  const franchise = isAeFranchiseBaseVatRegime(profile.tvaRegime);
  const tvaCaHt12m = sumPaidHtRolling12Months(scopedInvoices, now);

  let tvaFranchiseSummary: string;
  if (!franchise) {
    tvaFranchiseSummary = "Hors franchise (régime TVA réel ou autre) — pas de suivi franchise ici.";
  } else if (tvaCaHt12m >= TVA_FRANCHISE_MAJORE) {
    tvaFranchiseSummary = `Alerte : CA HT sur 12 mois glissants (${formatComptaEuros(tvaCaHt12m)}) dépasse le seuil majoré indicatif (${formatComptaEuros(TVA_FRANCHISE_MAJORE)}).`;
  } else if (tvaCaHt12m >= TVA_FRANCHISE_BASE) {
    tvaFranchiseSummary = `Vigilance : CA HT 12 mois (${formatComptaEuros(tvaCaHt12m)}) au-dessus du seuil de base (${formatComptaEuros(TVA_FRANCHISE_BASE)}), sous le majoré.`;
  } else {
    tvaFranchiseSummary = `Franchise en base : CA HT 12 mois (${formatComptaEuros(tvaCaHt12m)}) sous le seuil de base (${formatComptaEuros(TVA_FRANCHISE_BASE)}).`;
  }

  const creationY = creationYearFromStatus(status);
  const calendarY = now.getFullYear();
  const cfeProcedureSkipped = shouldSkipCfeProcedure(Boolean(dem.cfeMarkedExempt));
  const caCfeRaw = (dem.cfeCurrentYearCaEuros ?? "").replace(",", ".").replace(/\s/g, "");
  const caCfeEuro = parseFloat(caCfeRaw);
  const caCfeUnder5k = Number.isFinite(caCfeEuro) && caCfeEuro > 0 && caCfeEuro < 5000;

  let cfeSummary: string;
  if (cfeProcedureSkipped) {
    cfeSummary =
      "Exonéré ou dispense : tu as indiqué ne pas suivre la démarche CFE côté statut.";
  } else if (creationY !== null && creationY === calendarY) {
    cfeSummary = `Première année civile (${calendarY}) : exonération de principe pour cette année ; la démarche CFE est tout de même prévue avec une première échéance indicative au 15/12/${calendarY + 1}.`;
  } else if (caCfeUnder5k) {
    cfeSummary =
      "CA renseigné sous 5 000 € : en principe exonéré pour l’instant ; la démarche CFE reste active car ton CA peut évoluer.";
  } else {
    cfeSummary = "À vérifier : pense à la CFE (impôts) selon ta situation réelle.";
  }

  const disclaimer =
    "Outil d’aide à la décision, pas un substitut aux obligations légales ni aux avis d’imposition. Les montants et dates sont indicatifs ; vérifie sur autoentrepreneur.urssaf.fr et impots.gouv.fr.";

  return {
    referenceLabel: REF_LABEL,
    microHeuristic,
    microHeuristicLabel: microHeuristicLabel(microHeuristic),
    plafondMicroEuros: plafond,
    caTtcYear,
    caHtYear,
    caTtcQuarterCurrent,
    caTtcQuarterPrev,
    quarterCurrentLabel,
    quarterPrevLabel,
    progressPct,
    versementLiberatoire: liberatoire,
    cotisationPct,
    cotisationProvisionYtdEuros,
    cotisationProvisionPeriodEuros,
    urssafNextDueLabel: `${urssafNextDueIso} (période ${periodHint})`,
    urssafNextDueIso,
    urssafCadence: dem.declarationCadence,
    tvaFranchiseActive: franchise,
    tvaFranchiseSummary,
    tvaCaHt12m,
    cfeSummary,
    disclaimer,
  };
}
