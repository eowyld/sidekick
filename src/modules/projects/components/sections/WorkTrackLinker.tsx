"use client";

import { useState } from "react";
import { usePostHog } from "posthog-js/react";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useEditionData } from "@/hooks/useEditionData";
import type { Project } from "@/lib/sidekick-store";
import { Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WorkTrackLinkerProps {
  project: Project;
}

export function WorkTrackLinker({ project }: WorkTrackLinkerProps) {
  const posthog = usePostHog();
  const { tracks, setTracks } = usePhonoData();
  const { works, setWorks } = useEditionData();
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [selectedWorkId, setSelectedWorkId] = useState("");

  const linkedTracks = tracks.filter((t) => project.linkedTracks.includes(t.id));
  const linkedWorks = works.filter((w) => project.linkedWorks.includes(w.id));

  // Paires existantes : titres qui ont déjà une oeuvre liée
  const existingPairs = linkedTracks
    .filter((t) => t.linkedWorkId && linkedWorks.some((w) => w.id === t.linkedWorkId))
    .map((t) => ({
      track: t,
      work: linkedWorks.find((w) => w.id === t.linkedWorkId)!,
    }));

  const handleLink = () => {
    if (!selectedTrackId || !selectedWorkId) return;

    setTracks((prev) =>
      prev.map((t) =>
        t.id === selectedTrackId ? { ...t, linkedWorkId: selectedWorkId } : t
      )
    );
    setWorks((prev) =>
      prev.map((w) =>
        w.id === selectedWorkId
          ? { ...w, linkedTrackIds: [...new Set([...(w.linkedTrackIds ?? []), selectedTrackId])] }
          : w
      )
    );

    posthog?.capture("work_track_linked", { module: "edition" });
    setSelectedTrackId("");
    setSelectedWorkId("");
  };

  const handleUnlink = (trackId: string, workId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, linkedWorkId: undefined } : t))
    );
    setWorks((prev) =>
      prev.map((w) =>
        w.id === workId
          ? { ...w, linkedTrackIds: (w.linkedTrackIds ?? []).filter((id) => id !== trackId) }
          : w
      )
    );
  };

  // Titres sans oeuvre liée parmi les liés au projet
  const unlinkedTracks = linkedTracks.filter((t) => !t.linkedWorkId || !linkedWorks.some((w) => w.id === t.linkedWorkId));

  if (linkedTracks.length === 0 || linkedWorks.length === 0) return null;

  return (
    <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Link2 size={15} className="text-[#F0FF00]/60" />
        <h2 className="text-[13px] font-medium text-[#F5F5F5]/70">Associations Titre ↔ Oeuvre</h2>
      </div>

      {/* Associations existantes */}
      {existingPairs.length > 0 && (
        <div className="space-y-1">
          {existingPairs.map(({ track, work }) => (
            <div key={track.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(240,255,0,0.04)] border border-[rgba(240,255,0,0.12)]">
              <span className="text-[12px] text-[#F5F5F5]/80 flex-1">{track.title}</span>
              <span className="text-[10px] text-[#F0FF00]/50">↔</span>
              <span className="text-[12px] text-[#F5F5F5]/80 flex-1 text-right">{work.title}</span>
              <button
                onClick={() => handleUnlink(track.id, work.id)}
                className="ml-2 text-[#F5F5F5]/20 hover:text-red-400 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Créer une nouvelle association */}
      {unlinkedTracks.length > 0 && linkedWorks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-[#F5F5F5]/30">Associer un titre à une oeuvre</p>
          <div className="flex items-center gap-2">
            <Select value={selectedTrackId} onValueChange={setSelectedTrackId}>
              <SelectTrigger className="flex-1 h-8 text-[12px] bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5]">
                <SelectValue placeholder="Titre..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
                {unlinkedTracks.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-[12px] text-[#F5F5F5]/70">
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[#F5F5F5]/30 text-[11px]">↔</span>
            <Select value={selectedWorkId} onValueChange={setSelectedWorkId}>
              <SelectTrigger className="flex-1 h-8 text-[12px] bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5]">
                <SelectValue placeholder="Oeuvre..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
                {linkedWorks.map((w) => (
                  <SelectItem key={w.id} value={w.id} className="text-[12px] text-[#F5F5F5]/70">
                    {w.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="xs"
              onClick={handleLink}
              disabled={!selectedTrackId || !selectedWorkId}
              className="h-8 flex-shrink-0"
            >
              <Link2 size={12} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
