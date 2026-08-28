// src/modules/incomes/components/IncomesOverviewPage.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { PageError } from "@/components/ui/page-error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useIncomesOverview } from "@/hooks/useIncomesOverview";
import { buildOverview, availableYears } from "@/modules/incomes/overview/aggregate";
import type { YearSelection } from "@/modules/incomes/overview/types";
import { OverviewKpis } from "@/modules/incomes/overview/components/OverviewKpis";
import { MonthlyRevenueChart } from "@/modules/incomes/overview/components/MonthlyRevenueChart";
import { ModuleBreakdown } from "@/modules/incomes/overview/components/ModuleBreakdown";
import { ProjectBreakdown } from "@/modules/incomes/overview/components/ProjectBreakdown";
import { YearlyComparison } from "@/modules/incomes/overview/components/YearlyComparison";

export function IncomesOverviewPage() {
  const currentYear = new Date().getFullYear();
  const { revenues, invoices, projectNames, loading, error } = useIncomesOverview();
  const [selectedYear, setSelectedYear] = useState<YearSelection>(currentYear);

  // Uniquement les années réellement présentes dans les données (ordre décroissant).
  const years = useMemo(() => availableYears(revenues), [revenues]);

  // Si l'année sélectionnée n'a plus (ou pas) de données, on retombe sur la plus
  // récente disponible, sinon sur « Tout ».
  useEffect(() => {
    if (selectedYear !== "all" && !years.includes(selectedYear)) {
      setSelectedYear(years[0] ?? "all");
    }
  }, [years, selectedYear]);

  const overview = useMemo(
    () => buildOverview(revenues, invoices, projectNames, selectedYear, currentYear),
    [revenues, invoices, projectNames, selectedYear, currentYear]
  );

  const periodLabel = selectedYear === "all" ? "Tout" : String(selectedYear);

  return (
    <div className="space-y-6">
      {/* En-tête + sélecteur d'année */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">Vue d&apos;ensemble</h1>
          <p className="text-sm text-[#F5F5F5]/70">
            Synthèse de tes revenus encaissés — tous modules confondus.
          </p>
        </div>
        <Select
          value={String(selectedYear)}
          onValueChange={(v) => setSelectedYear(v === "all" ? "all" : Number(v))}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les années</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <PageError
          title="Impossible de charger les revenus"
          description="Une erreur est survenue lors du chargement de tes données."
        />
      ) : loading ? (
        <OverviewSkeleton />
      ) : revenues.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.5)] py-16 text-center">
          <p className="text-sm font-medium text-[#F5F5F5]/70">Aucun revenu enregistré</p>
          <p className="mt-1 max-w-sm text-xs text-[#F5F5F5]/40">
            Ajoute des factures, importe des royalties ou saisis des missions d&apos;intermittence
            pour voir apparaître ta synthèse ici.
          </p>
        </div>
      ) : (
        <>
          <OverviewKpis kpis={overview.kpis} periodLabel={periodLabel} />
          <MonthlyRevenueChart data={overview.byMonth} year={overview.chartYear} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ModuleBreakdown data={overview.byModule} />
            <ProjectBreakdown data={overview.byProject} />
          </div>
          <YearlyComparison data={overview.byYear} />
        </>
      )}
    </div>
  );
}

function OverviewSkeleton() {
  const box = "animate-pulse rounded-xl border border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.5)]";
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn(box, "h-24")} />
        ))}
      </div>
      <div className={cn(box, "h-72")} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={cn(box, "h-56")} />
        <div className={cn(box, "h-56")} />
      </div>
      <div className={cn(box, "h-64")} />
    </div>
  );
}
