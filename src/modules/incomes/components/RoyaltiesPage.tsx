"use client";

import { useMemo, useState } from "react";
import { useIncomesData } from "@/hooks/useIncomesData";
import { PageLoader } from "@/components/ui/page-loader";
import { RoyaltiesDashboard } from "./RoyaltiesDashboard";
import { RoyaltiesImports } from "./RoyaltiesImports";
import type {
  Distributor, DistributorImport, RoyaltyEntry, TabId
} from "../parsers/royalties-types";

export function RoyaltiesPage() {
  const { imports, setImport, manualEntries, setManualEntries, loading } = useIncomesData();
  if (loading) return <PageLoader />;
  const [lastTab, setLastTab] = useState<TabId>("distrokid");

  const allEntries: RoyaltyEntry[] = useMemo(() => {
    const fromImports = Object.values(imports)
      .filter((imp): imp is DistributorImport => imp !== null)
      .flatMap((imp) => imp.entries);
    return [...fromImports, ...manualEntries];
  }, [imports, manualEntries]);

  const handleImport = (distributor: Distributor, imp: DistributorImport) => {
    setImport(distributor, imp);
  };

  const handleAddManual = (entry: import("../parsers/royalties-types").ManualEntry) => {
    setManualEntries((prev) => [entry, ...prev]);
  };

  const handleEditManual = (entry: import("../parsers/royalties-types").ManualEntry) => {
    setManualEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e)));
  };

  const handleDeleteManual = (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("Supprimer cette entrée ?")) return;
    setManualEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-8 bg-[#101010] px-2 py-4 text-[#F5F5F5] md:px-4 md:py-6">
      <header>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Royalties</h1>
        <p className="text-sm text-[#F5F5F5]/60">
          Revenus, streams et performances — tous distributeurs confondus.
        </p>
      </header>

      <RoyaltiesDashboard entries={allEntries} />

      <div className="border-t border-[rgba(245,245,245,0.08)]" />

      <RoyaltiesImports
        imports={imports}
        manualEntries={manualEntries}
        defaultTab={lastTab}
        onImport={handleImport}
        onTabChange={setLastTab}
        onAddManual={handleAddManual}
        onEditManual={handleEditManual}
        onDeleteManual={handleDeleteManual}
      />
    </div>
  );
}
