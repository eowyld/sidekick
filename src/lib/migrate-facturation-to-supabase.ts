import { createClient, getSessionUser } from "@/lib/supabase";
import { getStorageKey, type SidekickData } from "@/lib/sidekick-store";

const FLAG = "facturation_migrated_to_supabase";
const SCOPE_MAP_KEY = "incomes:invoice-status-scope-map";

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Migration one-shot des dernières données de facturation restées en
 * localStorage :
 *
 *   - `sidekick-data-{userId}.preferences.invoiceTemplate` / `invoiceFooterNote`
 *     → colonnes `invoice_template` / `invoice_footer_note` de `user_preferences`
 *   - clé `incomes:invoice-status-scope-map` (facture → statut juridique)
 *     → colonne `statut_juridique_id` de `user_invoices`
 *
 * Idempotente, et non destructrice : on n'écrase jamais une valeur déjà posée
 * en base par un localStorage potentiellement plus ancien. Le rattachement
 * n'est écrit que sur les factures qui n'en ont pas encore.
 */
export async function migrateFacturationToSupabase(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(FLAG) === "done") return;

  const supabase = createClient();
  const {
    data: { user },
  } = await getSessionUser(supabase);
  if (!user) return; // réessaiera au prochain chargement authentifié

  const blob = readJson<Partial<SidekickData>>(getStorageKey(user.id));
  // Le logo n'est plus dans le modèle de facture depuis le 22/09 : il part
  // dans `artist_logo` (identité de l'artiste).
  const { logoDataUrl: localLogo, ...localTemplateRest } = (blob?.preferences?.invoiceTemplate ?? {}) as Record<string, unknown> & { logoDataUrl?: string };
  const localTemplate = blob?.preferences?.invoiceTemplate ? localTemplateRest : null;
  const localFooter = blob?.preferences?.invoiceFooterNote ?? null;
  const scopeMap = readJson<Record<string, string>>(SCOPE_MAP_KEY) ?? {};

  // ─── Préférences de facturation ────────────────────────────────────────────

  if (localTemplate || localFooter || localLogo) {
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("invoice_template, invoice_footer_note, artist_logo")
      .maybeSingle();

    const payload: Record<string, unknown> = {};
    if (localTemplate && !prefs?.invoice_template) payload.invoice_template = localTemplate;
    if (localFooter && !prefs?.invoice_footer_note) payload.invoice_footer_note = localFooter;
    if (localLogo && !prefs?.artist_logo) payload.artist_logo = localLogo;

    if (Object.keys(payload).length > 0) {
      const { error } = await supabase.from("user_preferences").upsert({
        user_id: user.id,
        updated_at: new Date().toISOString(),
        ...payload,
      });
      if (error) return; // pas de flag → nouvelle tentative au prochain chargement
    }
  }

  // ─── Rattachement facture → statut juridique ───────────────────────────────

  const scopedIds = Object.keys(scopeMap).filter((id) => scopeMap[id]);
  if (scopedIds.length > 0) {
    // Seules les factures encore sans rattachement en base sont concernées :
    // une valeur déjà écrite est plus récente que le localStorage.
    const { data: rows, error: readError } = await supabase
      .from("user_invoices")
      .select("id")
      .in("id", scopedIds)
      .is("statut_juridique_id", null);

    if (readError) return;

    // Un statut supprimé depuis laisserait une clé étrangère orpheline.
    const { data: statusRows } = await supabase.from("user_admin_statuses").select("id");
    const knownStatusIds = new Set((statusRows ?? []).map((s) => s.id as string));

    for (const row of rows ?? []) {
      const statutId = scopeMap[row.id as string];
      if (!knownStatusIds.has(statutId)) continue;
      const { error } = await supabase
        .from("user_invoices")
        .update({ statut_juridique_id: statutId })
        .eq("id", row.id)
        .eq("user_id", user.id);
      if (error) return;
    }
  }

  localStorage.setItem(FLAG, "done");
}
