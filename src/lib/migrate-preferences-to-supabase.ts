import { createClient } from "@/lib/supabase";
import { getStorageKey, type SidekickData } from "@/lib/sidekick-store";

const FLAG = "preferences_migrated_to_supabase";

/**
 * Migration one-shot des préférences de modules stockées en localStorage
 * (blob `sidekick-data-{userId}.preferences.enabledModules`) vers la table
 * Supabase `user_preferences`.
 *
 * Idempotente : ne fait rien si déjà migré, si aucune préférence locale,
 * ou si une ligne existe déjà côté Supabase (on n'écrase jamais la base
 * avec un localStorage potentiellement plus ancien).
 */
export async function migratePreferencesToSupabase(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(FLAG) === "done") return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return; // réessaiera au prochain chargement authentifié

  // La clé est indexée par utilisateur : lire celle de l'utilisateur courant,
  // pas la clé anonyme utilisée par useSidekickData avant résolution de l'auth.
  let localEnabled: Record<string, boolean> | null = null;
  try {
    const raw = window.localStorage.getItem(getStorageKey(user.id));
    const parsed = raw ? (JSON.parse(raw) as Partial<SidekickData>) : null;
    localEnabled = parsed?.preferences?.enabledModules ?? null;
  } catch {
    localEnabled = null;
  }

  if (!localEnabled || Object.keys(localEnabled).length === 0) {
    localStorage.setItem(FLAG, "done");
    return;
  }

  const { count } = await supabase
    .from("user_preferences")
    .select("user_id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    localStorage.setItem(FLAG, "done");
    return;
  }

  const { error } = await supabase.from("user_preferences").insert({
    user_id: user.id,
    enabled_modules: localEnabled,
  });

  if (!error) localStorage.setItem(FLAG, "done");
  // En cas d'erreur : pas de flag → nouvelle tentative au prochain chargement.
}
