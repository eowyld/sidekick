// src/modules/incomes/parsers/royalties-types.ts

export type Distributor = "distrokid" | "tunecore" | "cdbaby" | "soundcloud";
export type TabId = Distributor | "manual";

export interface RoyaltyEntry {
  id: string;
  distributor: Distributor | "manual";
  period: string;       // "YYYY-MM"
  store: string;
  country: string;
  trackTitle: string;
  album?: string;
  isrc?: string;
  streams: number;
  revenue: number;
  currency: string;
}

export interface DistributorImport {
  distributor: Distributor;
  fileName: string;
  importedAt: string;
  entries: RoyaltyEntry[];
}

export type ManualEntry = RoyaltyEntry & { distributor: "manual" };

export type ImportsStore = Record<Distributor, DistributorImport | null>;

export const EMPTY_IMPORTS: ImportsStore = {
  distrokid: null,
  tunecore: null,
  cdbaby: null,
  soundcloud: null,
};
