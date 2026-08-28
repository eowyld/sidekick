import type { RoyaltyEntry } from "./royalties-types";
import { parsePeriod } from "./parse-period";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const REQUIRED_COLUMNS = ["Period", "Track Title", "Streams", "Revenue"];

export function parseSoundCloud(headers: string[], rows: string[][]): RoyaltyEntry[] {
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    throw new Error(`Ce fichier ne ressemble pas à un export SoundCloud (colonnes manquantes : ${missing.join(", ")})`);
  }

  const idx = (col: string) => headers.indexOf(col);

  return rows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row): RoyaltyEntry | null => {
      const period = parsePeriod(row[idx("Period")] ?? "");
      const trackTitle = (row[idx("Track Title")] ?? "").trim();
      const revenue = parseFloat((row[idx("Revenue")] ?? "0").replace(",", ".")) || 0;
      const streams = parseInt(row[idx("Streams")] ?? "0", 10) || 0;
      if (!period || !trackTitle) return null;
      return {
        id: generateId(),
        distributor: "soundcloud",
        period,
        store: "SoundCloud",
        country: "",
        trackTitle,
        streams,
        revenue,
        currency: "USD",
      };
    })
    .filter((e): e is RoyaltyEntry => e !== null);
}
