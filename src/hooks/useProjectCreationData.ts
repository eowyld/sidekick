"use client";

import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient, getSessionUser } from "@/lib/supabase";
import type { CreationStep, CreationSector } from "@/lib/sidekick-store";
import { CREATION_TEMPLATES } from "@/modules/projects/data/creation-templates";

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToStep(row: Record<string, unknown>): CreationStep {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    phase: (row.phase as CreationStep["phase"]) ?? "creation",
    sector: (row.sector as CreationStep["sector"]) ?? "general",
    label: (row.label as string) ?? "",
    status: (row.status as CreationStep["status"]) ?? "todo",
    orderIndex: (row.order_index as number) ?? 0,
    targetDate: (row.target_date as string) ?? null,
    assignee: (row.assignee as string) ?? "",
    linkedEntityType: (row.linked_entity_type as CreationStep["linkedEntityType"]) ?? "",
    linkedEntityId: (row.linked_entity_id as string) ?? "",
    links: (row.links as CreationStep["links"]) ?? [],
    taskId: (row.task_id as string) ?? null,
  };
}

function stepToRow(s: CreationStep): Record<string, unknown> {
  return {
    id: s.id,
    project_id: s.projectId,
    phase: s.phase,
    sector: s.sector,
    label: s.label,
    status: s.status,
    order_index: s.orderIndex,
    target_date: s.targetDate ?? null,
    assignee: s.assignee,
    linked_entity_type: s.linkedEntityType,
    linked_entity_id: s.linkedEntityId,
    links: s.links,
    task_id: s.taskId ?? null,
  };
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchSteps(projectId: string): Promise<CreationStep[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_project_creation_steps")
    .select("*")
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToStep(r as Record<string, unknown>));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const SECTOR_TO_TASK_SECTOR: Record<CreationSector, string> = {
  phono: "Phono",
  edition: "Edition",
  live: "Live",
  general: "Projets",
};

export function useProjectCreationData(projectId: string) {
  const key = projectId ? `creation:${projectId}` : null;

  const {
    data: steps = [],
    isLoading,
    error: swrError,
    mutate: mutateLocal,
  } = useSWR<CreationStep[]>(key, () => fetchSteps(projectId));

  const error = swrError ? (swrError as Error).message : null;

  // ─── Setter optimiste ────────────────────────────────────────────────────────

  const setSteps = useCallback(
    (fn: (prev: CreationStep[]) => CreationStep[]) => {
      const snapshot = steps;
      const next = fn(steps);
      mutateLocal(next, false);

      (async () => {
        const supabase = createClient();
        const prevMap = new Map(snapshot.map((s) => [s.id, s]));
        const nextMap = new Map(next.map((s) => [s.id, s]));

        const toUpsert = next.filter((s) => {
          const old = prevMap.get(s.id);
          return !old || JSON.stringify(old) !== JSON.stringify(s);
        });
        const toDelete = snapshot
          .filter((s) => !nextMap.has(s.id))
          .map((s) => s.id);

        const ops: Array<PromiseLike<{ error: { message: string } | null }>> = [];

        if (toUpsert.length > 0) {
          ops.push(
            supabase
              .from("user_project_creation_steps")
              .upsert(toUpsert.map(stepToRow))
              .then(({ error }) => ({
                error: error ? { message: error.message } : null,
              }))
          );
        }
        if (toDelete.length > 0) {
          ops.push(
            supabase
              .from("user_project_creation_steps")
              .delete()
              .in("id", toDelete)
              .then(({ error }) => ({
                error: error ? { message: error.message } : null,
              }))
          );
        }

        const results = await Promise.all(ops);
        if (results.find((r) => r.error)) {
          mutateLocal(snapshot, false);
        } else {
          mutate(key);
        }
      })();
    },
    [steps, mutateLocal, key]
  );

  // ─── Seed secteur ────────────────────────────────────────────────────────────

  const seedSectors = useCallback(
    (
      sectors: Exclude<CreationSector, "general">[],
      currentSeededSectors: CreationSector[],
      updateProject: (updates: { creationSeededSectors: CreationSector[] }) => void
    ) => {
      const toSeed = sectors.filter((s) => !currentSeededSectors.includes(s));
      if (toSeed.length === 0) return;

      const newSteps: CreationStep[] = [];
      for (const sector of toSeed) {
        const templates = CREATION_TEMPLATES[sector];
        const existingCount =
          steps.filter((s) => s.sector === sector).length +
          newSteps.filter((s) => s.sector === sector).length;
        templates.forEach((tpl, i) => {
          newSteps.push({
            id: crypto.randomUUID(),
            projectId,
            phase: tpl.phase,
            sector,
            label: tpl.label,
            status: "todo",
            orderIndex: existingCount + i,
            targetDate: null,
            assignee: "",
            linkedEntityType: "",
            linkedEntityId: "",
            links: [],
            taskId: null,
          });
        });
      }

      setSteps((prev) => [...prev, ...newSteps]);
      updateProject({
        creationSeededSectors: [...currentSeededSectors, ...toSeed],
      });
    },
    [steps, projectId, setSteps]
  );

  // ─── Générer une tâche ───────────────────────────────────────────────────────

  const generateTask = useCallback(
    async (step: CreationStep, initialStatus: "todo" | "in_progress" | "done" = "todo"): Promise<string | null> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await getSessionUser(supabase);
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_tasks")
        .insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          title: step.label,
          status: initialStatus,
          today_focus: false,
          deadline: step.targetDate ?? null,
          sector: SECTOR_TO_TASK_SECTOR[step.sector],
          subtasks: [],
        })
        .select("id")
        .single();

      if (error || !data) return null;

      // Invalide le cache SWR des tâches pour que le module Tâches voie la nouvelle tâche.
      mutate("user_tasks");

      // Ne touche pas `steps` ici : le taskId est combiné au statut par l'appelant
      // en un seul setSteps, pour éviter d'écraser une mise à jour optimiste concurrente.
      return (data as { id: string }).id;
    },
    []
  );

  return {
    steps,
    setSteps,
    seedSectors,
    generateTask,
    loading: isLoading,
    error,
  };
}
