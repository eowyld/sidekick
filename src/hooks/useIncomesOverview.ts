// src/hooks/useIncomesOverview.ts
"use client";

import { useMemo } from "react";
import { useIncomesData, type Invoice } from "@/hooks/useIncomesData";
import { useSidekickData } from "@/hooks/useSidekickData";
import { MOCK_RELEVES } from "@/modules/incomes/parsers/copyright-types";
import type { RoyaltyEntry } from "@/modules/incomes/parsers/royalties-types";
import {
  normalizeInvoices,
  normalizeRoyalties,
  normalizeSacem,
  normalizeIntermittence,
} from "@/modules/incomes/overview/normalize";
import type { NormalizedRevenue } from "@/modules/incomes/overview/types";

export function useIncomesOverview(): {
  revenues: NormalizedRevenue[];
  invoices: Invoice[];
  projectNames: Record<string, string>;
  loading: boolean;
  error: unknown;
} {
  const { imports, manualEntries, invoices, missions, loading, error } = useIncomesData();
  const { data } = useSidekickData();

  const royaltyEntries: RoyaltyEntry[] = useMemo(() => {
    const fromImports = Object.values(imports)
      .filter((imp): imp is NonNullable<typeof imp> => imp !== null)
      .flatMap((imp) => imp.entries);
    return [...fromImports, ...manualEntries];
  }, [imports, manualEntries]);

  const revenues: NormalizedRevenue[] = useMemo(
    () => [
      ...normalizeInvoices(invoices),
      ...normalizeRoyalties(royaltyEntries),
      ...normalizeSacem(MOCK_RELEVES),
      ...normalizeIntermittence(missions),
    ],
    [invoices, royaltyEntries, missions]
  );

  const projectNames: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    (data.projects?.projects ?? []).forEach((p) => { map[p.id] = p.title; });
    return map;
  }, [data.projects]);

  return { revenues, invoices, projectNames, loading, error };
}
