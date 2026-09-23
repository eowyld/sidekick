"use client";

import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient, getSessionUser } from "@/lib/supabase";
import type { Project } from "@/lib/sidekick-store";
import { userErrorMessage } from "@/lib/user-error";

export type { Project, ProjectStatus, ProjectMember, KeyDate } from "@/lib/sidekick-store";

const KEY = "user_projects";
const PROJECT_COLUMNS = [
  "id", "title", "description", "status", "cover", "images", "sectors", "members",
  "linked_albums", "linked_tracks", "linked_sessions", "linked_works",
  "linked_tour_dates", "linked_rehearsals", "linked_statut_ids", "key_dates",
  "notes", "brainstorm", "creation_seeded_sectors", "created_at", "updated_at",
].join(",");

export const EMPTY_PROJECT_MILESTONES: Project["manualMilestones"] = {
  editionWritingCompositionDone: false,
  liveConceptDone: false,
  liveSetlistDone: false,
  liveTeamDone: false,
};

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    description: (row.description as string) ?? "",
    status: (row.status as Project["status"]) ?? "idea",
    cover: (row.cover as string) ?? "",
    images: (row.images as string[]) ?? [],
    sectors: (row.sectors as Project["sectors"]) ?? [],
    members: (row.members as Project["members"]) ?? [],
    linkedAlbums: (row.linked_albums as string[]) ?? [],
    linkedTracks: (row.linked_tracks as string[]) ?? [],
    linkedSessions: (row.linked_sessions as string[]) ?? [],
    linkedWorks: (row.linked_works as string[]) ?? [],
    linkedTourDates: (row.linked_tour_dates as string[]) ?? [],
    linkedRehearsals: (row.linked_rehearsals as string[]) ?? [],
    linkedStatutIds: (row.linked_statut_ids as string[]) ?? [],
    keyDates: (row.key_dates as Project["keyDates"]) ?? [],
    notes: (row.notes as string) ?? "",
    brainstorm: (row.brainstorm as string) ?? "",
    creationSeededSectors: (row.creation_seeded_sectors as Project["creationSeededSectors"]) ?? [],
    targetDate: (row.target_date as string) ?? "",
    pinned: (row.pinned as boolean) ?? false,
    pinnedOrder: (row.pinned_order as number) ?? 0,
    manualMilestones: {
      ...EMPTY_PROJECT_MILESTONES,
      ...((row.manual_milestones as Partial<Project["manualMilestones"]>) ?? {}),
    },
    objectives: (row.objectives as Project["objectives"]) ?? [],
    milestoneStates: (row.milestone_states as Record<string, boolean>) ?? {},
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

function projectToRow(p: Project): Record<string, unknown> {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    status: p.status,
    cover: p.cover,
    images: p.images,
    sectors: p.sectors,
    members: p.members,
    linked_albums: p.linkedAlbums,
    linked_tracks: p.linkedTracks,
    linked_sessions: p.linkedSessions,
    linked_works: p.linkedWorks,
    linked_tour_dates: p.linkedTourDates,
    linked_rehearsals: p.linkedRehearsals,
    linked_statut_ids: p.linkedStatutIds,
    key_dates: p.keyDates,
    notes: p.notes,
    brainstorm: p.brainstorm,
    creation_seeded_sectors: p.creationSeededSectors,
    target_date: p.targetDate || null,
    pinned: p.pinned,
    pinned_order: p.pinnedOrder,
    manual_milestones: p.manualMilestones,
    objectives: p.objectives,
    milestone_states: p.milestoneStates,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

/** Écriture compatible tant que la migration cockpit n'est pas déployée. */
function projectToLegacyRow(p: Project): Record<string, unknown> {
  const row = projectToRow(p);
  delete row.target_date;
  delete row.pinned;
  delete row.pinned_order;
  delete row.manual_milestones;
  delete row.objectives;
  delete row.milestone_states;
  return row;
}

/** Champs de liens croisés, et leur colonne Postgres. */
export type ProjectLinkFields = Pick<
  Project,
  | "linkedAlbums"
  | "linkedTracks"
  | "linkedSessions"
  | "linkedWorks"
  | "linkedTourDates"
  | "linkedRehearsals"
>;

const LINK_COLUMNS: Record<keyof ProjectLinkFields, string> = {
  linkedAlbums: "linked_albums",
  linkedTracks: "linked_tracks",
  linkedSessions: "linked_sessions",
  linkedWorks: "linked_works",
  linkedTourDates: "linked_tour_dates",
  linkedRehearsals: "linked_rehearsals",
};

async function fetchProjects(): Promise<Project[]> {
  const supabase = createClient();
  const full = await supabase
    .from("user_projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (!full.error) return (full.data ?? []).map(rowToProject);

  // Pendant un déploiement, le frontend peut précéder la migration additive.
  // La liste reste alors consultable avec des valeurs neutres ; les nouveaux
  // réglages deviennent persistants dès que les colonnes sont disponibles.
  const legacy = await supabase
    .from("user_projects")
    .select(PROJECT_COLUMNS)
    .order("updated_at", { ascending: false });
  if (legacy.error) throw new Error(legacy.error.message);
  return ((legacy.data ?? []) as unknown as Record<string, unknown>[]).map(rowToProject);
}

export function useProjectsData() {
  const { data: projects = [], isLoading, error: swrError, mutate: mutateLocal } =
    useSWR<Project[]>(KEY, fetchProjects);

  const error = swrError ? userErrorMessage(swrError, "Impossible de charger tes projets. Réessaie dans un instant.") : null;

  const createProjectBundle = useCallback(async (payload: Record<string, unknown>) => {
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("create_project_with_links", { payload });
    if (rpcError) throw new Error(rpcError.message);
    await Promise.all([mutate(KEY), mutate("user_phono"), mutate("user_edition")]);
    return data as string;
  }, []);

  const setProjects = useCallback((fn: (prev: Project[]) => Project[]) => {
    const snapshot = projects;
    const next = fn(projects);

    mutateLocal(next, false);

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await getSessionUser(supabase);
      if (!user) { mutateLocal(snapshot, false); return; }

      const prevMap = new Map(snapshot.map((p) => [p.id, p]));
      const nextMap = new Map(next.map((p) => [p.id, p]));

      const toUpsert = next.filter((p) => {
        const old = prevMap.get(p.id);
        return !old || JSON.stringify(old) !== JSON.stringify(p);
      });
      const toDelete = snapshot.filter((p) => !nextMap.has(p.id)).map((p) => p.id);

      const ops: Array<PromiseLike<{ error: { message: string } | null }>> = [];

      if (toUpsert.length > 0) {
        ops.push(
          (async () => {
            const rows = toUpsert.map((p) => ({ ...projectToRow(p), user_id: user.id }));
            const first = await supabase.from("user_projects").upsert(rows);
            if (!first.error) return { error: null };

            // Le frontend peut précéder la migration additive : dans ce cas,
            // ne bloque surtout pas l'édition des champs historiques du projet.
            const legacyRows = toUpsert.map((p) => ({
              ...projectToLegacyRow(p),
              user_id: user.id,
            }));
            const fallback = await supabase.from("user_projects").upsert(legacyRows);
            return {
              error: fallback.error ? { message: fallback.error.message } : null,
            };
          })()
        );
      }
      if (toDelete.length > 0) {
        ops.push(
          supabase.from("user_projects")
            .delete().in("id", toDelete)
            .then(({ error }) => ({ error: error ? { message: error.message } : null }))
        );
      }

      const results = await Promise.all(ops);
      if (results.find((r) => r.error)) {
        mutateLocal(snapshot, false);
      } else {
        mutate(KEY);
      }
    })();
  }, [projects, mutateLocal]);

  /**
   * Écrit uniquement les colonnes de liens d'un projet.
   *
   * `setProjects` ré-upserte la ligne entière, images base64 comprises : à
   * chaque lien coché on renverrait plusieurs Mo inutilement. Ce patch cible
   * les seules colonnes `linked_*` concernées.
   */
  const patchProjectLinks = useCallback(
    (projectId: string, updates: Partial<ProjectLinkFields>) => {
      const snapshot = projects;
      const now = new Date().toISOString();

      const next = snapshot.map((p) =>
        p.id === projectId ? { ...p, ...updates, updatedAt: now } : p
      );
      mutateLocal(next, false);

      (async () => {
        const supabase = createClient();
        const { data: { user } } = await getSessionUser(supabase);
        if (!user) { mutateLocal(snapshot, false); return; }

        const row: Record<string, unknown> = { updated_at: now };
        for (const [field, column] of Object.entries(LINK_COLUMNS)) {
          const value = updates[field as keyof ProjectLinkFields];
          if (value !== undefined) row[column] = value;
        }

        const { error: err } = await supabase
          .from("user_projects")
          .update(row)
          .eq("id", projectId)
          .eq("user_id", user.id);

        if (err) {
          mutateLocal(snapshot, false);
        } else {
          mutate(KEY);
        }
      })();
    },
    [projects, mutateLocal]
  );

  return { projects, setProjects, patchProjectLinks, createProjectBundle, loading: isLoading, error };
}
