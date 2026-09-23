"use client";

import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase";
import { userErrorMessage } from "@/lib/user-error";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectCampaignItem {
  id: string;
  name: string;
  subject?: string;
  dateEnvoi: string;
  envoyes: number;
}

export interface ProjectEventItem {
  id: string;
  title: string;
  date: string;
  platforms: string[];
  status: string;
}

interface ProjectMarketingData {
  campaigns: ProjectCampaignItem[];
  events: ProjectEventItem[];
}

const FALLBACK: ProjectMarketingData = { campaigns: [], events: [] };

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchProjectMarketing(projectId: string): Promise<ProjectMarketingData> {
  const supabase = createClient();

  const [campRes, eventsRes] = await Promise.all([
    supabase
      .from("user_mailing_campaigns")
      .select("id, name, subject, date_envoi, envoyes")
      .eq("project_id", projectId)
      .order("date_envoi", { ascending: true }),
    supabase
      .from("user_marketing_events")
      .select("id, title, date, data")
      .eq("project_id", projectId)
      .order("date", { ascending: true }),
  ]);

  const campaigns: ProjectCampaignItem[] = (campRes.data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      name: (row.name as string) ?? "",
      subject: (row.subject as string) ?? undefined,
      dateEnvoi: (row.date_envoi as string) ?? "",
      envoyes: Number(row.envoyes ?? 0),
    };
  });

  const events: ProjectEventItem[] = (eventsRes.data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const data = (row.data ?? {}) as Record<string, unknown>;
    return {
      id: row.id as string,
      title: (row.title as string) ?? "",
      date: (row.date as string) ?? "",
      platforms: (data.platforms as string[]) ?? [],
      status: (data.status as string) ?? "idee",
    };
  });

  return { campaigns, events };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProjectMarketingData(projectId: string) {
  const key = projectId ? `marketing:${projectId}` : null;

  const { data = FALLBACK, isLoading, error: swrError, mutate: mutateLocal } =
    useSWR<ProjectMarketingData>(key, () => fetchProjectMarketing(projectId));

  const error = swrError ? userErrorMessage(swrError, "Impossible de charger le marketing du projet.") : null;

  const attachCampaign = useCallback(async (campaignId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("user_mailing_campaigns")
      .update({ project_id: projectId })
      .eq("id", campaignId);
    if (!error) mutate(key);
  }, [projectId, key]);

  const detachCampaign = useCallback(async (campaignId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("user_mailing_campaigns")
      .update({ project_id: null })
      .eq("id", campaignId);
    if (!error) mutate(key);
  }, [projectId, key]);

  const attachEvent = useCallback(async (eventId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("user_marketing_events")
      .update({ project_id: projectId })
      .eq("id", eventId);
    if (!error) mutate(key);
  }, [projectId, key]);

  const detachEvent = useCallback(async (eventId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
      .from("user_marketing_events")
      .update({ project_id: null })
      .eq("id", eventId);
    if (!error) mutate(key);
  }, [projectId, key]);

  return {
    campaigns: data.campaigns,
    events: data.events,
    attachCampaign,
    detachCampaign,
    attachEvent,
    detachEvent,
    loading: isLoading,
    error,
    mutateLocal,
  };
}
