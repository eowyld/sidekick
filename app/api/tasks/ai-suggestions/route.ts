import { createServerSupabase } from "@/lib/supabase-server";
import { captureServerEvent } from "@/lib/posthog-server";

/**
 * Suggestions IA des Tâches — EN PAUSE avant la bêta.
 *
 * L'appel au modèle Anthropic (`generateObject` + `@ai-sdk/anthropic`) a été
 * retiré. La route ne génère plus rien : elle se contente de renvoyer les
 * suggestions déjà en cache dans `task_suggestions` (le cas échéant), sinon une
 * liste vide. Le prompt et le schéma Zod sont récupérables dans l'historique
 * git (commit précédant la mise en pause).
 *
 * Pour réactiver : restaurer l'appel `generateObject({ model: anthropic(...) })`
 * et remettre `AI_SUGGESTIONS_ENABLED` à `true` dans
 * `src/modules/tasks/components/AiSuggestions.tsx`.
 */
export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // On lit le corps pour rester compatible avec l'appelant, sans l'exploiter.
  await req.json().catch(() => ({}));

  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("task_suggestions")
    .select("suggestions")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  if (existing?.suggestions) {
    captureServerEvent({
      distinctId: user.id,
      event: "ai_suggestions_served_from_cache",
      properties: { date: today },
    });
    return Response.json({ suggestions: existing.suggestions, cached: true });
  }

  return Response.json({ suggestions: [], disabled: true });
}
