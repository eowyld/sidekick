"use client";

import { useCallback } from "react";
import { useProjectsData } from "@/hooks/useProjectsData";
import type { ProjectLinkFields } from "@/hooks/useProjectsData";

/**
 * Écrit les liens croisés d'un projet vers Supabase.
 * Partagé par les sections Phono / Live / Édition, qui répétaient le même patch.
 */
export function useProjectLinks(projectId: string) {
  const { patchProjectLinks } = useProjectsData();

  const updateLinks = useCallback(
    (updates: Partial<ProjectLinkFields>) => patchProjectLinks(projectId, updates),
    [projectId, patchProjectLinks]
  );

  return { updateLinks };
}
