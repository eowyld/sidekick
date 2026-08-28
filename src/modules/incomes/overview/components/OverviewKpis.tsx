// src/modules/incomes/overview/components/OverviewKpis.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Clock, CalendarDays, Crown } from "lucide-react";
import { formatEUR } from "@/modules/incomes/parsers/copyright-types";
import type { OverviewKpiData } from "../types";

interface OverviewKpisProps {
  kpis: OverviewKpiData;
  periodLabel: string; // ex. "2026" ou "Tout"
}

const CARD = "border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] text-[#F5F5F5] backdrop-blur-xl";

export function OverviewKpis({ kpis, periodLabel }: OverviewKpisProps) {
  const delta = kpis.deltaPctVsPrevYear;
  const deltaEl =
    delta === null ? null : (
      <span className={delta >= 0 ? "text-[#34d399]" : "text-[#f87171]"}>
        {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}% vs N-1
      </span>
    );

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card className={CARD}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
            Encaissé {periodLabel}
          </CardTitle>
          <Wallet className="h-4 w-4 text-[#F0FF00]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tabular-nums">{formatEUR(kpis.encaisse)}</div>
          <p className="mt-1 text-xs text-[#F5F5F5]/50">{deltaEl ?? "argent réellement perçu"}</p>
        </CardContent>
      </Card>

      <Card className={CARD}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
            À venir
          </CardTitle>
          <Clock className="h-4 w-4 text-[#F0FF00]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tabular-nums">{formatEUR(kpis.aVenir)}</div>
          <p className="mt-1 text-xs text-[#F5F5F5]/50">
            {kpis.aVenirCount} facture{kpis.aVenirCount > 1 ? "s" : ""} en attente
          </p>
        </CardContent>
      </Card>

      <Card className={CARD}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
            Moyenne / mois
          </CardTitle>
          <CalendarDays className="h-4 w-4 text-[#F0FF00]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tabular-nums">{formatEUR(kpis.moyenneParMois)}</div>
          <p className="mt-1 text-xs text-[#F5F5F5]/50">sur la période</p>
        </CardContent>
      </Card>

      <Card className={CARD}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
            Source n°1
          </CardTitle>
          <Crown className="h-4 w-4 text-[#F0FF00]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{kpis.topModule?.label ?? "—"}</div>
          <p className="mt-1 text-xs text-[#F5F5F5]/50">
            {kpis.topModule ? `${kpis.topModule.pct.toFixed(0)}% du total` : "aucune donnée"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
