"use client";

import { useState } from "react";
import { useSidekickData } from "@/hooks/useSidekickData";
import { ProjectCard } from "./ProjectCard";
import { ProjectModal } from "./ProjectModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Project } from "@/lib/sidekick-store";

const ACTIVE_STATUSES = ["idea", "in_progress", "paused", "done"] as const;

export function ProjectsPage() {
  const { data, setData } = useSidekickData();
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#F5F5F5]">Projets actifs</h1>
          <p className="text-sm text-[#F5F5F5]/50 mt-0.5">
            {activeProjects.length} projet{activeProjects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus size={14} className="mr-1.5" />
          Nouveau projet
        </Button>
      </div>

      {/* Grille */}
      {activeProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#F5F5F5]/30">
          <p className="text-sm">Aucun projet actif</p>
          <p className="text-xs mt-1">Crée ton premier projet pour commencer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {activeProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ProjectModal
        open={modalOpen}
        onClose={handleCloseModal}
        project={editingProject}
      />
    </div>
  );
}
