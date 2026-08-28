import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Project } from "@/lib/sidekick-store";
import { linkDateToTour, unlinkDateFromTours, quickCreateTour } from "./tourLinks";

export function TourSelect({
  dateId,
  currentProjectId,
  projects,
  setProjects,
}: {
  dateId: number;
  currentProjectId: string | null;
  projects: Project[];
  setProjects: (fn: (prev: Project[]) => Project[]) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const liveProjects = projects.filter((p) => p.sectors.includes("live"));

  return (
    <div>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[#F5F5F5]/45">
        Tournée
      </p>
      {creating ? (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de la tournée"
            className="h-9 text-xs"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (!name.trim()) return;
              quickCreateTour(setProjects, dateId, name);
              setName("");
              setCreating(false);
            }}
          >
            Créer
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
            Annuler
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={currentProjectId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) unlinkDateFromTours(setProjects, dateId);
              else linkDateToTour(setProjects, dateId, val);
            }}
          >
            <option value="">Hors tournée</option>
            {liveProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || "Projet sans titre"}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" variant="outline" onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-3 w-3" />
            Nouvelle
          </Button>
        </div>
      )}
    </div>
  );
}
