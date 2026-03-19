import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Download, Filter, Pencil, Plus, Trash2 } from "lucide-react";
import type { IntermittenceMission } from "./intermittence-types";

interface IntermittenceMissionsProps {
  intermittenceMissions: IntermittenceMission[];
  setIntermittenceMissions: (missions: IntermittenceMission[]) => void;
  onAddMission?: () => void;
  onEditMission?: (mission: IntermittenceMission) => void;
  onDeleteMission?: (id: string) => void;
}

const MONTH_OPTIONS = [
  { value: "all", label: "Tous les mois" },
  { value: "0", label: "Janvier" },
  { value: "1", label: "Février" },
  { value: "2", label: "Mars" },
  { value: "3", label: "Avril" },
  { value: "4", label: "Mai" },
  { value: "5", label: "Juin" },
  { value: "6", label: "Juillet" },
  { value: "7", label: "Août" },
  { value: "8", label: "Septembre" },
  { value: "9", label: "Octobre" },
  { value: "10", label: "Novembre" },
  { value: "11", label: "Décembre" }
];

export function IntermittenceMissions({
  intermittenceMissions,
  setIntermittenceMissions,
  onAddMission,
  onEditMission,
  onDeleteMission
}: IntermittenceMissionsProps) {
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    intermittenceMissions.forEach((m) => {
      const d = new Date(m.date);
      if (!isNaN(d.getTime())) years.add(d.getFullYear());
    });
    const currentYear = new Date().getFullYear();
    if (years.size === 0) years.add(currentYear);
    return Array.from(years)
      .sort((a, b) => b - a)
      .map((y) => ({ value: String(y), label: String(y) }));
  }, [intermittenceMissions]);

  const handleExport = () => {
    alert(
      "Export en cours...\n\nDans une vraie application, cela générerait un fichier CSV/PDF avec toutes vos missions pour Pôle emploi ou votre comptable."
    );
  };

  const filteredMissions = useMemo(() => {
    return [...intermittenceMissions]
      .filter((m) => {
        if (monthFilter === "all") return true;
        const d = new Date(m.date);
        return d.getMonth().toString() === monthFilter;
      })
      .filter((m) => {
        if (yearFilter === "all") return true;
        const d = new Date(m.date);
        return d.getFullYear().toString() === yearFilter;
      })
      .sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return db - da;
      });
  }, [intermittenceMissions, monthFilter, yearFilter]);

  const totalMissions = filteredMissions.length;
  const totalHours = filteredMissions.reduce(
    (sum, m) => sum + (m.hours || 0),
    0
  );
  const totalGross = filteredMissions.reduce(
    (sum, m) => sum + (m.grossAmount || 0),
    0
  );
  const totalCharges = filteredMissions.reduce(
    (sum, m) => sum + (m.charges || 0),
    0
  );
  const totalNet = filteredMissions.reduce(
    (sum, m) => sum + (m.netAmount || 0),
    0
  );

  const handleInternalDelete = (id: string) => {
    if (onDeleteMission) {
      onDeleteMission(id);
      return;
    }
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Voulez-vous vraiment supprimer cette mission ? Cette action est irréversible."
      )
    ) {
      return;
    }
    setIntermittenceMissions(
      intermittenceMissions.filter((m) => m.id !== id)
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="mb-1 text-xl font-semibold tracking-tight text-[#F5F5F5]">
            Missions &amp; cachets
          </h2>
          <p className="text-xs text-[#F5F5F5]/70">
            Liste complète de tes missions, filtrable par mois et par type.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2 rounded-full border-[rgba(245,245,245,0.3)] bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#F5F5F5] hover:bg-[rgba(245,245,245,0.08)]"
          >
            <Download className="h-4 w-4" />
            Exporter
          </Button>
          <Button
            type="button"
            onClick={onAddMission}
            className="flex items-center gap-2 rounded-full bg-[#F0FF00] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#101010] hover:bg-[#F0FF00]/90"
          >
            <Plus className="h-4 w-4" />
            Ajouter une mission
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
              Missions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalMissions}</div>
            <p className="mt-1 text-xs text-[#F5F5F5]/60">
              {totalHours.toFixed(1)} h cumulées
            </p>
          </CardContent>
        </Card>

        <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
              Montants (brut → charges → net)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-[#F5F5F5]/60">Brut</span>
                <span className="font-semibold tabular-nums">
                  {totalGross.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                    maximumFractionDigits: 0
                  })}
                </span>
              </div>
              <span className="text-[#F5F5F5]/40" aria-hidden>−</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-[#F5F5F5]/60">Charges</span>
                <span className="font-medium tabular-nums text-[#F5F5F5]/90">
                  {totalCharges.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                    maximumFractionDigits: 0
                  })}
                </span>
              </div>
              <span className="text-[#F5F5F5]/40" aria-hidden>=</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-[#F5F5F5]/60">Net</span>
                <span className="text-lg font-semibold tabular-nums text-[#F0FF00]">
                  {totalNet.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                    maximumFractionDigits: 0
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[rgba(245,245,245,0.1)] bg-[rgba(44,44,46,0.7)] text-[#F5F5F5] backdrop-blur-xl">
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(15,23,42,0.9)]">
              <Filter className="h-3.5 w-3.5 text-[#F0FF00]" />
            </span>
            <div>
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-[#F5F5F5]/70">
                Filtres
              </CardTitle>
              <p className="text-xs text-[#F5F5F5]/60">
                Affine ta vue par mois et par année.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="h-8 min-w-0 w-[155px] border-[rgba(245,245,245,0.18)] bg-[rgba(15,23,42,0.9)] text-xs text-[#F5F5F5]">
                <SelectValue placeholder="Mois" />
              </SelectTrigger>
              <SelectContent className="border-[rgba(245,245,245,0.18)] bg-[#020617] text-[#F5F5F5]">
                {MONTH_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="h-8 min-w-0 w-[155px] border-[rgba(245,245,245,0.18)] bg-[rgba(15,23,42,0.9)] text-xs text-[#F5F5F5]">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent className="border-[rgba(245,245,245,0.18)] bg-[#020617] text-[#F5F5F5]">
                <SelectItem value="all">Toutes les années</SelectItem>
                {yearOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-[rgba(248,250,252,0.08)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[rgba(148,163,184,0.3)] bg-[rgba(15,23,42,0.9)]">
                  <th className="whitespace-nowrap px-4 py-2 text-left text-xs font-medium text-[#E5E7EB]/80">
                    Date
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 text-left text-xs font-medium text-[#E5E7EB]/80">
                    Employeur
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 text-left text-xs font-medium text-[#E5E7EB]/80">
                    Mission
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 text-right text-xs font-medium text-[#E5E7EB]/80">
                    Heures
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 text-right text-xs font-medium text-[#E5E7EB]/80">
                    Brut
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 text-right text-xs font-medium text-[#E5E7EB]/80">
                    Charges
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 text-right text-xs font-medium text-[#E5E7EB]/80">
                    Net
                  </th>
                  <th className="whitespace-nowrap px-4 py-2 text-right text-xs font-medium text-[#E5E7EB]/80">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMissions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-xs text-[#E5E7EB]/70"
                    >
                      Aucune mission trouvée avec ces filtres. Ajoute une mission ou
                      élargis ta recherche.
                    </td>
                  </tr>
                ) : (
                  filteredMissions.map((mission) => (
                    <tr
                      key={mission.id}
                      className="border-b border-[rgba(15,23,42,0.9)] bg-[rgba(15,23,42,0.7)] hover:bg-[rgba(15,23,42,0.95)]"
                    >
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-[#E5E7EB]">
                        {new Date(mission.date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="max-w-[180px] px-4 py-2 text-xs text-[#E5E7EB]">
                        <span className="line-clamp-2">{mission.employer}</span>
                      </td>
                      <td className="max-w-[180px] px-4 py-2 text-xs text-[#E5E7EB]/80">
                        <span className="line-clamp-2">{mission.type}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-xs text-[#E5E7EB]">
                        {mission.hours.toFixed(1)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-xs text-[#E5E7EB]">
                        {mission.grossAmount.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          maximumFractionDigits: 0
                        })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-xs text-[#E5E7EB]/80">
                        {mission.charges.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          maximumFractionDigits: 0
                        })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-xs text-[#E5E7EB]">
                        {mission.netAmount.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          maximumFractionDigits: 0
                        })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-xs">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0 rounded-full border-[rgba(248,250,252,0.3)] bg-transparent text-[#F5F5F5] hover:bg-[rgba(248,250,252,0.08)]"
                            onClick={() => onEditMission?.(mission)}
                            aria-label="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0 rounded-full border-[rgba(248,113,113,0.4)] bg-transparent text-rose-300 hover:bg-[rgba(127,29,29,0.6)]"
                            onClick={() => handleInternalDelete(mission.id)}
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

