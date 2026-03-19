"use client";

import { useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { IntermittenceDashboard } from "./IntermittenceDashboard";
import { IntermittenceMissions } from "./IntermittenceMissions";
import type { IntermittenceMission } from "./intermittence-types";
import { IntermittenceModal } from "./IntermittenceModal";

const STORAGE_KEY = "intermittenceMissions";

const INITIAL_MISSIONS: IntermittenceMission[] = [
  {
    id: "1",
    date: "2025-11-08",
    employer: "Théâtre XYZ",
    type: "Spectacle",
    hours: 5,
    grossAmount: 250,
    charges: 50,
    netAmount: 200,
    notes: ""
  },
  {
    id: "2",
    date: "2025-11-12",
    employer: "Studio ABC",
    type: "Répétition rémunérée",
    hours: 3,
    grossAmount: 150,
    charges: 30,
    netAmount: 120,
    notes: ""
  }
];

type IntermittenceView = "dashboard" | "missions";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function IntermittencePage() {
  const [intermittenceMissions, setIntermittenceMissions] = useLocalStorage<
    IntermittenceMission[]
  >(STORAGE_KEY, INITIAL_MISSIONS);

  const [currentView, setCurrentView] = useState<IntermittenceView>("dashboard");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<IntermittenceMission | null>(
    null
  );

  const handleNavigate = (view: string) => {
    if (view === "intermittence-missions") {
      setCurrentView("missions");
    } else {
      setCurrentView("dashboard");
    }
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
        id: generateId()
      };
      setIntermittenceMissions((prev) => [newMission, ...prev]);
    }
    setModalOpen(false);
    setEditingMission(null);
  };

  const handleDeleteMission = (id: string) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Voulez-vous vraiment supprimer cette mission ? Cette action est irréversible."
      )
    ) {
      return;
    }
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
      </header>

      {currentView === "dashboard" ? (
        <IntermittenceDashboard
          missions={intermittenceMissions}
          onNavigate={handleNavigate}
          onAddMission={handleAddMissionClick}
        />
      ) : (
        <IntermittenceMissions
          intermittenceMissions={intermittenceMissions}
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
      />
    </div>
  );
}

