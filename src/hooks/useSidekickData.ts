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
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [data, setData] = useState<SidekickData>(() => {
    // Première lecture synchronisée côté client pour éviter le flash d'état par défaut
    // (préférences de modules, etc.) avant le chargement Supabase.
    if (typeof window === "undefined") return DEFAULT_SIDEKICK_DATA;
    const initialKey = getStorageKey(null);
    return readStored(initialKey);
  });

  useEffect(() => {
    const supabase = createClient();
    const applyUserPrefs = (uid: string | null) => {
      setUserId(uid);
      const key = getStorageKey(uid);
      setData(readStored(key));
      setPreferencesReady(true);
    };
    supabase.auth.getUser().then(({ data: { user } }) => {
      applyUserPrefs(user?.id ?? null);
    });
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUserPrefs(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const storageKey = getStorageKey(userId);

  const setValue = (value: SidekickData | ((prev: SidekickData) => SidekickData)) => {
    setData((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch (e) {
          console.warn("Error writing sidekick-data:", e);
        }
      }
      return next;
    });
  };

  return { data, setData: setValue, preferencesReady };
}
