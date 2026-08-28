"use client";

import { useState } from "react";
import type { Project } from "@/lib/sidekick-store";
import { useProjectsData } from "@/hooks/useProjectsData";
import { useProjectBudgetData } from "@/hooks/useProjectBudgetData";
import { useProjectMarketingData } from "@/hooks/useProjectMarketingData";
import { useProjectAdminData } from "@/hooks/useProjectAdminData";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, X, ChevronDown, Pencil } from "lucide-react";

function fmt(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

function CockpitCard({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-4 hover:border-[rgba(245,245,245,0.18)] transition-colors"
    >
      <div className="text-[11px] uppercase tracking-wider text-[#F5F5F5]/40 mb-2">{label}</div>
      {children}
    </button>
  );
}

export function OverviewTab({
  project,
  onGoTab,
}: {
  project: Project;
  onGoTab: (tab: string) => void;
}) {
  const { setProjects } = useProjectsData();
  const { kpis, loading: budgetLoading } = useProjectBudgetData(project.id);
  const { campaigns, events, loading: marketingLoading } = useProjectMarketingData(project.id);
  const { contracts, loading: adminLoading } = useProjectAdminData(project.id);
  const keyDates = project.keyDates ?? [];
  const linkedStatutIds = project.linkedStatutIds ?? [];
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  const updateProject = (updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      )
    );
  };

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) =>
      updateProject({ images: [...project.images, ev.target?.result as string] });
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (index: number) =>
    updateProject({ images: project.images.filter((_, i) => i !== index) });

  const handleSaveNotes = () => {
    updateProject({ notes: notesValue });
    setEditingNotes(false);
  };

  return (
    <div className="space-y-6">
      {/* Cockpit — 4 cartes */}
      <div className="grid grid-cols-2 gap-3">
        <CockpitCard label="🎛️ Artistique" onClick={() => onGoTab("creation")}>
          <p className="text-[12px] text-[#F5F5F5]/70 leading-relaxed">
            🎵 {project.linkedTracks.length} titre{project.linkedTracks.length !== 1 ? "s" : ""}<br />
            ✍️ {project.linkedWorks.length} œuvre{project.linkedWorks.length !== 1 ? "s" : ""}<br />
            🎤 {project.linkedTourDates.length} date{project.linkedTourDates.length !== 1 ? "s" : ""}
          </p>
        </CockpitCard>
        <CockpitCard label="💶 Budget & finances" onClick={() => onGoTab("budget")}>
          {budgetLoading ? (
            <p className="text-[12px] text-[#F5F5F5]/20">…</p>
          ) : kpis.totalPlannedExpenses === 0 && kpis.totalRealExpenses === 0 ? (
            <p className="text-[13px] text-[#F5F5F5]/30 italic">Budget non configuré</p>
          ) : (
            <p className="text-[12px] text-[#F5F5F5]/70 leading-relaxed">
              📋 {fmt(kpis.totalPlannedExpenses)} prévu<br />
              💸 {fmt(kpis.totalRealExpenses)} dépensé<br />
              <span className={kpis.balance >= 0 ? "text-green-400" : "text-red-400"}>
                {kpis.balance >= 0 ? "+" : ""}{fmt(kpis.balance)} balance
              </span>
            </p>
          )}
        </CockpitCard>
        <CockpitCard label="📣 Campagne marketing" onClick={() => onGoTab("marketing")}>
          {marketingLoading ? (
            <p className="text-[12px] text-[#F5F5F5]/20">…</p>
          ) : keyDates.length === 0 && events.length === 0 && campaigns.length === 0 ? (
            <p className="text-[13px] text-[#F5F5F5]/30 italic">Campagne non configurée</p>
          ) : (
            <p className="text-[12px] text-[#F5F5F5]/70 leading-relaxed">
              🚩 {keyDates.length} temps fort{keyDates.length !== 1 ? "s" : ""}<br />
              📅 {events.length} publication{events.length !== 1 ? "s" : ""}<br />
              📧 {campaigns.length} campagne{campaigns.length !== 1 ? "s" : ""}
            </p>
          )}
        </CockpitCard>
        <CockpitCard label="📄 Admin" onClick={() => onGoTab("admin")}>
          {adminLoading ? (
            <p className="text-[12px] text-[#F5F5F5]/20">…</p>
          ) : linkedStatutIds.length === 0 && contracts.length === 0 ? (
            <p className="text-[13px] text-[#F5F5F5]/30 italic">Admin non configuré</p>
          ) : (
            <p className="text-[12px] text-[#F5F5F5]/70 leading-relaxed">
              🏛️ {linkedStatutIds.length} statut{linkedStatutIds.length !== 1 ? "s" : ""} lié{linkedStatutIds.length !== 1 ? "s" : ""}<br />
              📝 {contracts.length} contrat{contracts.length !== 1 ? "s" : ""}
            </p>
          )}
        </CockpitCard>
      </div>

      {/* Galerie */}
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setGalleryOpen((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-[13px] font-medium text-[#F5F5F5]/70 hover:text-[#F5F5F5]"
        >
          <span>Images & mood board</span>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#F5F5F5]/30">
              {project.images.length} image{project.images.length !== 1 ? "s" : ""}
            </span>
            <ChevronDown
              size={14}
              className={`transition-transform ${galleryOpen ? "rotate-180" : ""}`}
            />
          </div>
        </button>
        {galleryOpen && (
          <div className="px-5 pb-5">
            <div className="flex flex-wrap gap-2">
              {project.images.map((img, i) => (
                <div
                  key={i}
                  className="relative group w-24 h-24 rounded-lg overflow-hidden border border-[rgba(245,245,245,0.08)]"
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/60 rounded-full p-0.5"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
              <label className="flex w-24 h-24 flex-col items-center justify-center rounded-lg border border-dashed border-[rgba(245,245,245,0.15)] text-[#F5F5F5]/30 text-[11px] gap-1 cursor-pointer hover:border-[rgba(245,245,245,0.3)] transition-colors">
                <ImagePlus size={16} />
                Ajouter
                <input type="file" accept="image/*" onChange={handleAddImage} className="hidden" />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-[#F5F5F5]/70">Notes</h2>
          {!editingNotes && (
            <button
              onClick={() => {
                setNotesValue(project.notes);
                setEditingNotes(true);
              }}
              className="text-[11px] text-[#F5F5F5]/30 hover:text-[#F5F5F5] flex items-center gap-1"
            >
              <Pencil size={11} /> Modifier
            </button>
          )}
        </div>
        {editingNotes ? (
          <div className="space-y-2">
            <Textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] resize-none text-[13px]"
              rows={4}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditingNotes(false)}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleSaveNotes}>
                Enregistrer
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-[#F5F5F5]/50 whitespace-pre-wrap min-h-[2rem]">
            {project.notes || <span className="italic text-[#F5F5F5]/20">Pas de notes</span>}
          </p>
        )}
      </div>
    </div>
  );
}
