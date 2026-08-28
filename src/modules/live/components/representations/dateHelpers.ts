export function parseFrDate(frDate: string): Date | null {
  if (!frDate) return null;
  const parts = frDate.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  return isNaN(date.getTime()) ? null : date;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isRepresentationPast(dateStr: string): boolean {
  const d = parseFrDate(dateStr);
  if (!d) return false;
  d.setHours(0, 0, 0, 0);
  return d.getTime() < startOfToday().getTime();
}

export function dateSortValue(dateStr: string): number {
  return parseFrDate(dateStr)?.getTime() ?? 0;
}

export function formatDateShort(dateStr: string): string {
  const d = parseFrDate(dateStr);
  if (!d) return dateStr;
  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  return `${days[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function relativeLabel(dateStr: string): string {
  const d = parseFrDate(dateStr);
  if (!d) return dateStr;
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - startOfToday().getTime()) / 86_400_000);
  if (diff === 0) return "aujourd’hui";
  if (diff === 1) return "demain";
  if (diff === -1) return "hier";
  if (diff < 0) return `il y a ${-diff} j`;
  if (diff < 7) return `dans ${diff} j`;
  if (diff < 14) return "dans 1 sem.";
  if (diff < 60) return `dans ${Math.round(diff / 7)} sem.`;
  return `dans ${Math.round(diff / 30)} mois`;
}

/** "15/02/2025" → "2025-02-15" pour DatePicker/factures. */
export function toIsoFromFr(frDate: string): string {
  const parts = (frDate || "").split("/");
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
