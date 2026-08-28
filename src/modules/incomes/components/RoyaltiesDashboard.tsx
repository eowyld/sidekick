"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Music, Zap, DollarSign } from "lucide-react";
import type { RoyaltyEntry } from "../parsers/royalties-types";

interface RoyaltiesDashboardProps {
  entries: RoyaltyEntry[];
}

function formatUSD(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function formatNumber(n: number): string {
  return n.toLocaleString("fr-FR");
}

const DISTRIBUTOR_LABELS: Record<string, string> = {
  distrokid: "DistroKid",
  tunecore: "TuneCore",
  cdbaby: "CD Baby",
  soundcloud: "SoundCloud",
  manual: "Saisie manuelle",
};

export function RoyaltiesDashboard({ entries }: RoyaltiesDashboardProps) {
  const stats = useMemo(() => {
    const totalRevenue = entries.reduce((s, e) => s + e.revenue, 0);
    const totalStreams = entries.reduce((s, e) => s + e.streams, 0);
    const activeTracks = new Set(entries.filter((e) => e.streams > 0).map((e) => e.trackTitle)).size;
    const avgRate = totalStreams > 0 ? totalRevenue / totalStreams : 0;
    return { totalRevenue, totalStreams, activeTracks, avgRate };
  }, [entries]);

  // Bar chart : 12 derniers mois glissants
  const barData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("fr-FR", { month: "short" });
      const revenue = entries
        .filter((e) => e.period === period)
        .reduce((s, e) => s + e.revenue, 0);
      return { name: label, revenus: revenue };
    });
  }, [entries]);

  // Répartition par plateforme
  const byStore = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      const store = e.store || "Autre";
      map.set(store, (map.get(store) ?? 0) + e.revenue);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [entries]);

  // Répartition par distributeur
  const byDistributor = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => {
      map.set(e.distributor, (map.get(e.distributor) ?? 0) + e.revenue);
    });
    const total = entries.reduce((s, e) => s + e.revenue, 0);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([dist, rev]) => ({ dist, rev, pct: total > 0 ? (rev / total) * 100 : 0 }));
  }, [entries]);

  // Top titres
  const topTracks = useMemo(() => {
    const map = new Map<string, { streams: number; revenue: number }>();
    entries.forEach((e) => {
      const existing = map.get(e.trackTitle) ?? { streams: 0, revenue: 0 };
      map.set(e.trackTitle, {
        streams: existing.streams + e.streams,
        revenue: existing.revenue + e.revenue,
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10);
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.5)] py-16 text-center">
        <Music className="mb-3 h-8 w-8 text-[#F5F5F5]/30" />
        <p className="text-sm font-medium text-[#F5F5F5]/70">Aucune donnée de royalties</p>
        <p className="mt-1 text-xs text-[#F5F5F5]/40">Importez un CSV ou saisissez des données manuellement ci-dessous.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">Revenus totaux</CardTitle>
            <DollarSign className="h-4 w-4 text-[#F0FF00]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatUSD(stats.totalRevenue)}</div>
            <p className="mt-1 text-xs text-[#F5F5F5]/50">tous distributeurs · toutes périodes</p>
          </CardContent>
        </Card>
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">Streams totaux</CardTitle>
            <TrendingUp className="h-4 w-4 text-[#F0FF00]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatNumber(stats.totalStreams)}</div>
            <p className="mt-1 text-xs text-[#F5F5F5]/50">tous distributeurs · toutes périodes</p>
          </CardContent>
        </Card>
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">Titres actifs</CardTitle>
            <Music className="h-4 w-4 text-[#F0FF00]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.activeTracks}</div>
            <p className="mt-1 text-xs text-[#F5F5F5]/50">avec au moins 1 stream</p>
          </CardContent>
        </Card>
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">Taux moyen / stream</CardTitle>
            <Zap className="h-4 w-4 text-[#F0FF00]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">${stats.avgRate.toFixed(4)}</div>
            <p className="mt-1 text-xs text-[#F5F5F5]/50">revenus / streams</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart 1 : bar chart mensuel */}
      <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
            Revenus par mois — 12 derniers mois
          </CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <ResponsiveContainer width="100%" height={220} minWidth={0}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
              <XAxis dataKey="name" tick={{ fill: "#E5E7EB", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.3)" }} />
              <YAxis tick={{ fill: "#E5E7EB", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(148,163,184,0.3)" }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#020617", border: "1px solid rgba(148,163,184,0.4)", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "#F9FAFB" }}
                formatter={(v: number | undefined) => v ? [`$${v.toFixed(2)}`, "Revenus"] : null}
              />
              <Bar dataKey="revenus" fill="#F0FF00" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chart 2 : répartition */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">Revenus par plateforme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byStore.length === 0 ? (
              <p className="text-xs text-[#F5F5F5]/40">Aucune donnée</p>
            ) : (
              byStore.map(([store, rev]) => {
                const total = stats.totalRevenue;
                const pct = total > 0 ? (rev / total) * 100 : 0;
                return (
                  <div key={store} className="flex items-center gap-3">
                    <div className="w-28 shrink-0 truncate text-xs text-[#F5F5F5]">{store}</div>
                    <div className="flex-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(245,245,245,0.1)]">
                        <div className="h-full rounded-full bg-[#F0FF00]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="w-20 shrink-0 text-right text-xs font-medium text-[#F5F5F5]">{formatUSD(rev)}</div>
                    <div className="w-10 shrink-0 text-right text-xs text-[#F5F5F5]/50">{pct.toFixed(0)}%</div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">Revenus par distributeur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byDistributor.length === 0 ? (
              <p className="text-xs text-[#F5F5F5]/40">Aucune donnée</p>
            ) : (
              byDistributor.map(({ dist, rev, pct }) => (
                <div key={dist} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 truncate text-xs text-[#F5F5F5]">
                    {DISTRIBUTOR_LABELS[dist] ?? dist}
                  </div>
                  <div className="flex-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(245,245,245,0.1)]">
                      <div className="h-full rounded-full bg-[#F0FF00]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="w-20 shrink-0 text-right text-xs font-medium text-[#F5F5F5]">{formatUSD(rev)}</div>
                  <div className="w-10 shrink-0 text-right text-xs text-[#F5F5F5]/50">{pct.toFixed(0)}%</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart 3 : top titres */}
      <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">Top titres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[rgba(245,245,245,0.08)]">
                  <th className="pb-2 pl-2 pr-4 text-left font-medium text-[#F5F5F5]/50">#</th>
                  <th className="pb-2 pr-4 text-left font-medium text-[#F5F5F5]/50">Titre</th>
                  <th className="pb-2 pr-4 text-right font-medium text-[#F5F5F5]/50">Streams</th>
                  <th className="pb-2 text-right font-medium text-[#F5F5F5]/50">Revenus</th>
                </tr>
              </thead>
              <tbody>
                {topTracks.map(([title, data], i) => (
                  <tr key={title} className="border-b border-[rgba(245,245,245,0.04)] last:border-0">
                    <td className="py-2 pl-2 pr-4 text-[#F5F5F5]/40">{i + 1}</td>
                    <td className="max-w-[200px] truncate py-2 pr-4 font-medium text-[#F5F5F5]">{title}</td>
                    <td className="py-2 pr-4 text-right text-[#F5F5F5]/80">{formatNumber(data.streams)}</td>
                    <td className="py-2 text-right font-semibold text-[#F0FF00]">{formatUSD(data.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
