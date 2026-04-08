"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSidekickData } from "@/hooks/useSidekickData";
import type { Project } from "@/lib/sidekick-store";
import { Mic2, Plus, Link, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LiveSectionProps {
  project: Project;
}

export function LiveSection({ project }: LiveSectionProps) {
  const router = useRouter();
  const { data, setData } = useSidekickData();
  const [linkDateOpen, setLinkDateOpen] = useState(false);
  const [linkRepetOpen, setLinkRepetOpen] = useState(false);

  const linkedTourDates = (data.live?.tourDates ?? []).filter((d) => project.linkedTourDates.includes(d.id));
  const linkedRehearsals = (data.live?.rehearsals ?? []).filter((r) => project.linkedRehearsals.includes(r.id));
  const availableTourDates = (data.live?.tourDates ?? []).filter((d) => !project.linkedTourDates.includes(d.id));
  const availableRehearsals = (data.live?.rehearsals ?? []).filter((r) => !project.linkedRehearsals.includes(r.id));

  const totalDates = linkedTourDates.length;
  const playedDates = linkedTourDates.filter((d) => d.status === "done" || d.status === "played").length;

  const updateLinks = (updates: Partial<Pick<Project, "linkedTourDates" | "linkedRehearsals">>) => {
    setData((prev) => ({
      ...prev,
      projects: {
        projects: prev.projects.projects.map((p) =>
          p.id === project.id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
      },
    }));
  };

  return (
    <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Mic2 size={15} className="text-[#F5F5F5]/50" />
        <h2 className="text-[13px] font-medium text-[#F5F5F5]/70">Live</h2>
        <span className="text-[11px] text-[#F5F5F5]/30">
          {totalDates + linkedRehearsals.length} élément{totalDates + linkedRehearsals.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Progression dates */}
      {totalDates > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-[#F5F5F5]/40">
            <span>Dates jouées</span>
            <span>{playedDates}/{totalDates}</span>
          </div>
          <div className="h-1 rounded-full bg-[rgba(245,245,245,0.06)]">
            <div
              className="h-1 rounded-full bg-[#F0FF00]/60"
              style={{ width: `${totalDates > 0 ? (playedDates / totalDates) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Représentations */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#F5F5F5]/30 uppercase tracking-wider">Représentations</p>
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" onClick={() => setLinkDateOpen(true)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Link size={10} className="mr-1" /> Lier
            </Button>
            <Button size="xs" variant="ghost" onClick={() => router.push(`/live/representations?projectId=${project.id}`)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Plus size={10} className="mr-1" /> Créer
            </Button>
          </div>
        </div>
        {linkedTourDates.length === 0 ? (
          <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucune date liée</p>
        ) : (
          <div className="space-y-1">
            {linkedTourDates.map((d) => (
              <div
                key={d.id}
                onClick={() => router.push("/live/representations")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[rgba(245,245,245,0.06)] hover:bg-[rgba(245,245,245,0.04)] cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[#F5F5F5]/80 truncate">{(d.venue as string) || d.city}</p>
                  <p className="text-[10px] text-[#F5F5F5]/40">{d.city} · {d.date}</p>
                </div>
                <ExternalLink size={10} className="text-[#F5F5F5]/20 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Répétitions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#F5F5F5]/30 uppercase tracking-wider">Répétitions</p>
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" onClick={() => setLinkRepetOpen(true)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Link size={10} className="mr-1" /> Lier
            </Button>
            <Button size="xs" variant="ghost" onClick={() => router.push(`/live/repetitions?projectId=${project.id}`)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Plus size={10} className="mr-1" /> Créer
            </Button>
          </div>
        </div>
        {linkedRehearsals.length === 0 ? (
          <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucune répétition liée</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {linkedRehearsals.map((r) => (
              <div
                key={r.id}
                onClick={() => router.push("/live/repetitions")}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] cursor-pointer hover:bg-[rgba(245,245,245,0.06)] transition-colors"
              >
                <p className="text-[12px] text-[#F5F5F5]/70">{(r.label as string) || r.date}</p>
                <ExternalLink size={10} className="text-[#F5F5F5]/20" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog représentations */}
      <Dialog open={linkDateOpen} onOpenChange={setLinkDateOpen}>
        <DialogContent className="max-w-sm bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
          <DialogHeader><DialogTitle className="text-[#F5F5F5] text-[14px]">Lier une représentation</DialogTitle></DialogHeader>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {availableTourDates.length === 0 ? (
              <p className="text-[12px] text-[#F5F5F5]/30 text-center py-4">Toutes les dates sont déjà liées</p>
            ) : availableTourDates.map((d) => (
              <button
                key={d.id}
                onClick={() => { updateLinks({ linkedTourDates: [...project.linkedTourDates, d.id] }); setLinkDateOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.06)] hover:text-[#F5F5F5] transition-colors"
              >
                {(d.venue as string) || d.city} — {d.date}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog répétitions */}
      <Dialog open={linkRepetOpen} onOpenChange={setLinkRepetOpen}>
        <DialogContent className="max-w-sm bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
          <DialogHeader><DialogTitle className="text-[#F5F5F5] text-[14px]">Lier une répétition</DialogTitle></DialogHeader>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {availableRehearsals.length === 0 ? (
              <p className="text-[12px] text-[#F5F5F5]/30 text-center py-4">Toutes les répétitions sont déjà liées</p>
            ) : availableRehearsals.map((r) => (
              <button
                key={r.id}
                onClick={() => { updateLinks({ linkedRehearsals: [...project.linkedRehearsals, r.id] }); setLinkRepetOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.06)] hover:text-[#F5F5F5] transition-colors"
              >
                {(r.label as string) || r.date}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
