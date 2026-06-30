"use client";

import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase";
import type { Project } from "@/lib/sidekick-store";

export type { Project, ProjectStatus, ProjectMember, KeyDate } from "@/lib/sidekick-store";

const KEY = "user_projects";

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
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

async function fetchProjects(): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToProject);
}

export function useProjectsData() {
  const { data: projects = [], isLoading, error: swrError, mutate: mutateLocal } =
    useSWR<Project[]>(KEY, fetchProjects);

  const error = swrError ? (swrError as Error).message : null;

  const setProjects = useCallback((fn: (prev: Project[]) => Project[]) => {
    const snapshot = projects;
    const next = fn(projects);

    mutateLocal(next, false);

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
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
          supabase.from("user_projects")
            .upsert(toUpsert.map((p) => ({ ...projectToRow(p), user_id: user.id })))
            .then(({ error }) => ({ error: error ? { message: error.message } : null }))
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

  return { projects, setProjects, loading: isLoading, error };
}
