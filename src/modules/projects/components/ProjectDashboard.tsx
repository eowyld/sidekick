"use client";

import { Suspense, useState } from "react";
import posthog from "posthog-js";
import { useRouter } from "next/navigation";
import { useProjectsData } from "@/hooks/useProjectsData";
import { ProjectModal } from "./ProjectModal";
import { ProjectTabs } from "./ProjectTabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  MoreHorizontal,
  Pencil,
  Music2,
  BookOpen,
  Mic2,
  ChevronDown,
} from "lucide-react";
import type { Project, ProjectStatus } from "@/lib/sidekick-store";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Idée" },
  { value: "in_progress", label: "En cours" },
  { value: "paused", label: "En pause" },
  { value: "done", label: "Terminé" },
];

const STATUS_COLORS: Record<ProjectStatus, string> = {
  idea: "text-yellow-400",
  in_progress: "text-green-400",
  paused: "text-[#F5F5F5]/40",
  done: "text-blue-400",
  archived: "text-[#F5F5F5]/30",
};

interface ProjectDashboardProps {
  projectId: string;
}

export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
  const router = useRouter();
  const { projects, setProjects, loading } = useProjectsData();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const project = projects.find((p) => p.id === projectId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#F5F5F5]/20">
        <p className="text-sm">Chargement...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#F5F5F5]/30">
        <p>Projet introuvable</p>
        <Button variant="ghost" size="sm" onClick={() => router.push("/projects")} className="mt-4">
          <ArrowLeft size={14} className="mr-1.5" />
          Retour aux projets
        </Button>
      </div>
    );
  }

  const updateProject = (updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      )
    );
  };

  const handleStatusChange = (status: ProjectStatus) => {
    posthog.capture("project_status_changed", { new_status: status, previous_status: project.status });
    updateProject({ status });
  };

  const handleDelete = () => {
    posthog.capture("project_deleted", { sectors: project.sectors });
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    router.push("/projects");
  };

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === project.status);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/40 hover:text-[#F5F5F5] transition-colors"
      >
        <ArrowLeft size={13} />
        Projets
      </button>

      {/* Header */}
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl overflow-hidden">
        {/* Bannière cover */}
        <div className="relative h-40 bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
          {project.cover ? (
            <img src={project.cover} alt={project.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl font-bold text-[#F5F5F5]/5 uppercase tracking-widest">
                {project.title.charAt(0)}
              </span>
            </div>
          )}
          {/* Actions */}
          <div className="absolute top-3 right-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-[#F5F5F5]/70 hover:text-[#F5F5F5]">
                  <MoreHorizontal size={15} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
                <DropdownMenuItem onClick={() => setEditModalOpen(true)} className="text-[#F5F5F5]/70 hover:text-[#F5F5F5]">
                  <Pencil size={13} className="mr-2" /> Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange("archived")} className="text-[#F5F5F5]/70 hover:text-[#F5F5F5]">
                  Archiver
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-400 hover:text-red-300">
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Infos */}
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold text-[#F5F5F5]">{project.title}</h1>
            {/* Statut dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center gap-1.5 text-[12px] font-medium ${STATUS_COLORS[project.status]}`}>
                  {currentStatus?.label ?? project.status}
                  <ChevronDown size={12} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
                {STATUS_OPTIONS.filter((s) => s.value !== "archived").map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    className={`text-[12px] ${STATUS_COLORS[opt.value]}`}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {project.description && (
            <p className="text-[13px] text-[#F5F5F5]/60 leading-relaxed">{project.description}</p>
          )}

          {/* Secteurs */}
          {project.sectors.length > 0 && (
            <div className="flex gap-2">
              {project.sectors.map((s) => {
                const Icon = s === "phono" ? Music2 : s === "edition" ? BookOpen : Mic2;
                const label = s === "phono" ? "Phono" : s === "edition" ? "Édition" : "Live";
                return (
                  <span key={s} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border border-[rgba(245,245,245,0.1)] text-[#F5F5F5]/50">
                    <Icon size={10} /> {label}
                  </span>
                );
              })}
            </div>
          )}

          {/* Membres */}
          {project.members.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {project.members.map((m, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-[11px] bg-[rgba(245,245,245,0.06)] text-[#F5F5F5]/50">
                  {m.name}{m.role ? ` · ${m.role}` : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Onglets */}
      <Suspense fallback={null}>
        <ProjectTabs project={project} />
      </Suspense>

      <ProjectModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        project={project}
      />
    </div>
  );
}
