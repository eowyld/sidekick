import type { Invoice, InvoiceLine } from "@/hooks/useIncomesData";

export const INCOME_TYPES = ["Live", "Phono", "Edition", "Merchandising", "Autre"] as const;
export const LINE_TYPES = ["service", "vente de marchandise"] as const;

export type InvoiceStatus = "en_attente" | "payee";
export type IncomeType = (typeof INCOME_TYPES)[number];
export type LineType = (typeof LINE_TYPES)[number];

export function frToIso(frDate: string): string {
  if (!frDate) return "";
  const parts = frDate.split("/");
  if (parts.length !== 3) return frDate;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function isoToFr(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

export function parseFrDate(frDate: string): Date | null {
  if (!frDate) return null;
  const parts = frDate.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  return isNaN(date.getTime()) ? null : date;
}

export function isOverdue(inv: Invoice): boolean {
  if (inv.status !== "en_attente" || !inv.dueDate) return false;
  const due = parseFrDate(inv.dueDate);
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

export function parseAmount(s: string): number {
  const n = parseFloat(String(s || "0").replace(",", ".").replace(/\s/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

export function computeTotals(lines: InvoiceLine[]): { totalHT: number; totalTTC: number } {
  let totalHT = 0;
  let totalTTC = 0;
  for (const line of lines) {
    const qty = parseAmount(line.quantity);
    const pu = parseAmount(line.unitPrice);
    const vat = parseAmount(line.vatPercent);
    const ht = qty * pu;
    totalHT += ht;
    totalTTC += ht * (1 + vat / 100);
  }
  return { totalHT, totalTTC };
}

export function formatMoney(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

/** Factures rattachées au statut juridique (même logique que la facturation). */
export function filterInvoicesForBillingStatus(
  invoices: Invoice[],
  statusId: string | null,
  scopeMap: Record<string, string>,
  statuses: { id: string }[]
): Invoice[] {
  if (!statusId) return [];
  const hasMultiple = statuses.length > 1;
  const single = statuses.length === 1 ? statuses[0] : null;
  const fallbackId = statuses[0]?.id ?? null;
  return invoices.filter((invoice) => {
    const mapped = scopeMap[invoice.id];
    if (mapped) return mapped === statusId;
    if (single) return single.id === statusId;
    if (fallbackId) return fallbackId === statusId;
    return false;
  });
}

export function getNextInvoiceNumber(invoices: Invoice[]): string {
  const year = new Date().getFullYear();
  let maxNum = 0;
  for (const inv of invoices) {
    const match = inv.number.match(/-(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
    }
  }
  const next = maxNum + 1;
  return `FAC-${year}-${String(next).padStart(3, "0")}`;
}

/** Jour calendaire local au format ISO YYYY-MM-DD (pour encaissement). */
export function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Met à jour `encaissementDate` selon les transitions de statut :
 * - passage en « payée » : date du jour (première fois) ;
 * - reste « payée » : conserve la date existante, ou remplit une fois si facture ancienne sans date ;
 * - sortie de « payée » : efface la date.
 */
export function mergeEncaissementDate(prev: Invoice | undefined, next: Invoice): Invoice {
  if (next.status !== "payee") {
    return { ...next, encaissementDate: undefined };
  }
  if (prev?.status === "payee") {
    const kept = prev.encaissementDate ?? next.encaissementDate ?? todayIsoLocal();
    return { ...next, encaissementDate: kept };
  }
  return { ...next, encaissementDate: todayIsoLocal() };
}
