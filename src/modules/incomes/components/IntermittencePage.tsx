"use client";

import { useMemo, useState } from "react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import Link from "next/link";
import { usePostHog } from "posthog-js/react";
import { useIncomesData } from "@/hooks/useIncomesData";
import { useAdminData } from "@/hooks/useAdminData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { EmptyState } from "@/components/ui/empty-state";
import { Briefcase } from "lucide-react";
import { mutate } from "swr";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IntermittenceDashboard } from "./IntermittenceDashboard";
import { IntermittenceMissions } from "./IntermittenceMissions";
import type { IntermittenceMission } from "./intermittence-types";
import { IntermittenceModal } from "./IntermittenceModal";

type IntermittenceView = "dashboard" | "missions";

const ALL_STATUTS = "__all__";

export function IntermittencePage() {
  const { confirm, confirmDialog } = useConfirm();
  const posthog = usePostHog();
  const { missions: allMissions, setMissions: setIntermittenceMissions, loading, error } = useIncomesData();
  const { statuses, loading: statusesLoading } = useAdminData();

  const [currentView, setCurrentView] = useState<IntermittenceView>("dashboard");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<IntermittenceMission | null>(null);
  const [selectedStatutId, setSelectedStatutId] = useLocalStorage<string>(
    "incomes:selected-intermittent-statut",
    ALL_STATUTS
  );

  const intermittentStatuts = useMemo(
    () => statuses.filter((s) => s.type === "intermittent"),
    [statuses]
  );

  // Auto-sélection si un seul statut intermittent et aucune sélection explicite
  const effectiveStatutId = useMemo(() => {
    if (selectedStatutId !== ALL_STATUTS) return selectedStatutId;
    if (intermittentStatuts.length === 1) return intermittentStatuts[0].id;
    return ALL_STATUTS;
  }, [selectedStatutId, intermittentStatuts]);

  const selectedStatut = useMemo(
    () => (effectiveStatutId !== ALL_STATUTS ? statuses.find((s) => s.id === effectiveStatutId) : null),
    [effectiveStatutId, statuses]
  );

  // Missions filtrées : si statut sélectionné, on garde celles liées à ce statut
  // + les missions legacy (sans lien) pour ne pas les perdre de vue
  const filteredMissions = useMemo(() => {
    if (effectiveStatutId === ALL_STATUTS) return allMissions;
    return allMissions.filter(
      (m) => !m.statutJuridiqueId || m.statutJuridiqueId === effectiveStatutId
    );
  }, [allMissions, effectiveStatutId]);

  if (loading || statusesLoading) return <PageLoader />;
  if (error) return (
    <PageError
      title="Impossible de charger tes données d'intermittence"
      description="Vérifie ta connexion ou réessaie dans quelques instants."
      onRetry={() => mutate("user_incomes")}
    />
  );

  const handleNavigate = (view: string) => {
    setCurrentView(view === "intermittence-missions" ? "missions" : "dashboard");
  };

  const handleAddMissionClick = () => {
    setEditingMission(null);
    setModalOpen(true);
  };

  const handleEditMission = (mission: IntermittenceMission) => {
    setEditingMission(mission);
    setModalOpen(true);
  };

  const handleSaveMission = (mission: Omit<IntermittenceMission, "id">) => {
    if (editingMission) {
      setIntermittenceMissions((prev) =>
        prev.map((m) => (m.id === editingMission.id ? { ...editingMission, ...mission } : m))
      );
    } else {
      const newMission: IntermittenceMission = {
        ...mission,
        id: crypto.randomUUID(),
        statutJuridiqueId: effectiveStatutId !== ALL_STATUTS ? effectiveStatutId : undefined,
      };
      setIntermittenceMissions((prev) => [newMission, ...prev]);
      posthog?.capture("mission_created", { module: "incomes" });
      posthog?.capture("item_created", { module: "incomes" });
    }
    setModalOpen(false);
    setEditingMission(null);
  };

  const handleDeleteMission = async (id: string) => {
    const ok = await confirm({
      title: "Supprimer cette mission ?",
      description: "La mission sera définitivement supprimée.",
    });
    if (!ok) return;
    setIntermittenceMissions((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-6 bg-[#101010] px-2 py-4 text-[#F5F5F5] md:px-4 md:py-6">
      <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">
            Intermittence
          </h1>
          <p className="text-sm text-[#F5F5F5]/70">
            Suivi de tes missions, cachets et heures pour l&apos;ARE.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sélecteur de statut — visible si au moins un statut intermittent */}
          {intermittentStatuts.length > 0 ? (
            <div className="flex items-center gap-2">
              {intermittentStatuts.length > 1 ? (
                <Select
                  value={effectiveStatutId}
                  onValueChange={(v) => setSelectedStatutId(v)}
                >
                  <SelectTrigger className="h-8 min-w-[160px] border-[rgba(245,245,245,0.15)] bg-[rgba(44,44,46,0.7)] text-xs text-[#F5F5F5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_STATUTS}>Toutes les missions</SelectItem>
                    {intermittentStatuts.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Link
                  href={`/admin/statuts/${intermittentStatuts[0].id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(240,255,0,0.25)] bg-[rgba(240,255,0,0.06)] px-2.5 py-1 text-[11px] font-medium text-[#F0FF00]/80 transition hover:bg-[rgba(240,255,0,0.12)]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F0FF00]/60" aria-hidden />
                  {intermittentStatuts[0].nom}
                </Link>
              )}
            </div>
          ) : (
            <Link
              href="/admin/statuts/new?type=intermittent"
              className="text-[11px] text-[#F5F5F5]/40 underline underline-offset-2 hover:text-[#F5F5F5]/70"
            >
              Créer un statut intermittent →
            </Link>
          )}

          <div className="inline-flex rounded-full border border-[rgba(245,245,245,0.15)] bg-[rgba(44,44,46,0.7)] px-1 py-1 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setCurrentView("dashboard")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                currentView === "dashboard"
                  ? "bg-[#F0FF00] text-[#101010]"
                  : "text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.08)]"
              }`}
            >
              Vue d&apos;ensemble
            </button>
            <button
              type="button"
              onClick={() => setCurrentView("missions")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                currentView === "missions"
                  ? "bg-[#F0FF00] text-[#101010]"
                  : "text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.08)]"
              }`}
            >
              Missions &amp; cachets
            </button>
          </div>
        </div>
      </header>

      {currentView === "dashboard" ? (
        filteredMissions.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Aucune mission déclarée"
            description="Référence tes missions (concerts, sessions, captations) avec cachet, employeur et AEM : ton suivi d'heures et de cachets s'affichera ici."
            action={{ label: "Ajouter une mission", onClick: handleAddMissionClick }}
          />
        ) : (
          <IntermittenceDashboard
            missions={filteredMissions}
            onNavigate={handleNavigate}
            onAddMission={handleAddMissionClick}
          />
        )
      ) : (
        <IntermittenceMissions
          intermittenceMissions={filteredMissions}
          setIntermittenceMissions={setIntermittenceMissions}
          onAddMission={handleAddMissionClick}
          onEditMission={handleEditMission}
          onDeleteMission={handleDeleteMission}
        />
      )}

      <IntermittenceModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingMission(null);
        }}
        onSave={handleSaveMission}
        mission={editingMission}
        defaultStatutId={effectiveStatutId !== ALL_STATUTS ? effectiveStatutId : undefined}
        selectedStatutName={selectedStatut?.nom}
      />

      {confirmDialog}
    </div>
  );
}

