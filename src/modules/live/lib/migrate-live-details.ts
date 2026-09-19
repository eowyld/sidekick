import type { SupabaseClient } from "@supabase/supabase-js";
import type { LiveDetails } from "./live-model";
function read(key: string): Record<string, unknown> {
    try {
        const raw = localStorage.getItem(key);
        const value = raw ? JSON.parse(raw) : {};
        return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    }
    catch {
        return {};
    }
}
/** Import only matching owned rows, retaining the browser copy until verified by the user. */
export async function migrateLiveDetails(client: SupabaseClient, userId: string, dates: Record<string, unknown>[], rehearsals: Record<string, unknown>[]) {
    if (typeof window === "undefined")
        return;
    const sources = { transports: read("live:tour-dates:transports"), lodgings: read("live:tour-dates:lodgings"), documents: read("live:tour-dates:documents"), timetables: read("live:tour-dates:timetables"), lists: read("live:representations-material-by-date"), rehearsalLists: read("live:rehearsals-material-by-rehearsal") };
    for (const [rows, table, rehearsal] of [[dates, "user_tour_dates", false], [rehearsals, "user_rehearsals", true]] as const) {
        for (const row of rows) {
            const old = (row.details ?? {}) as LiveDetails;
            if (old.legacyImported)
                continue;
            const id = String(row.id);
            const list = (rehearsal ? sources.rehearsalLists : sources.lists)[id];
            const patch: Record<string, unknown> = {};
            const details: LiveDetails = { ...old, legacyImported: true };
            if (typeof list === "string" && !old.equipmentListIds)
                details.equipmentListIds = [list];
            if (!rehearsal) {
                for (const key of ["transports", "lodgings", "documents"] as const) {
                    if (!old[key] && Array.isArray(sources[key][id]))
                        Object.assign(details, { [key]: sources[key][id] });
                }
                if (Array.isArray(sources.timetables[id]) && !(row.timetable as unknown[])?.length)
                    patch.timetable = sources.timetables[id];
            }
            // Don't write merely because the hook mounted: only rows with legacy content need migration.
            if (Object.keys(details).length === Object.keys(old).length + 1 && !patch.timetable)
                continue;
            patch.details = details;
            const { error } = await client.from(table).update(patch).eq("id", row.id).eq("user_id", userId);
            if (error)
                throw new Error("Impossible de reprendre les anciennes informations logistiques. Réessaie sans effacer les données de ton navigateur.");
            Object.assign(row, patch);
        }
    }
}
