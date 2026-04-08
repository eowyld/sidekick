"use client";

import { useRouter } from "next/navigation";
import type { Project } from "@/lib/sidekick-store";
import { Music2, BookOpen, Mic2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const SECTOR_ICONS = {
  phono: Music2,
  edition: BookOpen,
  live: Mic2,
};

interface ProjectArchiveRowProps {
  project: Project;
  onUnarchive: (id: string) => void;
}

export function ProjectArchiveRow({ project, onUnarchive }: ProjectArchiveRowProps) {
  const router = useRouter();

  const createdAt = new Date(project.createdAt).toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });
  const archivedAt = new Date(project.updatedAt).toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });

  const linkedCount = [
    project.linkedAlbums.length,
    project.linkedTracks.length,
    project.linkedWorks.length,
    project.linkedTourDates.length,
    project.linkedRehearsals.length,
    project.linkedSessions.length,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-lg border border-[rgba(245,245,245,0.06)] bg-[rgba(44,44,46,0.4)] hover:bg-[rgba(44,44,46,0.6)] transition-colors">
      {/* Thumbnail */}
      <div
        className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 cursor-pointer"
        onClick={() => router.push(`/projects/${project.id}`)}
      >
        {project.cover ? (
          <img src={project.cover} alt={project.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
            <span className="text-[10px] font-bold text-[#F5F5F5]/20 uppercase">
              {project.title.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Titre */}
      <span
        className="flex-1 text-[13px] text-[#F5F5F5]/70 hover:text-[#F5F5F5] cursor-pointer truncate"
        onClick={() => router.push(`/projects/${project.id}`)}
      >
        {project.title}
      </span>

      {/* Secteurs */}
      <div className="flex gap-1.5 flex-shrink-0">
        {project.sectors.map((s) => {
          const Icon = SECTOR_ICONS[s];
          return <Icon key={s} size={12} className="text-[#F5F5F5]/30" />;
        })}
      </div>

      {/* Période */}
      <span className="text-[11px] text-[#F5F5F5]/30 flex-shrink-0 hidden sm:block">
        {createdAt} → {archivedAt}
      </span>

      {/* Compteur éléments */}
      <span className="text-[11px] text-[#F5F5F5]/30 flex-shrink-0 hidden md:block">
        {linkedCount} élément{linkedCount !== 1 ? "s" : ""}
      </span>

      {/* Action */}
      <Button
        size="xs"
        variant="ghost"
        onClick={() => onUnarchive(project.id)}
        className="flex-shrink-0 text-[#F5F5F5]/40 hover:text-[#F5F5F5] text-xs"
      >
        Désarchiver
      </Button>
    </div>
  );
}
