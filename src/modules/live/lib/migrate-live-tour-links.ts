import type { SupabaseClient } from "@supabase/supabase-js";
import type { LiveDetails } from "./live-model";

/**
 * Reprise du 21/09 : un événement rattaché à une tournée mais pas à un
 * spectacle reçoit le spectacle de sa tournée. Depuis la refonte,
 * `details.productionId` est la seule source pour « quel spectacle ».
 *
 * Idempotente : seules les lignes à compléter sont écrites. Un échec n'est pas
 * bloquant, contrairement à `migrateLiveDetails` : rien n'est perdu, la ligne
 * reste visible dans sa tournée et la reprise retentera au prochain chargement.
 */
export async function migrateLiveTourLinks(client: SupabaseClient, userId: string, productions: Record<string, unknown>[], tables: [string, Record<string, unknown>[]][]) {
    const showOfTour = new Map<string, string>();
    for (const row of productions) {
        const data = (row.data ?? {}) as { productionId?: string };
        if (row.kind === "tour" && data.productionId)
            showOfTour.set(String(row.id), data.productionId);
    }
    if (!showOfTour.size)
        return;
    for (const [table, rows] of tables) {
        for (const row of rows) {
            const details = (row.details ?? {}) as LiveDetails;
            const show = details.tourId ? showOfTour.get(details.tourId) : undefined;
            if (!show || details.productionId)
                continue;
            const next: LiveDetails = { ...details, productionId: show };
            const { error } = await client.from(table).update({ details: next }).eq("id", row.id).eq("user_id", userId);
            if (error)
                return;
            row.details = next;
        }
    }
}
