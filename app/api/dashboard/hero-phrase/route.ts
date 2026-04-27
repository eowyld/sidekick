// app/api/dashboard/hero-phrase/route.ts
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase-server";
import { getPostHogClient } from "@/lib/posthog-server";
import {
  selectHeroContext,
  type HeroContext,
  type HeroContextInput,
} from "@/lib/dashboard-hero-context";

const HeroSchema = z.object({
  phrase: z.string().min(1).max(120),
  accent: z.string().min(1).max(60),
});

function fallbackPhrase(now: Date): { phrase: string; accent: string } {
  const h = now.getHours();
  if (h < 12) return { phrase: "Bonne matinée.", accent: "matinée" };
  if (h < 18) return { phrase: "Bonne après-midi.", accent: "après-midi" };
  return { phrase: "Bonne soirée.", accent: "soirée" };
}

function buildPrompt(ctx: HeroContext): string {
  const base = `Tu es la voix d'un cockpit personnel pour un artiste musical indépendant.
Écris UNE phrase courte (≤ 15 mots), en français, ton tutoiement, sobre et juste, sans exclamation.
Renvoie un JSON avec deux champs : "phrase" (la phrase complète) et "accent" (un fragment de la phrase, 1 à 4 mots, qui mérite d'être mis en valeur). "accent" DOIT être une sous-chaîne exacte de "phrase".`;

  if (ctx.kind === "urgence") {
    const when =
      ctx.task.daysOverdue > 0
        ? `en retard de ${ctx.task.daysOverdue} jour(s)`
        : ctx.task.daysOverdue === 0
          ? "à faire aujourd'hui"
          : "à faire demain";
    return `${base}

Contexte : une tâche urgente (${when}) — "${ctx.task.title}" (secteur ${ctx.task.sector}).
La phrase doit pointer cette urgence sans la nommer mot pour mot. Tu peux personnifier (ex. "dort depuis…", "attend depuis…").`;
  }

  if (ctx.kind === "event") {
    const when =
      ctx.event.daysUntil === 0
        ? "aujourd'hui"
        : ctx.event.daysUntil === 1
          ? "demain"
          : `dans ${ctx.event.daysUntil} jours`;
    return `${base}

Contexte : un événement à venir (${when}) — "${ctx.event.title}" (type ${ctx.event.type}, secteur ${ctx.event.sector}).
La phrase doit évoquer cette échéance proche.`;
  }

  if (ctx.kind === "question") {
    return `${base}

Contexte : pas d'urgence ni d'événement proche. Tirage au sort : "${ctx.subject.title}" (${ctx.subject.kind}).
La phrase doit prendre la forme d'une question ouverte du type "Et si on s'occupait de … aujourd'hui ?" — adapter la formulation pour qu'elle sonne naturelle.`;
  }

  // jamais appelé : kind === "fallback" est traité avant l'appel modèle
  return base;
}

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Omit<HeroContextInput, "today"> & { force?: boolean };
  const today = new Date().toISOString().split("T")[0];

  // Cache check : si une ligne existe et generated_at ≥ début du jour courant → on retourne le cache
  if (!body.force) {
    const { data: cached } = await supabase
      .from("user_dashboard_hero")
      .select("phrase, accent, kind, generated_at")
      .eq("user_id", user.id)
      .single();

    if (cached) {
      const generatedDay = new Date(cached.generated_at).toISOString().split("T")[0];
      if (generatedDay === today) {
        getPostHogClient().capture({
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

  // Sélection du contexte
  const ctx = selectHeroContext({ ...body, today });

  // Fallback : pas d'appel modèle
  if (ctx.kind === "fallback") {
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

  // Génération
  try {
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: HeroSchema,
      prompt: buildPrompt(ctx),
    });

    // Garde-fou : si "accent" n'est pas une sous-chaîne, on le force au premier mot fort
    const accent =
      object.phrase.includes(object.accent) && object.accent.length > 0
        ? object.accent
        : object.phrase.split(/\s+/).slice(0, 2).join(" ");

    await supabase.from("user_dashboard_hero").upsert({
      user_id: user.id,
      phrase: object.phrase,
      accent,
      kind: ctx.kind,
      generated_at: new Date().toISOString(),
    });

    getPostHogClient().capture({
      distinctId: user.id,
      event: "dashboard_hero_generated",
      properties: { kind: ctx.kind, forced: body.force ?? false },
    });

    return Response.json({ phrase: object.phrase, accent, kind: ctx.kind, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[hero-phrase] generateObject error:", message);
    // En cas d'échec, on retourne le fallback temps-de-jour, sans le cacher
    const fb = fallbackPhrase(new Date());
    return Response.json({ ...fb, kind: "fallback", cached: false, error: message });
  }
}
