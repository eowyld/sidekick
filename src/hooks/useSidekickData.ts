"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_SIDEKICK_DATA,
  mergeWithDefaults,
  SIDEKICK_STORAGE_KEY,
  type SidekickData
} from "@/lib/sidekick-store";

function readStored(): SidekickData {
  if (typeof window === "undefined") return DEFAULT_SIDEKICK_DATA;
  try {
    const raw = window.localStorage.getItem(SIDEKICK_STORAGE_KEY);
    const partial = raw ? (JSON.parse(raw) as Partial<SidekickData>) : null;
    return mergeWithDefaults(partial);
  } catch (e) {
    console.warn("Error reading sidekick-data:", e);
    return DEFAULT_SIDEKICK_DATA;
  }
}

/**
 * Données persistant Sidekick (localStorage).
 * Tous les modules y contribuent ; sauvegarde auto, reset via /reset-data ou "npm run reset-data".
 * Les anciennes données sont fusionnées avec les défauts pour garder la structure à jour.
 */
export function useSidekickData() {
  const [data, setData] = useState<SidekickData>(readStored);

  useEffect(() => {
    setData(readStored());
  }, []);

  const setValue = (value: SidekickData | ((prev: SidekickData) => SidekickData)) => {
    const next = typeof value === "function" ? value(data) : value;
    setData(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(SIDEKICK_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn("Error writing sidekick-data:", e);
      }
    }
  };

  return { data, setData: setValue };
}
