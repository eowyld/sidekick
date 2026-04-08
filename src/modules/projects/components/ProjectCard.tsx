"use client";

import { useRouter } from "next/navigation";
import type { Project } from "@/lib/sidekick-store";
import { Music2, BookOpen, Mic2, Users, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_CONFIG: Record<Project["status"], { label: string; color: string }> = {
  idea: { label: "Idée", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  in_progress: { label: "En cours", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  paused: { label: "En pause", color: "bg-[rgba(245,245,245,0.08)] text-[#F5F5F5]/50 border-[rgba(245,245,245,0.12)]" },
  done: { label: "Terminé", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  archived: { label: "Archivé", color: "bg-[rgba(245,245,245,0.06)] text-[#F5F5F5]/40 border-[rgba(245,245,245,0.08)]" },
};

const SECTOR_ICONS = {
  phono: Music2,
  edition: BookOpen,
  live: Mic2,
};

interface ProjectCardProps {
  project: Project;
  onEdit: (p: Project) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onEdit, onArchive, onDelete }: ProjectCardProps) {
  const router = useRouter();
  const status = STATUS_CONFIG[project.status];

  const updatedAt = new Date(project.updatedAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className="group relative flex flex-col rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl overflow-hidden cursor-pointer hover:border-[rgba(245,245,245,0.18)] transition-all duration-200"
      onClick={() => router.push(`/projects/${project.id}`)}
    >
      {/* Cover */}
      <div className="relative h-36 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex-shrink-0">
        {project.cover ? (
          <img src={project.cover} alt={project.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-bold text-[#F5F5F5]/10 uppercase tracking-widest">
              {project.title.charAt(0)}
            </span>
          </div>
        )}
        {/* Actions dropdown */}
        <div
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-[#F5F5F5]/70 hover:text-[#F5F5F5]">
                <MoreHorizontal size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
              <DropdownMenuItem onClick={() => onEdit(project)} className="text-[#F5F5F5]/70 hover:text-[#F5F5F5]">
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onArchive(project.id)} className="text-[#F5F5F5]/70 hover:text-[#F5F5F5]">
                Archiver
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(project.id)} className="text-red-400 hover:text-red-300">
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-3">
        {/* Titre + statut */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-[#F5F5F5] leading-tight line-clamp-1">
            {project.title}
          </h3>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] border ${status.color}`}>
            {status.label}
          </span>
        </div>

        {/* Secteurs + membres */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {project.sectors.map((s) => {
              const Icon = SECTOR_ICONS[s];
              return <Icon key={s} size={12} className="text-[#F5F5F5]/40" />;
            })}
          </div>
          {project.members.length > 0 && (
            <div className="flex items-center gap-1 text-[#F5F5F5]/40">
              <Users size={11} />
              <span className="text-[11px]">{project.members.length}</span>
            </div>
          )}
        </div>

        {/* Date */}
        <p className="text-[11px] text-[#F5F5F5]/30">Modifié {updatedAt}</p>
      </div>
    </div>
  );
}
