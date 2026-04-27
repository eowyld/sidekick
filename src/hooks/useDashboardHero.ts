// src/hooks/useDashboardHero.ts
"use client";

import useSWR from "swr";
import type { HeroContextInput } from "@/lib/dashboard-hero-context";

type HeroResponse = {
  phrase: string;
  accent: string;
  kind: "urgence" | "event" | "question" | "fallback";
  cached?: boolean;
};

const fetcher = async (
  _key: string,
  payload: Omit<HeroContextInput, "today">,
): Promise<HeroResponse> => {
  const res = await fetch("/api/dashboard/hero-phrase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Hero fetch failed: ${res.status}`);
  return res.json();
};

export function useDashboardHero(payload: Omit<HeroContextInput, "today"> | null) {
  const key = payload ? ["dashboard-hero", JSON.stringify(payload)] as const : null;

  const { data, error, isLoading } = useSWR<HeroResponse>(
    key,
    () => fetcher("dashboard-hero", payload as Omit<HeroContextInput, "today">),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60_000,
    },
  );

  return {
    phrase: data?.phrase ?? null,
    accent: data?.accent ?? null,
    kind: data?.kind ?? null,
    loading: isLoading,
    error,
  };
}
