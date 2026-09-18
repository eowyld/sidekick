// app/api/dashboard/hero-phrase/route.ts
import { createServerSupabase } from "@/lib/supabase-server";
import { captureServerEvent } from "@/lib/posthog-server";
import type { HeroContextInput } from "@/lib/dashboard-hero-context";

/**
 * Phrase d'accroche du Dashboard — génération IA EN PAUSE avant la bêta.
 *
 * L'appel au modèle Anthropic (`generateObject` + `@ai-sdk/anthropic`) a été
 * retiré. La route renvoie désormais toujours la phrase « fallback » calée sur
 * l'heure de la journée. Le contexte (`selectHeroContext`), le prompt et le
 * schéma Zod sont récupérables dans l'historique git.
 *
 * Pour réactiver : restaurer l'appel `generateObject({ model: anthropic(...) })`.
 */

function fallbackPhrase(now: Date): { phrase: string; accent: string } {
  const h = now.getHours();
  if (h < 12) return { phrase: "Bonne matinée.", accent: "matinée" };
  if (h < 18) return { phrase: "Bonne après-midi.", accent: "après-midi" };
  return { phrase: "Bonne soirée.", accent: "soirée" };
}

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Omit<
    HeroContextInput,
    "today"
  > & { force?: boolean };
  const today = new Date().toISOString().split("T")[0];

  // Cache : une ligne générée aujourd'hui est renvoyée telle quelle.
  if (!body.force) {
    const { data: cached } = await supabase
      .from("user_dashboard_hero")
      .select("phrase, accent, kind, generated_at")
      .eq("user_id", user.id)
      .single();

    if (cached) {
      const generatedDay = new Date(cached.generated_at)
        .toISOString()
        .split("T")[0];
      if (generatedDay === today) {
        captureServerEvent({
          distinctId: user.id,
          event: "dashboard_hero_served_from_cache",
          properties: { date: today, kind: cached.kind },
        });
        return Response.json({
          phrase: cached.phrase,
          accent: cached.accent,
          kind: cached.kind,
          cached: true,
        });
      }
    }
  }

  const fb = fallbackPhrase(new Date());
  await supabase.from("user_dashboard_hero").upsert({
    user_id: user.id,
    phrase: fb.phrase,
    accent: fb.accent,
    kind: "fallback",
    generated_at: new Date().toISOString(),
  });

  return Response.json({ ...fb, kind: "fallback", cached: false });
}
