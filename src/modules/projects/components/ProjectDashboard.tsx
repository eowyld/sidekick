"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSidekickData } from "@/hooks/useSidekickData";
import { ProjectModal } from "./ProjectModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  ImagePlus,
  MoreHorizontal,
  Pencil,
  X,
  ChevronDown,
  Music2,
  BookOpen,
  Mic2,
} from "lucide-react";
import type { Project, ProjectStatus } from "@/lib/sidekick-store";
import { PhonoSection } from "./sections/PhonoSection";
import { EditionSection } from "./sections/EditionSection";
import { LiveSection } from "./sections/LiveSection";
import { WorkTrackLinker } from "./sections/WorkTrackLinker";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Idée" },
  { value: "in_progress", label: "En cours" },
  { value: "paused", label: "En pause" },
  { value: "done", label: "Terminé" },
  { value: "archived", label: "Archivé" },
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
  const { data, setData } = useSidekickData();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  const project = (data.projects?.projects ?? []).find((p) => p.id === projectId);

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
    setData((prev) => ({
      ...prev,
      projects: {
        projects: prev.projects.projects.map((p) =>
          p.id === projectId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
      },
    }));
  };

  const handleStatusChange = (status: ProjectStatus) => {
    updateProject({ status });
  };

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateProject({ images: [...project.images, ev.target?.result as string] });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (index: number) => {
    updateProject({ images: project.images.filter((_, i) => i !== index) });
  };

  const handleSaveNotes = () => {
    updateProject({ notes: notesValue });
    setEditingNotes(false);
  };

  const handleDelete = () => {
    setData((prev) => ({
      ...prev,
      projects: {
        projects: prev.projects.projects.filter((p) => p.id !== projectId),
      },
    }));
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
                  {currentStatus?.label}
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

      {/* Galerie */}
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setGalleryOpen((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-[13px] font-medium text-[#F5F5F5]/70 hover:text-[#F5F5F5]"
        >
          <span>Images & mood board</span>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#F5F5F5]/30">{project.images.length} image{project.images.length !== 1 ? "s" : ""}</span>
            <ChevronDown size={14} className={`transition-transform ${galleryOpen ? "rotate-180" : ""}`} />
          </div>
        </button>
        {galleryOpen && (
          <div className="px-5 pb-5">
            <div className="flex flex-wrap gap-2">
              {project.images.map((img, i) => (
                <div key={i} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-[rgba(245,245,245,0.08)]">
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

      {/* Sections secteurs */}
      {project.sectors.includes("phono") && <PhonoSection project={project} />}
      {project.sectors.includes("edition") && <EditionSection project={project} />}
      {project.sectors.includes("live") && <LiveSection project={project} />}

      {/* Lien oeuvre ↔ titre (si phono + edition activés) */}
      {project.sectors.includes("phono") && project.sectors.includes("edition") && (
        <WorkTrackLinker project={project} />
      )}

      {/* Notes */}
      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-[#F5F5F5]/70">Notes</h2>
          {!editingNotes && (
            <button
              onClick={() => { setNotesValue(project.notes); setEditingNotes(true); }}
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
              <Button variant="ghost" size="sm" onClick={() => setEditingNotes(false)}>Annuler</Button>
              <Button size="sm" onClick={handleSaveNotes}>Enregistrer</Button>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-[#F5F5F5]/50 whitespace-pre-wrap min-h-[2rem]">
            {project.notes || <span className="italic text-[#F5F5F5]/20">Pas de notes</span>}
          </p>
        )}
      </div>

      <ProjectModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        project={project}
      />
    </div>
  );
}
