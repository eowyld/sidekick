const MONTH_NAMES: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  janvier: "01", février: "02", mars: "03", avril: "04", mai: "05", juin: "06",
  juillet: "07", août: "08", septembre: "09", octobre: "10", novembre: "11", décembre: "12",
};

/**
 * Normalise une période en "YYYY-MM".
 * Formats supportés :
 *   "Jan 2025", "January 2025", "2025-01-01", "2025-01", "01/2025", "01/01/2025"
 * Retourne "" si le format est inconnu.
 */
export function parsePeriod(raw: string): string {
  if (!raw) return "";
  const s = raw.trim();

  // "YYYY-MM-DD" ou "YYYY-MM"
  const isoMatch = s.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;

  // "MMM YYYY" ou "MMMM YYYY" ex: "Jan 2025", "January 2025"
  const monthYearMatch = s.match(/^([a-zA-Zéûôîèàâùïü]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const month = MONTH_NAMES[monthYearMatch[1].toLowerCase()];
    if (month) return `${monthYearMatch[2]}-${month}`;
  }

  // "MM/DD/YYYY" ou "MM/YYYY"
  const slashMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) return `${slashMatch[3]}-${slashMatch[1]}`;

  const shortSlashMatch = s.match(/^(\d{2})\/(\d{4})$/);
  if (shortSlashMatch) return `${shortSlashMatch[2]}-${shortSlashMatch[1]}`;

  return "";
}
