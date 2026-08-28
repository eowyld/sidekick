import type { RoyaltyEntry } from "./royalties-types";
import { parsePeriod } from "./parse-period";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const REQUIRED_COLUMNS = ["Sale Date", "Store", "Track", "Units", "Net Revenue (USD)"];

export function parseCdBaby(headers: string[], rows: string[][]): RoyaltyEntry[] {
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    throw new Error(`Ce fichier ne ressemble pas à un export CD Baby (colonnes manquantes : ${missing.join(", ")})`);
  }

  const idx = (col: string) => headers.indexOf(col);

  return rows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row): RoyaltyEntry | null => {
      const period = parsePeriod(row[idx("Sale Date")] ?? "");
      const trackTitle = (row[idx("Track")] ?? "").trim();
      const revenue = parseFloat((row[idx("Net Revenue (USD)")] ?? "0").replace(",", ".")) || 0;
      const streams = parseInt(row[idx("Units")] ?? "0", 10) || 0;
      if (!period || !trackTitle) return null;
      return {
        id: generateId(),
        distributor: "cdbaby",
        period,
        store: (row[idx("Store")] ?? "").trim(),
        country: (row[idx("Territory")] ?? "").trim(),
        trackTitle,
        album: (row[idx("Release")] ?? "").trim() || undefined,
        isrc: (row[idx("ISRC")] ?? "").trim() || undefined,
        streams,
        revenue,
        currency: "USD",
      };
    })
    .filter((e): e is RoyaltyEntry => e !== null);
}
