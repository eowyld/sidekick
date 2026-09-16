"use client";

import { useRouter } from "next/navigation";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useEditionData } from "@/hooks/useEditionData";
import { useProjectLinks } from "@/modules/projects/hooks/useProjectLinks";
import type { Project } from "@/lib/sidekick-store";
import { Music2, Plus, Link, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_LABELS: Record<string, string> = {
  en_production: "En production",
  mixe: "Mixé",
  masterise: "Masterisé",
  publie: "Publié",
};

interface PhonoSectionProps {
  project: Project;
}

export function PhonoSection({ project }: PhonoSectionProps) {
  const router = useRouter();
  const { albums, tracks, sessions } = usePhonoData();
  const { works } = useEditionData();
  const { updateLinks } = useProjectLinks(project.id);
  const [linkAlbumOpen, setLinkAlbumOpen] = useState(false);
  const [linkTrackOpen, setLinkTrackOpen] = useState(false);
  const [linkSessionOpen, setLinkSessionOpen] = useState(false);

  const linkedAlbums = albums.filter((a) => project.linkedAlbums.includes(a.id));
  const linkedTracks = tracks.filter((t) => project.linkedTracks.includes(t.id));
  const linkedSessions = sessions.filter((s) => project.linkedSessions.includes(s.id));

  const availableAlbums = albums.filter((a) => !project.linkedAlbums.includes(a.id));
  const availableTracks = tracks.filter((t) => !project.linkedTracks.includes(t.id));
  const availableSessions = sessions.filter((s) => !project.linkedSessions.includes(s.id));

  const totalTracks = linkedTracks.length;
  const publishedTracks = linkedTracks.filter((t) => t.status === "publie").length;

  const linkAlbum = (albumId: string) => {
    updateLinks({ linkedAlbums: [...project.linkedAlbums, albumId] });
    setLinkAlbumOpen(false);
  };

  const linkTrack = (trackId: string) => {
    updateLinks({ linkedTracks: [...project.linkedTracks, trackId] });
    setLinkTrackOpen(false);
  };

  const linkSession = (sessionId: string) => {
    updateLinks({ linkedSessions: [...project.linkedSessions, sessionId] });
    setLinkSessionOpen(false);
  };

  return (
    <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music2 size={15} className="text-[#F5F5F5]/50" />
          <h2 className="text-[13px] font-medium text-[#F5F5F5]/70">Phono</h2>
          <span className="text-[11px] text-[#F5F5F5]/30">
            {linkedAlbums.length + linkedTracks.length + linkedSessions.length} élément{linkedAlbums.length + linkedTracks.length + linkedSessions.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Progression titres */}
      {totalTracks > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-[#F5F5F5]/40">
            <span>Titres publiés</span>
            <span>{publishedTracks}/{totalTracks}</span>
          </div>
          <div className="h-1 rounded-full bg-[rgba(245,245,245,0.06)]">
            <div
              className="h-1 rounded-full bg-[#F0FF00]/60"
              style={{ width: `${totalTracks > 0 ? (publishedTracks / totalTracks) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Albums */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#F5F5F5]/30 uppercase tracking-wider">Albums</p>
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" onClick={() => setLinkAlbumOpen(true)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Link size={10} className="mr-1" /> Lier
            </Button>
            <Button size="xs" variant="ghost" onClick={() => router.push(`/phono/catalogue?projectId=${project.id}`)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Plus size={10} className="mr-1" /> Créer
            </Button>
          </div>
        </div>
        {linkedAlbums.length === 0 ? (
          <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucun album lié</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {linkedAlbums.map((album) => (
              <div
                key={album.id}
                onClick={() => router.push("/phono/catalogue")}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] cursor-pointer hover:bg-[rgba(245,245,245,0.06)] transition-colors"
              >
                {album.cover ? (
                  <img src={album.cover} alt={album.title} className="w-6 h-6 rounded object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded bg-[rgba(245,245,245,0.08)]" />
                )}
                <div>
                  <p className="text-[12px] text-[#F5F5F5]/80 leading-tight">{album.title}</p>
                  <p className="text-[10px] text-[#F5F5F5]/30">{STATUS_LABELS[album.status] ?? album.status}</p>
                </div>
                <ExternalLink size={10} className="text-[#F5F5F5]/20 ml-1" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Titres */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#F5F5F5]/30 uppercase tracking-wider">Titres</p>
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" onClick={() => setLinkTrackOpen(true)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Link size={10} className="mr-1" /> Lier
            </Button>
            <Button size="xs" variant="ghost" onClick={() => router.push(`/phono/catalogue?projectId=${project.id}`)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Plus size={10} className="mr-1" /> Créer
            </Button>
          </div>
        </div>
        {linkedTracks.length === 0 ? (
          <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucun titre lié</p>
        ) : (
          <div className="space-y-1">
            {linkedTracks.map((track) => {
              const linkedWork = track.linkedWorkId
                ? works.find((w) => w.id === track.linkedWorkId)
                : null;
              return (
                <div
                  key={track.id}
                  onClick={() => router.push("/phono/catalogue")}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[rgba(245,245,245,0.06)] hover:bg-[rgba(245,245,245,0.04)] cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-[#F5F5F5]/80 truncate">{track.title}</p>
                    {linkedWork && (
                      <p className="text-[10px] text-[#F0FF00]/50 truncate">↔ {linkedWork.title}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-[#F5F5F5]/30 flex-shrink-0">{STATUS_LABELS[track.status ?? ""] ?? ""}</span>
                  <ExternalLink size={10} className="text-[#F5F5F5]/20 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sessions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#F5F5F5]/30 uppercase tracking-wider">Sessions studio</p>
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" onClick={() => setLinkSessionOpen(true)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Link size={10} className="mr-1" /> Lier
            </Button>
            <Button size="xs" variant="ghost" onClick={() => router.push(`/phono/sessions-studio?projectId=${project.id}`)} className="text-[#F5F5F5]/40 hover:text-[#F5F5F5] h-6 text-[11px]">
              <Plus size={10} className="mr-1" /> Créer
            </Button>
          </div>
        </div>
        {linkedSessions.length === 0 ? (
          <p className="text-[12px] text-[#F5F5F5]/20 italic">Aucune session liée</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {linkedSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => router.push("/phono/sessions-studio")}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] cursor-pointer hover:bg-[rgba(245,245,245,0.06)] transition-colors"
              >
                <p className="text-[12px] text-[#F5F5F5]/80">{session.title}</p>
                {session.date && <p className="text-[10px] text-[#F5F5F5]/30">{session.date as string}</p>}
                <ExternalLink size={10} className="text-[#F5F5F5]/20" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog lier album */}
      <Dialog open={linkAlbumOpen} onOpenChange={setLinkAlbumOpen}>
        <DialogContent className="max-w-sm bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
          <DialogHeader>
            <DialogTitle className="text-[#F5F5F5] text-[14px]">Lier un album</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {availableAlbums.length === 0 ? (
              <p className="text-[12px] text-[#F5F5F5]/30 text-center py-4">Tous les albums sont déjà liés</p>
            ) : availableAlbums.map((a) => (
              <button
                key={a.id}
                onClick={() => linkAlbum(a.id)}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.06)] hover:text-[#F5F5F5] transition-colors"
              >
                {a.cover && <img src={a.cover} alt={a.title} className="w-6 h-6 rounded object-cover" />}
                {a.title}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog lier titre */}
      <Dialog open={linkTrackOpen} onOpenChange={setLinkTrackOpen}>
        <DialogContent className="max-w-sm bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
          <DialogHeader>
            <DialogTitle className="text-[#F5F5F5] text-[14px]">Lier un titre</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {availableTracks.length === 0 ? (
              <p className="text-[12px] text-[#F5F5F5]/30 text-center py-4">Tous les titres sont déjà liés</p>
            ) : availableTracks.map((t) => (
              <button
                key={t.id}
                onClick={() => linkTrack(t.id)}
                className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.06)] hover:text-[#F5F5F5] transition-colors"
              >
                {t.title}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog lier session */}
      <Dialog open={linkSessionOpen} onOpenChange={setLinkSessionOpen}>
        <DialogContent className="max-w-sm bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
          <DialogHeader>
            <DialogTitle className="text-[#F5F5F5] text-[14px]">Lier une session</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {availableSessions.length === 0 ? (
              <p className="text-[12px] text-[#F5F5F5]/30 text-center py-4">Toutes les sessions sont déjà liées</p>
            ) : availableSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => linkSession(s.id)}
                className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-[#F5F5F5]/70 hover:bg-[rgba(245,245,245,0.06)] hover:text-[#F5F5F5] transition-colors"
              >
                {s.title}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
