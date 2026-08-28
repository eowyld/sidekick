import type { Project } from "@/lib/sidekick-store";

type SetProjects = (fn: (prev: Project[]) => Project[]) => void;

/** Rattache la date `dateId` au projet `projectId`, en la retirant de tout autre projet. */
export function linkDateToTour(setProjects: SetProjects, dateId: number, projectId: string) {
  const key = String(dateId);
  setProjects((prev) =>
    prev.map((p) => {
      const has = p.linkedTourDates.includes(key);
      if (p.id === projectId) {
        return has ? p : { ...p, linkedTourDates: [...p.linkedTourDates, key], updatedAt: new Date().toISOString() };
      }
      return has
        ? { ...p, linkedTourDates: p.linkedTourDates.filter((k) => k !== key), updatedAt: new Date().toISOString() }
        : p;
    })
  );
}

/** Retire la date de toutes les tournées (→ « Hors tournée »). */
export function unlinkDateFromTours(setProjects: SetProjects, dateId: number) {
  const key = String(dateId);
  setProjects((prev) =>
    prev.map((p) =>
      p.linkedTourDates.includes(key)
        ? { ...p, linkedTourDates: p.linkedTourDates.filter((k) => k !== key), updatedAt: new Date().toISOString() }
        : p
    )
  );
}

/** Crée un projet live minimal contenant la date, et renvoie son id. */
export function quickCreateTour(setProjects: SetProjects, dateId: number, title: string): string {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const key = String(dateId);
  const project: Project = {
    id,
    title: title.trim() || "Nouvelle tournée",
    description: "",
    status: "in_progress",
    cover: "",
    images: [],
    sectors: ["live"],
    members: [],
    linkedAlbums: [],
    linkedTracks: [],
    linkedSessions: [],
    linkedWorks: [],
    linkedTourDates: [key],
    linkedRehearsals: [],
    linkedStatutIds: [],
    keyDates: [],
    createdAt: now,
    updatedAt: now,
    notes: "",
    brainstorm: "",
    creationSeededSectors: [],
  };
  // Retire d'abord la date d'éventuelles autres tournées, puis ajoute le nouveau projet.
  setProjects((prev) => [
    ...prev.map((p) =>
      p.linkedTourDates.includes(key)
        ? { ...p, linkedTourDates: p.linkedTourDates.filter((k) => k !== key) }
        : p
    ),
    project,
  ]);
  return id;
}
