"use client";

import { useCallback, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase";
import { DEFAULT_SIDEKICK_DATA } from "@/lib/sidekick-store";

const KEY = "user_preferences";

export type EnabledModules = {
  live: boolean;
  phono: boolean;
  admin: boolean;
  marketing: boolean;
  edition: boolean;
  revenus: boolean;
  projects: boolean;
};

/** Secteurs artistiques proposés au choix à l'inscription. */
export type Sector = "live" | "phono" | "edition";
export const SECTORS: Sector[] = ["live", "phono", "edition"];

const DEFAULT_ENABLED_MODULES = DEFAULT_SIDEKICK_DATA.preferences
  .enabledModules as EnabledModules;

type PreferencesRow = {
  enabled_modules: Partial<EnabledModules>;
  onboarding_completed_at: string | null;
  onboarding_sectors: Sector[];
};

/**
 * Une clé absente vaut "activé" — sémantique historique `enabledModules.x !== false`
 * sur laquelle reposent la Sidebar, les règles de tâches et les filtres de secteur.
 * L'onboarding doit donc écrire `false` explicitement pour les secteurs non choisis,
 * jamais omettre la clé.
 */
function mergeEnabled(stored: Partial<EnabledModules> | null | undefined): EnabledModules {
  return { ...DEFAULT_ENABLED_MODULES, ...(stored ?? {}) };
}

async function fetchPreferences(): Promise<PreferencesRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("enabled_modules, onboarding_completed_at, onboarding_sectors")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null; // aucune ligne encore : l'utilisateur est sur les défauts
  return {
    enabled_modules: (data.enabled_modules as Partial<EnabledModules>) ?? {},
    onboarding_completed_at: (data.onboarding_completed_at as string) ?? null,
    onboarding_sectors: (data.onboarding_sectors as Sector[]) ?? [],
  };
}

export function usePreferencesData() {
  const {
    data: row,
    isLoading,
    error: swrError,
    mutate: mutateLocal,
  } = useSWR<PreferencesRow | null>(KEY, fetchPreferences);

  const error = swrError ? (swrError as Error).message : null;

  // Référence stable tant que la ligne SWR ne change pas : `enabledModules` est
  // une dépendance de useMemo dans Tasks.tsx, un nouvel objet à chaque rendu y
  // relancerait le calcul des règles en boucle.
  const enabledModules = useMemo(() => mergeEnabled(row?.enabled_modules), [row]);

  const persist = useCallback(
    (nextRow: PreferencesRow, payload: Record<string, unknown>) => {
      const snapshot = row ?? null;
      mutateLocal(nextRow, false);

      (async () => {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          mutateLocal(snapshot, false);
          return;
        }

        const { error: upsertError } = await supabase
          .from("user_preferences")
          .upsert({ user_id: user.id, updated_at: new Date().toISOString(), ...payload });

        if (upsertError) {
          mutateLocal(snapshot, false);
        } else {
          mutate(KEY);
        }
      })();
    },
    [row, mutateLocal]
  );

  const setEnabledModules = useCallback(
    (patch: Partial<EnabledModules>) => {
      const nextEnabled = { ...enabledModules, ...patch };
      persist(
        {
          enabled_modules: nextEnabled,
          onboarding_completed_at: row?.onboarding_completed_at ?? null,
          onboarding_sectors: row?.onboarding_sectors ?? [],
        },
        { enabled_modules: nextEnabled }
      );
    },
    [enabledModules, row, persist]
  );

  /**
   * Clôture l'onboarding. Les secteurs non retenus sont écrits à `false`
   * explicitement (cf. mergeEnabled), sinon ils resteraient visibles.
   */
  const completeOnboarding = useCallback(
    (sectors: Sector[]) => {
      const nextEnabled: EnabledModules = {
        ...enabledModules,
        live: sectors.includes("live"),
        phono: sectors.includes("phono"),
        edition: sectors.includes("edition"),
      };
      const completedAt = new Date().toISOString();
      persist(
        {
          enabled_modules: nextEnabled,
          onboarding_completed_at: completedAt,
          onboarding_sectors: sectors,
        },
        {
          enabled_modules: nextEnabled,
          onboarding_completed_at: completedAt,
          onboarding_sectors: sectors,
        }
      );
    },
    [enabledModules, persist]
  );

  return {
    enabledModules,
    setEnabledModules,
    completeOnboarding,
    onboardingCompleted: Boolean(row?.onboarding_completed_at),
    onboardingSectors: row?.onboarding_sectors ?? [],
    /** false tant que le chargement n'a pas eu lieu — évite le flash de sidebar. */
    preferencesReady: !isLoading,
    error,
  };
}
