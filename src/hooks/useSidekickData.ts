"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  DEFAULT_SIDEKICK_DATA,
  getStorageKey,
  mergeWithDefaults,
  type SidekickData
} from "@/lib/sidekick-store";

function readStored(key: string): SidekickData {
  if (typeof window === "undefined") return DEFAULT_SIDEKICK_DATA;
  try {
    const raw = window.localStorage.getItem(key);
    const partial = raw ? (JSON.parse(raw) as Partial<SidekickData>) : null;
    return mergeWithDefaults(partial);
  } catch (e) {
    console.warn("Error reading sidekick-data:", e);
    return DEFAULT_SIDEKICK_DATA;
  }
}

/**
 * Données persistant Sidekick (localStorage), isolées par utilisateur.
 * Chaque user a sa propre clé : sidekick-data-{userId}.
 * Nouvel utilisateur = données vides. Reset via /reset-data.
 */
export function useSidekickData() {
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<SidekickData>(DEFAULT_SIDEKICK_DATA);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      const key = getStorageKey(user?.id ?? null);
      setData(readStored(key));
    });
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id ?? null;
      setUserId(id);
      const key = getStorageKey(id);
      setData(readStored(key));
    });
    return () => subscription.unsubscribe();
  }, []);

  const storageKey = getStorageKey(userId);

  const setValue = (value: SidekickData | ((prev: SidekickData) => SidekickData)) => {
    const next = typeof value === "function" ? value(data) : value;
    setData(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (e) {
        console.warn("Error writing sidekick-data:", e);
      }
    }
  };

  return { data, setData: setValue };
}
