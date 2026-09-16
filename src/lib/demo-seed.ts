import { createClient, getSessionUser } from "@/lib/supabase";
import type { Sector } from "@/hooks/usePreferencesData";
import {
  calendarRows,
  commonRows,
  royaltyRows,
  sectorRows,
  type SeedRow,
} from "@/lib/demo-seed-data";

/** Table → identifiants créés. Stocké dans user_preferences.demo_seed. */
export type DemoManifest = Record<string, string[]>;

/**
 * Insère le jeu de démonstration et renvoie le manifeste des lignes créées.
 *
 * L'insertion est faite table par table plutôt qu'en une transaction : le
 * client Supabase n'en expose pas depuis le navigateur. Une table qui échoue
 * n'annule donc pas les précédentes — c'est assumé, le manifeste n'enregistre
 * que ce qui a réellement été inséré, et la suppression reste exacte.
 */
export async function seedDemoData(sectors: Sector[]): Promise<DemoManifest> {
  const supabase = createClient();
  const {
    data: { user },
  } = await getSessionUser(supabase);
  if (!user) throw new Error("not_authenticated");

  const tables: Record<string, SeedRow[]> = {
    ...commonRows(),
    user_royalties_manual: royaltyRows(),
  };

  for (const sector of sectors) {
    Object.assign(tables, sectorRows(sector));
  }

  const manifest: DemoManifest = {};

  for (const [table, rows] of Object.entries(tables)) {
    if (rows.length === 0) continue;

    const payload = rows.map((row) => ({ ...row, user_id: user.id }));
    const { error } = await supabase.from(table).insert(payload);

    if (error) {
      console.error(`[demo-seed] insertion échouée sur ${table}`, error);
      continue;
    }

    manifest[table] = rows.map((row) => row.id);
  }

  // Le calendrier a un id uuid généré par la base : on ne peut pas imposer
  // nos identifiants texte. On insère puis on relit les ids retournés.
  const calendar = calendarRows(sectors).map(({ id: _demoKey, ...row }) => ({
    ...row,
    user_id: user.id,
  }));

  if (calendar.length > 0) {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert(calendar)
      .select("id");

    if (error) {
      console.error("[demo-seed] insertion échouée sur calendar_events", error);
    } else if (data) {
      manifest.calendar_events = data.map((r) => r.id as string);
    }
  }

  return manifest;
}

/**
 * Supprime exactement les lignes listées dans le manifeste.
 * Ce que l'utilisateur a saisi lui-même n'est jamais touché.
 */
export async function removeDemoData(manifest: DemoManifest): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await getSessionUser(supabase);
  if (!user) throw new Error("not_authenticated");

  for (const [table, ids] of Object.entries(manifest)) {
    if (!ids || ids.length === 0) continue;

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("user_id", user.id)
      .in("id", ids);

    if (error) {
      console.error(`[demo-seed] suppression échouée sur ${table}`, error);
    }
  }
}
