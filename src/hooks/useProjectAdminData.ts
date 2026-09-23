"use client";

import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase";
import type { ContractStatus } from "@/lib/contracts-db";
import { userErrorMessage } from "@/lib/user-error";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectContract {
  id: string;
  title: string;
  status: ContractStatus;
  statusUpdatedAt: string;
  sentAt?: string | null;
  signedAt?: string | null;
}

interface ProjectAdminData {
  contracts: ProjectContract[];
}

const FALLBACK: ProjectAdminData = { contracts: [] };

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchProjectAdmin(projectId: string): Promise<ProjectAdminData> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("contracts")
    .select("id, title, status, status_updated_at, sent_at, signed_at")
    .eq("project_id", projectId)
    .order("status_updated_at", { ascending: false });

  if (error) return FALLBACK;

  const contracts: ProjectContract[] = (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      title: (row.title as string) ?? "",
      status: (row.status as ContractStatus) ?? "draft",
      statusUpdatedAt: (row.status_updated_at as string) ?? "",
      sentAt: (row.sent_at as string) ?? null,
      signedAt: (row.signed_at as string) ?? null,
    };
  });

  return { contracts };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProjectAdminData(projectId: string) {
  const key = projectId ? `admin:${projectId}` : null;

  const { data = FALLBACK, isLoading, error: swrError } =
    useSWR<ProjectAdminData>(key, () => fetchProjectAdmin(projectId));

  const error = swrError ? userErrorMessage(swrError, "Impossible de charger l’administratif du projet.") : null;

  const attachContract = useCallback(async (contractId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("contracts")
      .update({ project_id: projectId })
      .eq("id", contractId);
    if (!error) mutate(key);
  }, [projectId, key]);

  const detachContract = useCallback(async (contractId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("contracts")
      .update({ project_id: null })
      .eq("id", contractId);
    if (!error) mutate(key);
  }, [projectId, key]);

  return {
    contracts: data.contracts,
    attachContract,
    detachContract,
    loading: isLoading,
    error,
  };
}
