import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Download, Plus, TrendingUp } from "lucide-react";
import type { IntermittenceMission } from "./intermittence-types";

interface IntermittenceDashboardProps {
  missions: IntermittenceMission[];
  onNavigate?: (page: string) => void;
  onAddMission?: () => void;
}

function getLastMonthsLabels(count: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(
      d.toLocaleDateString("fr-FR", {
        month: "short"
      })
    );
  }
  return labels;
}

export function IntermittenceDashboard({
  missions,
  onNavigate,
  onAddMission
}: IntermittenceDashboardProps) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const missionsLast12Months = missions.filter((m) => {
    const d = new Date(m.date);
    if (isNaN(d.getTime())) return false;
    const monthsDiff =
      (currentYear - d.getFullYear()) * 12 + (currentMonth - d.getMonth());
    return monthsDiff >= 0 && monthsDiff < 12;
  });

  const missionsThisMonth = missionsLast12Months.filter((m) => {
    const d = new Date(m.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalHours12Months = missionsLast12Months.reduce(
    (sum, m) => sum + (m.hours || 0),
    0
  );
  const totalGross12Months = missionsLast12Months.reduce(
    (sum, m) => sum + (m.grossAmount || 0),
    0
  );
  const totalNet12Months = missionsLast12Months.reduce(
    (sum, m) => sum + (m.netAmount || 0),
    0
  );
  const totalGrossThisMonth = missionsThisMonth.reduce(
    (sum, m) => sum + (m.grossAmount || 0),
    0
  );

  const allocationEstimee = Math.round(totalGross12Months * 0.35);
  const progressHours = Math.min(100, (totalHours12Months / 507) * 100);
  const heuresRestantes = Math.max(0, 507 - totalHours12Months);
  const droitsOuverts = totalHours12Months >= 507;

  const barMonths = getLastMonthsLabels(8);
  const barData = barMonths.map((label, index) => {
    const targetDate = new Date(currentYear, currentMonth - (7 - index), 1);
    const month = targetDate.getMonth();
    const year = targetDate.getFullYear();
    const monthMissions = missions.filter((m) => {
      const d = new Date(m.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const totalGross = monthMissions.reduce(
      (sum, m) => sum + (m.grossAmount || 0),
      0
    );
    return { name: label, cachets: totalGross };
  });

  const lineMonths = getLastMonthsLabels(8);
  let cumulativeHours = 0;
  const lineData = lineMonths.map((label, index) => {
    const targetDate = new Date(currentYear, currentMonth - (7 - index), 1);
    const month = targetDate.getMonth();
    const year = targetDate.getFullYear();
    const monthHours = missions
      .filter((m) => {
        const d = new Date(m.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, m) => sum + (m.hours || 0), 0);
    cumulativeHours += monthHours;
    return { name: label, heuresCumulees: cumulativeHours };
  });

  const handleNavigateMissions = () => {
    onNavigate?.("intermittence-missions");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={onAddMission}
          className="flex items-center gap-2 rounded-full bg-[#F0FF00] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#101010] hover:bg-[#F0FF00]/90"
        >
          <Plus className="h-4 w-4" />
          Ajouter une mission
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleNavigateMissions}
          className="flex items-center gap-2 rounded-full border-[rgba(245,245,245,0.3)] bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#F5F5F5] hover:bg-[rgba(245,245,245,0.08)]"
        >
          <TrendingUp className="h-4 w-4" />
          Voir mes missions
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex items-center gap-2 rounded-full border-[rgba(245,245,245,0.3)] bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#F5F5F5] hover:bg-[rgba(245,245,245,0.08)]"
          onClick={() => {
            alert(
              "Export en cours...\n\nDans une vraie application, cela générerait un fichier CSV/PDF avec toutes vos missions pour Pôle emploi ou votre comptable."
            );
          }}
        >
          <Download className="h-4 w-4" />
          Exporter pour Pôle emploi
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
              Cachets ce mois
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-[#F0FF00]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {totalGrossThisMonth.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0
              })}
            </div>
            <p className="mt-1 text-xs text-[#F5F5F5]/60">
              {missionsThisMonth.length} mission
              {missionsThisMonth.length > 1 ? "s" : ""} ce mois-ci
            </p>
          </CardContent>
        </Card>

        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
              Total 12 derniers mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {totalGross12Months.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0
              })}
            </div>
            <p className="mt-1 text-xs text-[#F5F5F5]/60">
              {missionsLast12Months.length} mission
              {missionsLast12Months.length > 1 ? "s" : ""} sur 12 mois
            </p>
          </CardContent>
        </Card>

        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
              Heures cumulées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="text-2xl font-semibold">
                {totalHours12Months.toFixed(1)} h
              </span>
              <span className="text-xs text-[#F5F5F5]/60">objectif 507 h</span>
            </div>
            <div
              className="h-3 w-full overflow-hidden rounded-full bg-[rgba(15,23,42,0.8)]"
              role="progressbar"
              aria-valuenow={totalHours12Months}
              aria-valuemin={0}
              aria-valuemax={507}
              aria-label="Heures cumulées vers l'objectif de 507 h"
            >
              <div
                className="h-full rounded-full bg-[#F0FF00] transition-[width] duration-500 ease-out"
                style={{ width: `${progressHours}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-[#F5F5F5]/60">
              {droitsOuverts
                ? "Objectif atteint pour l'ouverture des droits."
                : `Encore ${heuresRestantes.toFixed(1)} h à cumuler.`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
              Allocation ARE estimée
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {allocationEstimee.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0
              })}
            </div>
            <p className="mt-1 text-xs text-[#F5F5F5]/60">
              Estimation indicative basée sur 35 % des cachets.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
                Statut Pôle emploi
              </CardTitle>
              <p className="mt-1 text-xs text-[#F5F5F5]/60">
                Suivi de l&apos;ouverture de tes droits ARE.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-semibold">
              {droitsOuverts ? (
                <>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-emerald-400">
                    Droits ARE ouverts ({totalHours12Months.toFixed(1)} h)
                  </span>
                </>
              ) : (
                <>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
                    <AlertCircle className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-amber-300">
                    Droits en cours d&apos;acquisition ({heuresRestantes.toFixed(1)} h
                    restantes)
                  </span>
                </>
              )}
            </div>
            <div className="rounded-md border border-[rgba(245,245,245,0.15)] bg-[rgba(15,23,42,0.85)] px-3 py-3 text-xs text-[#E5E7EB]">
              <p className="mb-1 font-medium text-[#F5F5F5]">
                Rappel des règles principales
              </p>
              <ul className="space-y-1 text-[11px] text-[#E5E7EB]/80">
                <li>
                  • 507 heures minimum sur 12 mois glissants pour ouvrir les droits.
                </li>
                <li>
                  • Certaines heures peuvent être majorées selon le type de mission et
                  la convention.
                </li>
                <li>
                  • Vérifie toujours tes informations sur ton espace Pôle emploi.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
              Évolution des cachets (8 derniers mois)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#E5E7EB", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.4)" }}
                />
                <YAxis
                  tick={{ fill: "#E5E7EB", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.4)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    border: "1px solid rgba(148,163,184,0.4)",
                    borderRadius: 12,
                    fontSize: 12
                  }}
                  labelStyle={{ color: "#F9FAFB" }}
                  formatter={(value: number | string | undefined) => {
                    const n = typeof value === "number" ? value : Number(value ?? 0);
                    return `${n.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: 0
                    })}`;
                  }}
                />
                <Legend
                  wrapperStyle={{ color: "#E5E7EB", fontSize: 11 }}
                  iconSize={8}
                />
                <Bar dataKey="cachets" name="Cachets (brut)" fill="#F0FF00" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
              Heures cumulées par mois
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#E5E7EB", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.4)" }}
                />
                <YAxis
                  tick={{ fill: "#E5E7EB", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.4)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    border: "1px solid rgba(148,163,184,0.4)",
                    borderRadius: 12,
                    fontSize: 12
                  }}
                  labelStyle={{ color: "#F9FAFB" }}
                  formatter={(value: number | string | undefined) => {
                    const n = typeof value === "number" ? value : Number(value ?? 0);
                    return `${n.toFixed(1)} h`;
                  }}
                />
                <Legend
                  wrapperStyle={{ color: "#E5E7EB", fontSize: 11 }}
                  iconSize={8}
                />
                <Line
                  type="monotone"
                  dataKey="heuresCumulees"
                  name="Heures cumulées"
                  stroke="#F0FF00"
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 1, stroke: "#0F172A" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

