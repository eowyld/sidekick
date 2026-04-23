"use client";

import { useState } from "react";
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
  Plus,
  MoreHorizontal,
  Pencil,
  Music2,
  BookOpen,
  Mic2,
  ChevronDown,
  ImagePlus,
  X,
  FolderKanban,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { Project, ProjectStatus } from "@/lib/sidekick-store";
import { PhonoSection } from "./sections/PhonoSection";
import { EditionSection } from "./sections/EditionSection";
import { LiveSection } from "./sections/LiveSection";
import { WorkTrackLinker } from "./sections/WorkTrackLinker";

const ACTIVE_STATUSES = ["idea", "in_progress", "paused", "done"] as const;

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  idea: { label: "Idée", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  in_progress: { label: "En cours", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  paused: { label: "En pause", color: "bg-[rgba(245,245,245,0.08)] text-[#F5F5F5]/50 border-[rgba(245,245,245,0.12)]" },
  done: { label: "Terminé", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  archived: { label: "Archivé", color: "bg-[rgba(245,245,245,0.06)] text-[#F5F5F5]/40 border-[rgba(245,245,245,0.08)]" },
};

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Idée" },
  { value: "in_progress", label: "En cours" },
  { value: "paused", label: "En pause" },
  { value: "done", label: "Terminé" },
];

const SECTOR_ICONS = { phono: Music2, edition: BookOpen, live: Mic2 };
const SECTOR_LABELS = { phono: "Phono", edition: "Édition", live: "Live" };

// ─── Composant projet inline ──────────────────────────────────────────────────

function ProjectInline({
  project,
  onEdit,
  onArchive,
  onDelete,
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { data, setData } = useSidekickData();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  const status = STATUS_CONFIG[project.status];

  const updateProject = (updates: Partial<Project>) => {
    setData((prev) => ({
      ...prev,
      projects: {
        projects: prev.projects.projects.map((p) =>
          p.id === project.id
            ? { ...p, ...updates, updatedAt: new Date().toISOString() }
            : p
        ),
      },
    }));
  };

  const handleStatusChange = (s: ProjectStatus) => updateProject({ status: s });

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
    <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-4 p-5 border-b border-[rgba(245,245,245,0.06)]">
        {/* Cover thumbnail */}
        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
          {project.cover ? (
            <img src={project.cover} alt={project.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-lg font-bold text-[#F5F5F5]/10 uppercase">
                {project.title.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-[#F5F5F5] leading-tight">{project.title}</h2>
                {/* Statut */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-colors ${status.color}`}
                    >
                      {status.label}
                      <ChevronDown size={10} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
                    {STATUS_OPTIONS.map((opt) => (
                      <DropdownMenuItem
                        key={opt.value}
                        onClick={() => handleStatusChange(opt.value)}
                        className="text-[12px] text-[#F5F5F5]/70 hover:text-[#F5F5F5]"
                      >
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {/* Secteurs */}
              {project.sectors.length > 0 && (
                <div className="flex gap-1.5 mt-1.5">
                  {project.sectors.map((s) => {
                    const Icon = SECTOR_ICONS[s];
                    return (
                      <span
                        key={s}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border border-[rgba(245,245,245,0.08)] text-[#F5F5F5]/40"
                      >
                        <Icon size={9} />
                        {SECTOR_LABELS[s]}
                      </span>
                    );
                  })}
                </div>
              )}
              {/* Membres */}
              {project.members.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {project.members.map((m, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-[rgba(245,245,245,0.05)] text-[#F5F5F5]/40"
                    >
                      {m.name}{m.role ? ` · ${m.role}` : ""}
                    </span>
                  ))}
                </div>
              )}
              {/* Description */}
              {project.description && (
                <p className="text-[12px] text-[#F5F5F5]/50 mt-1.5 leading-relaxed">{project.description}</p>
              )}
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-7 w-7 items-center justify-center rounded-full text-[#F5F5F5]/30 hover:text-[#F5F5F5] hover:bg-[rgba(245,245,245,0.06)] transition-colors">
                  <MoreHorizontal size={15} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[rgba(245,245,245,0.12)]">
                <DropdownMenuItem
                  onClick={() => onEdit(project)}
                  className="text-[#F5F5F5]/70 hover:text-[#F5F5F5] text-[13px]"
                >
                  <Pencil size={12} className="mr-2" /> Modifier
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onArchive(project.id)}
                  className="text-[#F5F5F5]/70 hover:text-[#F5F5F5] text-[13px]"
                >
                  Archiver
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(project.id)}
                  className="text-red-400 hover:text-red-300 text-[13px]"
                >
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Corps */}
      <div className="p-5 space-y-5">
        {/* Galerie */}
        {project.images.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setGalleryOpen((v) => !v)}
              className="flex items-center gap-2 text-[11px] text-[#F5F5F5]/30 hover:text-[#F5F5F5] mb-2"
            >
              <ChevronDown
                size={12}
                className={`transition-transform ${galleryOpen ? "rotate-180" : ""}`}
              />
              Images & mood board ({project.images.length})
            </button>
            {galleryOpen && (
              <div className="flex flex-wrap gap-2">
                {project.images.map((img, i) => (
                  <div
                    key={i}
                    className="relative group w-20 h-20 rounded-lg overflow-hidden border border-[rgba(245,245,245,0.08)]"
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 bg-black/60 rounded-full p-0.5"
                    >
                      <X size={9} className="text-white" />
                    </button>
                  </div>
                ))}
                <label className="flex w-20 h-20 flex-col items-center justify-center rounded-lg border border-dashed border-[rgba(245,245,245,0.12)] text-[#F5F5F5]/20 text-[10px] gap-1 cursor-pointer hover:border-[rgba(245,245,245,0.25)] transition-colors">
                  <ImagePlus size={14} />
                  <input type="file" accept="image/*" onChange={handleAddImage} className="hidden" />
                </label>
              </div>
            )}
          </div>
        )}

        {/* Pas d'images — bouton discret pour en ajouter */}
        {project.images.length === 0 && (
          <label className="flex items-center gap-1.5 text-[11px] text-[#F5F5F5]/20 hover:text-[#F5F5F5]/40 cursor-pointer transition-colors w-fit">
            <ImagePlus size={12} />
            Ajouter des images
            <input type="file" accept="image/*" onChange={handleAddImage} className="hidden" />
          </label>
        )}

        {/* Sections secteurs */}
        {project.sectors.includes("phono") && <PhonoSection project={project} />}
        {project.sectors.includes("edition") && <EditionSection project={project} />}
        {project.sectors.includes("live") && <LiveSection project={project} />}

        {/* Association oeuvre ↔ titre */}
        {project.sectors.includes("phono") && project.sectors.includes("edition") && (
          <WorkTrackLinker project={project} />
        )}

        {/* Notes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-[#F5F5F5]/30 uppercase tracking-wider">Notes</p>
            {!editingNotes && (
              <button
                onClick={() => {
                  setNotesValue(project.notes);
                  setEditingNotes(true);
                }}
                className="text-[11px] text-[#F5F5F5]/20 hover:text-[#F5F5F5] flex items-center gap-1 transition-colors"
              >
                <Pencil size={10} /> Modifier
              </button>
            )}
          </div>
          {editingNotes ? (
            <div className="space-y-2">
              <Textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                className="bg-[#101010] border-[rgba(245,245,245,0.12)] text-[#F5F5F5] resize-none text-[13px]"
                rows={3}
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
            <p className="text-[13px] text-[#F5F5F5]/50 whitespace-pre-wrap">
              {project.notes || (
                <span className="italic text-[#F5F5F5]/20">Pas de notes</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function ProjectsPage() {
  const { data, setData, preferencesReady } = useSidekickData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();

  const activeProjects = (data.projects?.projects ?? []).filter((p) =>
    (ACTIVE_STATUSES as readonly string[]).includes(p.status)
  );

  const handleEdit = (p: Project) => {
    setEditingProject(p);
    setModalOpen(true);
  };

  const handleArchive = (id: string) => {
    const now = new Date().toISOString();
    setData((prev) => ({
      ...prev,
      projects: {
        projects: prev.projects.projects.map((p) =>
          p.id === id ? { ...p, status: "archived" as const, updatedAt: now } : p
        ),
      },
    }));
  };

  const handleDelete = (id: string) => {
    setData((prev) => ({
      ...prev,
      projects: {
        projects: prev.projects.projects.filter((p) => p.id !== id),
      },
    }));
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingProject(undefined);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F5]">Projets actifs</h1>
          {preferencesReady && (
            <p className="text-sm text-[#F5F5F5]/50 mt-0.5">
              {activeProjects.length} projet{activeProjects.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus size={14} className="mr-1.5" />
          Nouveau projet
        </Button>
      </div>

      {/* Loading */}
      {!preferencesReady && (
        <div className="flex flex-col items-center justify-center py-16 text-[#F5F5F5]/20">
          <p className="text-sm">Chargement...</p>
        </div>
      )}

      {/* Projets */}
      {preferencesReady && activeProjects.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title="Aucun projet en cours"
          description="Un projet rassemble un album, une tournée, une campagne : fédère les tâches, dates, contacts et documents liés à un même objectif."
          action={{ label: "Créer un projet", onClick: () => setModalOpen(true) }}
        />
      )}

      {preferencesReady && activeProjects.length > 0 && (
        <div className="space-y-8">
          {activeProjects.map((p) => (
            <ProjectInline
              key={p.id}
              project={p}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ProjectModal open={modalOpen} onClose={handleCloseModal} project={editingProject} />
    </div>
  );
}
