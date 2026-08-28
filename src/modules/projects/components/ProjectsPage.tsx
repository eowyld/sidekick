"use client";

import { useState, useEffect } from "react";
import { useProjectsData } from "@/hooks/useProjectsData";
import { useSidekickData } from "@/hooks/useSidekickData";
import { migrateProjectsToSupabase } from "@/modules/projects/lib/migrate-projects-to-supabase";
import { ProjectModal } from "./ProjectModal";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban, Archive } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ProjectCard } from "./ProjectCard";
import type { Project } from "@/lib/sidekick-store";
import Link from "next/link";

const ACTIVE_STATUSES = ["idea", "in_progress", "paused", "done"] as const;

// ─── Page principale ──────────────────────────────────────────────────────────

export function ProjectsPage() {
  const { projects, setProjects, loading } = useProjectsData();
  const { data } = useSidekickData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();

  // Migration one-shot localStorage → Supabase
  useEffect(() => {
    const local = data.projects?.projects ?? [];
    void migrateProjectsToSupabase(local as Project[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeProjects = projects.filter((p) =>
    (ACTIVE_STATUSES as readonly string[]).includes(p.status)
  );

  const handleEdit = (p: Project) => {
    setEditingProject(p);
    setModalOpen(true);
  };

  const handleArchive = (id: string) => {
    const now = new Date().toISOString();
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "archived" as const, updatedAt: now } : p
      )
    );
  };

  const handleDelete = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
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
          {!loading && (
            <p className="text-sm text-[#F5F5F5]/50 mt-0.5">
              {activeProjects.length} projet{activeProjects.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/projects/archives"
            className="flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/40 hover:text-[#F5F5F5] transition-colors"
          >
            <Archive size={13} /> Anciens projets
          </Link>
          <Button onClick={() => setModalOpen(true)} size="sm">
            <Plus size={14} className="mr-1.5" />
            Nouveau projet
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-[#F5F5F5]/20">
          <p className="text-sm">Chargement...</p>
        </div>
      )}

      {/* Projets */}
      {!loading && activeProjects.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title="Aucun projet en cours"
          description="Un projet rassemble un album, une tournée, une campagne : fédère les tâches, dates, contacts et documents liés à un même objectif."
          action={{ label: "Créer un projet", onClick: () => setModalOpen(true) }}
        />
      )}

      {!loading && activeProjects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      <ProjectModal open={modalOpen} onClose={handleCloseModal} project={editingProject} />
    </div>
  );
}
