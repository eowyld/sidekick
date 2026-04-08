"use client";

import { useSidekickData } from "@/hooks/useSidekickData";
import { ProjectArchiveRow } from "./ProjectArchiveRow";

export function ArchivesPage() {
  const { data, setData } = useSidekickData();

  const archivedProjects = (data.projects?.projects ?? [])
    .filter((p) => p.status === "archived")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const handleUnarchive = (id: string) => {
    const now = new Date().toISOString();
    setData((prev) => ({
      ...prev,
      projects: {
        projects: prev.projects.projects.map((p) =>
          p.id === id ? { ...p, status: "done" as const, updatedAt: now } : p
        ),
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#F5F5F5]">Anciens projets</h1>
        <p className="text-sm text-[#F5F5F5]/50 mt-0.5">
          {archivedProjects.length} projet{archivedProjects.length !== 1 ? "s" : ""} archivé{archivedProjects.length !== 1 ? "s" : ""}
        </p>
      </div>

      {archivedProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#F5F5F5]/30">
          <p className="text-sm">Aucun projet archivé</p>
        </div>
      ) : (
        <div className="space-y-1">
          {archivedProjects.map((p) => (
            <ProjectArchiveRow key={p.id} project={p} onUnarchive={handleUnarchive} />
          ))}
        </div>
      )}
    </div>
  );
}
