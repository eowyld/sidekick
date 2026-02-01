/**
 * Format de date JJ/MM/AAAA (jour/mois/année) pour toute l'application.
 * Stockage et affichage : chaîne "JJ/MM/AAAA" (ex. "25/12/2024").
 */

export const DATE_FORMAT_PLACEHOLDER = "JJ/MM/AAAA";

/** Vérifie qu'une chaîne est une date JJ/MM/AAAA valide. */
export function isValidDateFr(value: string): boolean {
  if (!value || value.length !== 10) return false;
  const parts = value.split("/");
  if (parts.length !== 3) return false;
  const [j, m, a] = parts;
  const day = parseInt(j ?? "", 10);
  const month = parseInt(m ?? "", 10);
  const year = parseInt(a ?? "", 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
  if (month < 1 || month > 12) return false;
  if (year < 1900 || year > 2100) return false;
  const lastDay = new Date(year, month, 0).getDate();
  return day >= 1 && day <= lastDay;
}

/** Convertit une date ISO (YYYY-MM-DD) en JJ/MM/AAAA. */
export function isoToFr(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  return `${String(Number(day)).padStart(2, "0")}/${String(
    Number(month)
  ).padStart(2, "0")}/${year ?? ""}`;
}

/** Convertit une date JJ/MM/AAAA en ISO (YYYY-MM-DD). */
export function frToIso(frDate: string): string {
  const parts = frDate.split("/");
  if (parts.length !== 3) return "";
  const [day, month, year] = parts;
  if (!day || !month || !year) return "";
  return `${year}-${String(Number(month)).padStart(2, "0")}-${String(
    Number(day)
  ).padStart(2, "0")}`;
}
