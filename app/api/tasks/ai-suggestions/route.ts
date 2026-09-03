import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase-server";
import { getPostHogClient } from "@/lib/posthog-server";

const SuggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        title: z.string(),
        sector: z.enum([
          "Live",
          "Phono",
          "Admin",
          "Marketing",
          "Edition",
          "Revenus",
          "Autre",
        ]),
        reason: z.string(),
      })
    )
    .max(8),
});

function buildPrompt(body: {
  tasks: Array<{ title: string; sector: string; status: string }>;
  calendarEvents: Array<{ title: string; date: string }>;
  enabledModules: string[];
  aiInstructions: Record<string, string>;
  ruleSuggestions?: Array<{ title: string; sector: string }>;
  today: string;
}): string {
  const taskLines =
    body.tasks.length > 0
      ? body.tasks.map((t) => `- "${t.title}" (${t.sector}, ${t.status})`).join("\n")
      : "Aucune tâche active.";

  const eventLines =
    body.calendarEvents.length > 0
      ? body.calendarEvents.map((e) => `- ${e.date}: ${e.title}`).join("\n")
      : "Aucun événement à venir.";

  const instructionLines = Object.entries(body.aiInstructions)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const ruleLines =
    body.ruleSuggestions && body.ruleSuggestions.length > 0
      ? body.ruleSuggestions.map((s) => `- "${s.title}" (${s.sector})`).join("\n")
      : null;

  return `Tu es un assistant de productivité pour un artiste musical indépendant.
Analyse ses données et propose jusqu'à 8 tâches concrètes et actionnables.
Chaque suggestion doit être courte (< 60 caractères), précise, et pertinente par rapport aux données fournies.

Date du jour : ${body.today}
Modules actifs : ${body.enabledModules.join(", ")}

Tâches en cours ou à faire :
${taskLines}

Événements à venir (14 prochains jours) :
${eventLines}
${
  instructionLines
    ? `
Instructions spécifiques :
${instructionLines}`
    : ""
}
${
  ruleLines
    ? `
Suggestions déjà générées automatiquement (ne pas dupliquer) :
${ruleLines}`
    : ""
}

Propose des tâches que l'artiste n'a pas encore et qui ont une vraie valeur ajoutée. Justifie chacune en une phrase courte.`;
}

/** Générations réelles autorisées par jour et par compte, `force` compris. */
const MAX_GENERATIONS_PER_DAY = 5;

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    tasks: Array<{ title: string; sector: string; status: string }>;
    calendarEvents: Array<{ title: string; date: string }>;
    enabledModules: string[];
    aiInstructions: Record<string, string>;
    ruleSuggestions?: Array<{ title: string; sector: string }>;
    force?: boolean;
  };

  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("task_suggestions")
    .select("suggestions, generation_count")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  const generationCount = (existing?.generation_count as number | undefined) ?? 0;

  // `force=true` contournait le cache sans aucune borne : le budget Anthropic
  // était à la merci d'un clic répété sur « régénérer ». On sert alors le
  // dernier résultat connu plutôt que de refuser sèchement.
  if (body.force && generationCount >= MAX_GENERATIONS_PER_DAY) {
    return Response.json({
      suggestions: existing?.suggestions ?? [],
      cached: true,
      quotaReached: true,
    });
  }

  // Check Supabase cache (unless force=true)
  if (!body.force) {
    const cached = existing;

    if (cached) {
      getPostHogClient().capture({
        distinctId: user.id,
        event: "ai_suggestions_served_from_cache",
        properties: { date: today },
      });
      return Response.json({
        suggestions: cached.suggestions,
        cached: true,
      });
    }
  }

  // Generate with Claude Haiku
  try {
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: SuggestionSchema,
      prompt: buildPrompt({ ...body, today }),
    });

    // Save to Supabase cache
    await supabase.from("task_suggestions").upsert({
      user_id: user.id,
      date: today,
      suggestions: object.suggestions,
      generation_count: generationCount + 1,
    });

    getPostHogClient().capture({
      distinctId: user.id,
      event: "ai_suggestions_requested",
      properties: { suggestion_count: object.suggestions.length, forced: body.force ?? false },
    });

    return Response.json({ suggestions: object.suggestions, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ai-suggestions] generateObject error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
