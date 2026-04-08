"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSidekickData } from "@/hooks/useSidekickData";
import type { Project } from "@/lib/sidekick-store";
import { BookOpen, Plus, Link, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const WORK_STATUS_LABELS: Record<string, string> = {
  "in-progress": "En cours",
  finalized: "Finalisé",
  "registered-sacem": "Déposé SACEM",
  "accepted-sacem": "Accepté SACEM",
};

interface EditionSectionProps {
  project: Project;
}

export function EditionSection({ project }: EditionSectionProps) {
  const router = useRouter();
  const { data, setData } = useSidekickData();
  const [linkOpen, setLinkOpen] = useState(false);

  const linkedWorks = (data.edition?.works ?? []).filter((w) => project.linkedWorks.includes(w.id));
  const availableWorks = (data.edition?.works ?? []).filter((w) => !project.linkedWorks.includes(w.id));

  const totalWorks = linkedWorks.length;
  const registeredWorks = linkedWorks.filter((w) => w.status === "registered-sacem" || w.status === "accepted-sacem").length;

  const linkWork = (workId: string) => {
    setData((prev) => ({
      ...prev,
      projects: {
        projects: prev.projects.projects.map((p) =>
          p.id === project.id
            ? { ...p, linkedWorks: [...p.linkedWorks, workId], updatedAt: new Date().toISOString() }
            : p
        ),
      },
    }));
    setLinkOpen(false);
  };

  return (
    <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={15} className="text-[#F5F5F5]/50" />
          <h2 className="text-[13px] font-medium text-[#F5F5F5]/70">Édition</h2>
          <span className="text-[11px] text-[#F5F5F5]/30">{totalWorks} oeuvre{totalWorks !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Progression */}
      {totalWorks > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-[#F5F5F5]/40">
            <span>Oeuvres déposées SACEM</span>
            <span>{registeredWorks}/{totalWorks}</span>
          </div>
          <div className="h-1 rounded-full bg-[rgba(245,245,245,0.06)]">
            <div
              className="h-1 rounded-full bg-[#F0FF00]/60"
              style={{ width: `${totalWorks > 0 ? (registeredWorks / totalWorks) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Oeuvres */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#F5F5F5]/30 uppercase tracking-wider">Oeuvres</p>
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" onClick={() => setLinkOpen(true)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Link size={10} className="mr-1" /> Lier
            </Button>
            <Button size="xs" variant="ghost" onClick={() => router.push(`/edition?projectId=${project.id}`)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Plus size={10} className="mr-1" /> Créer
            </Button>
          </div>
        </div>
        {linkedWorks.length === 0 ? (
          <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucune oeuvre liée</p>
        ) : (
          <div className="space-y-1">
            {linkedWorks.map((work) => {
              const linkedTracks = (data.phono?.tracks ?? []).filter((t) => (work.linkedTrackIds ?? []).includes(t.id));
              return (
                <div
                  key={work.id}
                  onClick={() => router.push("/edition")}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[rgba(245,245,245,0.06)] hover:bg-[rgba(245,245,245,0.04)] cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-[#F5F5F5]/80 truncate">{work.title}</p>
                    {linkedTracks.length > 0 && (
                      <p className="text-[10px] text-[#F0FF00]/50 truncate">
                        ↔ {linkedTracks.map((t) => t.title).join(", ")}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-[#F5F5F5]/30 flex-shrink-0">
                    {WORK_STATUS_LABELS[work.status] ?? work.status}
                  </span>
                  <ExternalLink size={10} className="text-[#F5F5F5]/20 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-sm bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
          <DialogHeader>
            <DialogTitle className="text-[#F5F5F5] text-[14px]">Lier une oeuvre</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {availableWorks.length === 0 ? (
              <p className="text-[12px] text-[#F5F5F5]/30 text-center py-4">Toutes les oeuvres sont déjà liées</p>
            ) : availableWorks.map((w) => (
              <button
                key={w.id}
                onClick={() => linkWork(w.id)}
                className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.06)] hover:text-[#F5F5F5] transition-colors"
              >
                {w.title}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
