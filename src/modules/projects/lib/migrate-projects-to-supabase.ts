import { createClient, getSessionUser } from "@/lib/supabase";
import type { Project } from "@/lib/sidekick-store";

const FLAG = "projects_migrated_to_supabase";

/**
 * Migration one-shot des projets stockés en localStorage (ancien blob
 * `sidekick-data-{userId}`) vers la table Supabase `user_projects`.
 * Idempotente : ne fait rien si déjà migré ou si aucun projet local.
 */
export async function migrateProjectsToSupabase(localProjects: Project[]): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(FLAG) === "done") return;
  if (!localProjects || localProjects.length === 0) {
    localStorage.setItem(FLAG, "done");
    return;
  }

  const supabase = createClient();
  const { data: { user } } = await getSessionUser(supabase);
  if (!user) return; // réessaiera au prochain chargement authentifié

  // Ne pas écraser si des projets existent déjà côté Supabase
  const { count } = await supabase
    .from("user_projects")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    localStorage.setItem(FLAG, "done");
    return;
  }

  const rows = localProjects.map((p) => ({
    id: p.id,
    user_id: user.id,
    title: p.title,
    description: p.description ?? "",
    status: p.status,
    cover: p.cover ?? "",
    images: p.images ?? [],
    sectors: p.sectors ?? [],
    members: p.members ?? [],
    linked_albums: p.linkedAlbums ?? [],
    linked_tracks: p.linkedTracks ?? [],
    linked_sessions: p.linkedSessions ?? [],
    linked_works: p.linkedWorks ?? [],
    linked_tour_dates: p.linkedTourDates ?? [],
    linked_rehearsals: p.linkedRehearsals ?? [],
    linked_statut_ids: (p as Partial<Project>).linkedStatutIds ?? [],
    key_dates: (p as Partial<Project>).keyDates ?? [],
    notes: p.notes ?? "",
    target_date: p.targetDate || null,
    pinned: p.pinned ?? false,
    pinned_order: p.pinnedOrder ?? 0,
    manual_milestones: p.manualMilestones ?? {
      editionWritingCompositionDone: false,
      liveConceptDone: false,
      liveSetlistDone: false,
      liveTeamDone: false,
    },
    objectives: p.objectives ?? [],
    milestone_states: p.milestoneStates ?? {},
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }));

  const { error } = await supabase.from("user_projects").insert(rows);
  if (!error) localStorage.setItem(FLAG, "done");
  // En cas d'erreur : pas de flag → nouvelle tentative au prochain chargement.
}
