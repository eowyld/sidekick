# Dashboard Redesign — Cockpit Poétique Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refonte UI/UX de la page `/dashboard` en "cockpit poétique" — phrase hero générée par Claude Haiku (cache 1×/jour), 3 stats inline, bandeau semaine 7 colonnes, tâches en 2 colonnes, sans gamification.

**Architecture:** Le composant `DashboardPage` est décomposé en 3 sous-composants (`DashboardHero`, `DashboardWeekRibbon`, `DashboardTodayList`) plus un orchestrateur. Une nouvelle route POST `/api/dashboard/hero-phrase` génère la phrase via Claude Haiku et la cache dans Supabase, calquée sur `app/api/tasks/ai-suggestions/route.ts`. La logique de sélection du contexte (urgence > événement <7j > question ouverte > fallback) est extraite dans un module `lib` côté serveur pour rester testable en lecture.

**Tech Stack:** Next.js 16 App Router · React Server/Client Components · Supabase (Postgres + RLS) · `ai` SDK + `@ai-sdk/anthropic` · `zod` · SWR · Tailwind · Lucide

**Spec source:** `docs/superpowers/specs/2026-04-26-dashboard-redesign-design.md`

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `supabase/migrations/20260426000000_dashboard_hero.sql` | Create | Table `user_dashboard_hero` + RLS |
| `app/api/dashboard/hero-phrase/route.ts` | Create | Route POST : auth, cache check, contexte, appel modèle, upsert |
| `src/lib/dashboard-hero-context.ts` | Create | Sélection du contexte (priorité urgence > event <7j > question > fallback) — pur, sans I/O |
| `src/hooks/useDashboardHero.ts` | Create | Hook SWR client : POST le contexte, retourne `{ phrase, accent, kind, loading }` |
| `src/modules/dashboard/components/DashboardHero.tsx` | Create | Pulse + label date/heure + phrase hero + 3 stats |
| `src/modules/dashboard/components/DashboardWeekRibbon.tsx` | Create | Bandeau 7 jours, pastilles secteur |
| `src/modules/dashboard/components/DashboardTodayList.tsx` | Create | Tâches `todayFocus` en 2 colonnes |
| `src/modules/dashboard/components/DashboardPage.tsx` | Replace | Orchestrateur — réunit Hero + WeekRibbon + TodayList |
| `src/app/(app)/dashboard/page.tsx` | Replace | Wrapper minimal — retire la Card serveur + SignOutButton (déjà couvert par Header) |
| `app/(app)/dashboard/page.tsx` | Verify only | Wrapper déjà minimal — vérifier qu'il n'a rien à enlever |
| `src/app/(app)/dashboard/sign-out-button.tsx` | Delete | Redondant avec le menu user du Header |

**Test/QA:** Pas de suite de tests dans le projet (cf. `CLAUDE.md`). Vérification par `npx tsc --noEmit`, `npm run lint`, et tour manuel dans `npm run dev` à chaque tâche.

---

## Task 1 : Migration Supabase `user_dashboard_hero`

**Files:**
- Create: `supabase/migrations/20260426000000_dashboard_hero.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- supabase/migrations/20260426000000_dashboard_hero.sql

create table public.user_dashboard_hero (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phrase text not null,
  accent text,
  kind text not null check (kind in ('urgence','event','question','fallback')),
  generated_at timestamptz not null default now()
);

alter table public.user_dashboard_hero enable row level security;

create policy "Users select their own hero phrase"
  on public.user_dashboard_hero for select
  using (auth.uid() = user_id);

create policy "Users insert their own hero phrase"
  on public.user_dashboard_hero for insert
  with check (auth.uid() = user_id);

create policy "Users update their own hero phrase"
  on public.user_dashboard_hero for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

- [ ] **Step 2: Pousser la migration**

Run : `npx supabase db push` (ou la commande utilisée habituellement par le projet — vérifier `package.json` scripts ou le README Supabase).
Expected : la migration s'applique sans erreur, la table apparaît dans le dashboard Supabase.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260426000000_dashboard_hero.sql
git commit -m "feat(dashboard): add user_dashboard_hero table for daily hero phrase cache"
```

---

## Task 2 : Module de sélection du contexte (server-side, pur)

**Files:**
- Create: `src/lib/dashboard-hero-context.ts`

- [ ] **Step 1: Définir les types et la fonction de sélection**

```ts
// src/lib/dashboard-hero-context.ts

export type HeroTask = {
  id: string;
  title: string;
  sector: string;
  status: string;
  deadline: string | null; // ISO date
};

export type HeroEvent = {
  id: string;
  title: string;
  date: string; // ISO date
  type: "representation" | "rehearsal" | "invoice" | "session" | "custom";
  sector?: string;
};

export type HeroProject = {
  id: string;
  title: string;
};

export type HeroContextInput = {
  tasks: HeroTask[];
  events: HeroEvent[];
  projects: HeroProject[];
  today: string; // ISO date YYYY-MM-DD
};

export type HeroContextKind = "urgence" | "event" | "question" | "fallback";

export type HeroContext =
  | {
      kind: "urgence";
      task: { title: string; deadline: string; sector: string; daysOverdue: number };
    }
  | {
      kind: "event";
      event: { title: string; type: string; sector: string; date: string; daysUntil: number };
    }
  | {
      kind: "question";
      subject: { title: string; kind: "task" | "event" | "project" };
    }
  | { kind: "fallback" };

function diffInDays(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00`);
  const to = new Date(`${toISO}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function selectHeroContext(input: HeroContextInput): HeroContext {
  const { tasks, events, projects, today } = input;

  // 1. Urgence : tâche non terminée avec deadline ≤ today + 1
  const urgentTasks = tasks
    .filter((t) => t.status !== "done" && t.deadline)
    .map((t) => ({ task: t, daysOverdue: diffInDays(t.deadline as string, today) }))
    .filter((x) => x.daysOverdue >= -1) // -1 = demain, 0 = aujourd'hui, >0 = en retard
    .sort((a, b) => b.daysOverdue - a.daysOverdue); // le plus en retard en premier

  if (urgentTasks.length > 0) {
    const top = urgentTasks[0];
    return {
      kind: "urgence",
      task: {
        title: top.task.title,
        deadline: top.task.deadline as string,
        sector: top.task.sector,
        daysOverdue: top.daysOverdue,
      },
    };
  }

  // 2. Événement <7j
  const upcomingEvents = events
    .map((e) => ({ event: e, daysUntil: diffInDays(today, e.date) }))
    .filter((x) => x.daysUntil >= 0 && x.daysUntil <= 7)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  if (upcomingEvents.length > 0) {
    const top = upcomingEvents[0];
    return {
      kind: "event",
      event: {
        title: top.event.title,
        type: top.event.type,
        sector: top.event.sector ?? "other",
        date: top.event.date,
        daysUntil: top.daysUntil,
      },
    };
  }

  // 3. Question ouverte : tirage au sort
  const candidates: Array<{ title: string; kind: "task" | "event" | "project" }> = [
    ...tasks
      .filter((t) => t.status !== "done")
      .map((t) => ({ title: t.title, kind: "task" as const })),
    ...events
      .filter((e) => diffInDays(today, e.date) > 7)
      .map((e) => ({ title: e.title, kind: "event" as const })),
    ...projects.map((p) => ({ title: p.title, kind: "project" as const })),
  ];

  if (candidates.length > 0) {
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return { kind: "question", subject: pick };
  }

  // 4. Fallback
  return { kind: "fallback" };
}
```

- [ ] **Step 2: Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/lib/dashboard-hero-context.ts
git commit -m "feat(dashboard): add hero context selection (urgence/event/question/fallback)"
```

---

## Task 3 : Route API `/api/dashboard/hero-phrase`

**Files:**
- Create: `app/api/dashboard/hero-phrase/route.ts`

- [ ] **Step 1: Écrire la route**

```ts
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
```

- [ ] **Step 2: Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : aucune erreur.

- [ ] **Step 3: Tester la route à la main avec curl (dev server lancé)**

Lance `npm run dev` dans un terminal. Dans un autre :

```bash
# Login dans le navigateur d'abord pour récupérer le cookie de session.
# Puis tester avec un payload minimal :
curl -X POST http://localhost:3000/api/dashboard/hero-phrase \
  -H "Content-Type: application/json" \
  -b "$(cat /path/to/cookies.txt)" \
  -d '{"tasks":[],"events":[],"projects":[]}'
```

Expected : une réponse JSON avec `phrase`, `accent`, `kind: "fallback"` (puisque le payload est vide). `kind` peut aussi être autre si l'utilisateur a une ligne en cache du jour.

- [ ] **Step 4: Commit**

```bash
git add app/api/dashboard/hero-phrase/route.ts
git commit -m "feat(dashboard): add hero phrase API route with Claude Haiku + daily cache"
```

---

## Task 4 : Hook client `useDashboardHero`

**Files:**
- Create: `src/hooks/useDashboardHero.ts`

- [ ] **Step 1: Écrire le hook**

```ts
// src/hooks/useDashboardHero.ts
"use client";

import useSWR from "swr";
import type { HeroContextInput } from "@/lib/dashboard-hero-context";

type HeroResponse = {
  phrase: string;
  accent: string;
  kind: "urgence" | "event" | "question" | "fallback";
  cached?: boolean;
};

const fetcher = async (
  _key: string,
  payload: Omit<HeroContextInput, "today">,
): Promise<HeroResponse> => {
  const res = await fetch("/api/dashboard/hero-phrase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Hero fetch failed: ${res.status}`);
  return res.json();
};

export function useDashboardHero(payload: Omit<HeroContextInput, "today"> | null) {
  const key = payload ? ["dashboard-hero", JSON.stringify(payload)] as const : null;

  const { data, error, isLoading } = useSWR<HeroResponse>(
    key,
    () => fetcher("dashboard-hero", payload as Omit<HeroContextInput, "today">),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60_000,
    },
  );

  return {
    phrase: data?.phrase ?? null,
    accent: data?.accent ?? null,
    kind: data?.kind ?? null,
    loading: isLoading,
    error,
  };
}
```

- [ ] **Step 2: Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useDashboardHero.ts
git commit -m "feat(dashboard): add useDashboardHero SWR hook"
```

---

## Task 5 : Composant `DashboardHero`

**Files:**
- Create: `src/modules/dashboard/components/DashboardHero.tsx`

- [ ] **Step 1: Écrire le composant**

```tsx
// src/modules/dashboard/components/DashboardHero.tsx
"use client";

import { cn } from "@/lib/utils";

type Stat = { value: number; label: string; accent?: boolean };

type Props = {
  now: Date;
  phrase: string | null;
  accent: string | null;
  loading: boolean;
  stats: [Stat, Stat, Stat];
};

function formatHeader(now: Date): string {
  const day = now.toLocaleDateString("fr-FR", { weekday: "long" });
  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time.replace(":", "h")}`;
}

function renderPhraseWithAccent(phrase: string, accent: string | null) {
  if (!accent || !phrase.includes(accent)) {
    return <>{phrase}</>;
  }
  const idx = phrase.indexOf(accent);
  return (
    <>
      {phrase.slice(0, idx)}
      <em className="not-italic font-light text-[#F0FF00]">{accent}</em>
      {phrase.slice(idx + accent.length)}
    </>
  );
}

export function DashboardHero({ now, phrase, accent, loading, stats }: Props) {
  return (
    <div>
      <div className="flex items-center text-[10px] uppercase tracking-[0.22em] text-[#F5F5F5]/40">
        <span className="mr-2 inline-block h-[6px] w-[6px] rounded-full bg-[#F0FF00] shadow-[0_0_10px_#F0FF00]" />
        {formatHeader(now)}
      </div>

      <h1
        className={cn(
          "mt-5 max-w-[780px] text-[44px] font-extralight leading-[1.08] tracking-[-0.02em] text-[#F5F5F5]",
          loading && "opacity-40",
        )}
      >
        {phrase ? renderPhraseWithAccent(phrase, accent) : "…"}
      </h1>

      <div className="mt-10 flex items-baseline gap-14 border-b border-[rgba(245,245,245,0.08)] pb-6">
        {stats.map((s, i) => (
          <div key={i} className="flex items-baseline gap-3">
            <span
              className={cn(
                "text-[36px] font-extralight leading-none tracking-[-0.02em]",
                s.accent ? "text-[#F0FF00]" : "text-[#F5F5F5]",
              )}
            >
              {s.value}
            </span>
            <span className="max-w-[110px] text-[11px] leading-[1.3] text-[#F5F5F5]/55">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/modules/dashboard/components/DashboardHero.tsx
git commit -m "feat(dashboard): add DashboardHero (pulse + phrase + 3 stats)"
```

---

## Task 6 : Composant `DashboardWeekRibbon`

**Files:**
- Create: `src/modules/dashboard/components/DashboardWeekRibbon.tsx`

- [ ] **Step 1: Écrire le composant**

```tsx
// src/modules/dashboard/components/DashboardWeekRibbon.tsx
"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type RibbonEvent = {
  id: string;
  title: string;
  sector: "live" | "phono" | "admin" | "marketing" | "edition" | "revenus" | "other";
};

const SECTOR_DOT: Record<RibbonEvent["sector"], string> = {
  live: "bg-blue-400",
  phono: "bg-red-400",
  admin: "bg-violet-400",
  marketing: "bg-emerald-400",
  edition: "bg-cyan-400",
  revenus: "bg-orange-400",
  other: "bg-[#F5F5F5]/40",
};

type Props = {
  weekDays: Date[]; // 7 dates, du lundi au dimanche
  todayKey: string; // YYYY-MM-DD
  eventsByDate: Record<string, RibbonEvent[]>; // clé YYYY-MM-DD
};

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DashboardWeekRibbon({ weekDays, todayKey, eventsByDate }: Props) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[9px] uppercase tracking-[0.22em] text-[#F5F5F5]/35">
          Cette semaine
        </h2>
        <Link
          href="/calendar"
          className="flex items-center gap-1 text-[10px] text-[#F5F5F5]/40 transition-colors hover:text-[#F0FF00]"
        >
          calendrier <ChevronRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-px border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.08)]">
        {weekDays.map((day) => {
          const key = toDateKey(day);
          const isToday = key === todayKey;
          const events = eventsByDate[key] ?? [];
          const visible = events.slice(0, 2);
          const overflow = events.length - visible.length;
          const dayLabel = day
            .toLocaleDateString("fr-FR", { weekday: "short" })
            .replace(".", "");

          return (
            <div
              key={key}
              className={cn(
                "flex min-h-[110px] flex-col bg-[#0c0c0c] px-3 py-3.5",
                isToday && "bg-[rgba(240,255,0,0.04)]",
              )}
            >
              <div
                className={cn(
                  "text-[9px] uppercase tracking-[0.18em]",
                  isToday ? "text-[#F0FF00]" : "text-[#F5F5F5]/35",
                )}
              >
                {dayLabel}
              </div>
              <div
                className={cn(
                  "mt-0.5 text-[24px] font-extralight leading-none tracking-[-0.02em]",
                  isToday ? "text-[#F0FF00]" : "text-[#F5F5F5]",
                )}
              >
                {day.getDate()}
              </div>
              <div className="mt-3 flex flex-col gap-1">
                {visible.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-1.5 text-[10px] leading-[1.3] text-[#F5F5F5]/70"
                  >
                    <span className={cn("h-[4px] w-[4px] shrink-0 rounded-full", SECTOR_DOT[e.sector])} />
                    <span className="truncate">{e.title}</span>
                  </div>
                ))}
                {overflow > 0 && (
                  <span className="text-[10px] text-[#F5F5F5]/40">+{overflow}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/modules/dashboard/components/DashboardWeekRibbon.tsx
git commit -m "feat(dashboard): add DashboardWeekRibbon (7-col strip with sector dots)"
```

---

## Task 7 : Composant `DashboardTodayList`

**Files:**
- Create: `src/modules/dashboard/components/DashboardTodayList.tsx`

- [ ] **Step 1: Écrire le composant**

```tsx
// src/modules/dashboard/components/DashboardTodayList.tsx
"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type TodayTask = {
  id: string;
  title: string;
  deadline: string | null; // ISO YYYY-MM-DD
};

type Props = {
  tasks: TodayTask[];
  today: string; // YYYY-MM-DD
};

function whenLabel(deadline: string | null, today: string): { text: string; urgent: boolean } {
  if (!deadline) return { text: "", urgent: false };
  if (deadline < today) return { text: "en retard", urgent: true };
  if (deadline === today) return { text: "aujourd'hui", urgent: true };
  const tomorrow = new Date(`${today}T00:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = tomorrow.toISOString().split("T")[0];
  if (deadline === tomorrowKey) return { text: "demain", urgent: false };
  // Sinon : libellé court
  const d = new Date(`${deadline}T00:00:00`);
  return {
    text: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    urgent: false,
  };
}

export function DashboardTodayList({ tasks, today }: Props) {
  const left = tasks.slice(0, Math.ceil(tasks.length / 2));
  const right = tasks.slice(Math.ceil(tasks.length / 2));

  const renderColumn = (col: TodayTask[]) => (
    <div>
      {col.map((task) => {
        const w = whenLabel(task.deadline, today);
        return (
          <div
            key={task.id}
            className="flex items-baseline gap-3 border-b border-[rgba(245,245,245,0.06)] py-2.5"
          >
            <span className="block h-[4px] w-[4px] shrink-0 -translate-y-0.5 rounded-full bg-[#F0FF00]/70" />
            <span className="flex-1 text-[14px] font-normal text-[#F5F5F5]">{task.title}</span>
            <span
              className={cn(
                "text-[11px] font-light",
                w.urgent ? "text-[#F0FF00]" : "text-[#F5F5F5]/45",
              )}
            >
              {w.text}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <section className="mt-9">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[9px] uppercase tracking-[0.22em] text-[#F5F5F5]/35">
          Aujourd'hui
        </h2>
        <Link
          href="/tasks"
          className="flex items-center gap-1 text-[10px] text-[#F5F5F5]/40 transition-colors hover:text-[#F0FF00]"
        >
          tout voir <ChevronRight size={12} />
        </Link>
      </div>

      {tasks.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-[#F5F5F5]/30">
          Aucune tâche pour aujourd'hui.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-x-16 md:grid-cols-2">
          {renderColumn(left)}
          {renderColumn(right)}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/modules/dashboard/components/DashboardTodayList.tsx
git commit -m "feat(dashboard): add DashboardTodayList (2-col tasks with when labels)"
```

---

## Task 8 : Refonte de l'orchestrateur `DashboardPage`

**Files:**
- Replace: `src/modules/dashboard/components/DashboardPage.tsx`

- [ ] **Step 1: Remplacer le contenu du fichier**

```tsx
// src/modules/dashboard/components/DashboardPage.tsx
"use client";

import { useMemo } from "react";
import { mutate } from "swr";
import { useSidekickData } from "@/hooks/useSidekickData";
import { useTasksData } from "@/hooks/useTasksData";
import { useLiveData } from "@/hooks/useLiveData";
import { useIncomesData } from "@/hooks/useIncomesData";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useCalendarData } from "@/hooks/useCalendarData";
import { useDashboardHero } from "@/hooks/useDashboardHero";
import { PageError } from "@/components/ui/page-error";
import { DashboardHero } from "./DashboardHero";
import { DashboardWeekRibbon, type RibbonEvent } from "./DashboardWeekRibbon";
import { DashboardTodayList, type TodayTask } from "./DashboardTodayList";

// ─── Helpers dates ────────────────────────────────────────────────────────────

function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) {
    const d = new Date(parseInt(fr[3], 10), parseInt(fr[2], 10) - 1, parseInt(fr[1], 10));
    return isNaN(d.getTime()) ? null : d;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { data, preferencesReady } = useSidekickData();
  const enabled = data.preferences?.enabledModules ?? {
    live: true, phono: true, admin: true, marketing: true, edition: true, revenus: true,
  };

  const { tasks, error: tasksError } = useTasksData();
  const { tourDates, rehearsals, error: liveError } = useLiveData();
  const { invoices, error: incomesError } = useIncomesData();
  const { sessions, error: phonoError } = usePhonoData();
  const { customEvents, error: calendarError } = useCalendarData();

  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const todayKey = toDateKey(today);

  // Semaine [lundi → dimanche]
  const weekDays = useMemo(() => {
    const offsetToMonday = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - offsetToMonday);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [today]);

  // Construit la map d'événements pour le ribbon
  const weekEventsByDate = useMemo<Record<string, RibbonEvent[]>>(() => {
    if (!preferencesReady) return {};
    const startKey = toDateKey(weekDays[0]);
    const endKey = toDateKey(weekDays[6]);
    const inRange = (d: Date | null) => d && toDateKey(d) >= startKey && toDateKey(d) <= endKey;
    const map: Record<string, RibbonEvent[]> = {};
    const push = (d: Date, e: RibbonEvent) => {
      const k = toDateKey(d);
      if (!map[k]) map[k] = [];
      map[k].push(e);
    };

    if (enabled.live) {
      tourDates.forEach((t: { id: number; city: string; venue: string; date: string }) => {
        const d = parseDate(t.date);
        if (inRange(d)) push(d!, { id: `live-rep-${t.id}`, title: `${t.venue} – ${t.city}`, sector: "live" });
      });
      rehearsals.forEach((r: { id: string; date: string; location: string; label?: string }) => {
        const d = parseDate(r.date);
        if (inRange(d)) push(d!, { id: `live-reh-${r.id}`, title: r.label || r.location || "Répétition", sector: "live" });
      });
    }
    if (enabled.revenus) {
      invoices.forEach((i: { id: string; dueDate: string; number: string; client: string }) => {
        const d = parseDate(i.dueDate);
        if (inRange(d)) push(d!, { id: `rev-inv-${i.id}`, title: `Facture ${i.number}`, sector: "revenus" });
      });
    }
    if (enabled.phono) {
      sessions.forEach((s: { id: string; date: string; title: string; location: string }) => {
        const d = parseDate(s.date);
        if (inRange(d)) push(d!, { id: `phono-ses-${s.id}`, title: s.title || s.location || "Session", sector: "phono" });
      });
    }
    customEvents.forEach((e: { id: string; title: string; date: string; sector?: RibbonEvent["sector"] }) => {
      const sector = e.sector ?? "other";
      const moduleEnabled =
        sector === "live" ? enabled.live :
        sector === "phono" ? enabled.phono :
        sector === "admin" ? enabled.admin :
        sector === "marketing" ? enabled.marketing :
        sector === "edition" ? enabled.edition :
        sector === "revenus" ? enabled.revenus :
        true;
      if (!moduleEnabled) return;
      const d = parseDate(e.date);
      if (inRange(d)) push(d!, { id: `custom-${e.id}`, title: e.title || "Événement", sector });
    });

    return map;
  }, [preferencesReady, weekDays, tourDates, rehearsals, invoices, sessions, customEvents, enabled]);

  // Stats
  const todayIso = todayKey;
  const tomorrowIso = useMemo(() => {
    const t = new Date(today); t.setDate(t.getDate() + 1); return toDateKey(t);
  }, [today]);

  const tasksToDoCount = tasks.filter((t) => t.todayFocus && t.status !== "done").length;
  const urgentTasksCount = tasks.filter(
    (t) => t.status !== "done" && t.deadline && t.deadline <= tomorrowIso
  ).length;
  const weekEventsCount = Object.values(weekEventsByDate).reduce((acc, arr) => acc + arr.length, 0);

  // Today list
  const todayTasks: TodayTask[] = tasks
    .filter((t) => t.todayFocus && t.status !== "done")
    .map((t) => ({ id: String(t.id), title: t.title, deadline: t.deadline ?? null }));

  // Hero — payload pour le hook
  const heroPayload = useMemo(() => {
    if (!preferencesReady) return null;
    const upTo7 = (d: Date | null) => d && toDateKey(d) >= todayKey && toDateKey(d) <= toDateKey(new Date(today.getTime() + 7 * 86400000));
    const events: { id: string; title: string; date: string; type: "representation" | "rehearsal" | "invoice" | "session" | "custom"; sector?: string }[] = [];
    tourDates.forEach((t: { id: number; city: string; venue: string; date: string }) => {
      const d = parseDate(t.date);
      if (d) events.push({ id: `live-rep-${t.id}`, title: `${t.venue} – ${t.city}`, date: toDateKey(d), type: "representation", sector: "live" });
    });
    rehearsals.forEach((r: { id: string; date: string; location: string; label?: string }) => {
      const d = parseDate(r.date);
      if (d) events.push({ id: `live-reh-${r.id}`, title: r.label || r.location || "Répétition", date: toDateKey(d), type: "rehearsal", sector: "live" });
    });
    invoices.forEach((i: { id: string; dueDate: string; number: string; client: string }) => {
      const d = parseDate(i.dueDate);
      if (d) events.push({ id: `rev-inv-${i.id}`, title: `Facture ${i.number} – ${i.client}`, date: toDateKey(d), type: "invoice", sector: "revenus" });
    });
    sessions.forEach((s: { id: string; date: string; title: string; location: string }) => {
      const d = parseDate(s.date);
      if (d) events.push({ id: `phono-ses-${s.id}`, title: s.title || s.location || "Session", date: toDateKey(d), type: "session", sector: "phono" });
    });
    customEvents.forEach((e: { id: string; title: string; date: string; sector?: string }) => {
      const d = parseDate(e.date);
      if (d) events.push({ id: `custom-${e.id}`, title: e.title || "Événement", date: toDateKey(d), type: "custom", sector: e.sector });
    });

    const projects = (data.projects ?? []).map((p: { id: string; title: string }) => ({ id: p.id, title: p.title }));

    const heroTasks = tasks
      .filter((t) => t.status !== "done")
      .map((t) => ({
        id: String(t.id),
        title: t.title,
        sector: t.sector ?? "Admin",
        status: t.status,
        deadline: t.deadline ?? null,
      }));

    return { tasks: heroTasks, events, projects };
  }, [preferencesReady, tasks, tourDates, rehearsals, invoices, sessions, customEvents, data.projects, today, todayKey]);

  const { phrase, accent, loading: heroLoading } = useDashboardHero(heroPayload);

  const dataError = tasksError || liveError || incomesError || phonoError || calendarError;
  if (dataError) return (
    <PageError
      title="Impossible de charger le tableau de bord"
      description="Vérifie ta connexion ou réessaie dans quelques instants."
      onRetry={() => {
        mutate("user_tasks");
        mutate("user_live");
        mutate("user_incomes");
        mutate("user_phono");
        mutate("calendar_events");
      }}
    />
  );

  return (
    <div>
      <DashboardHero
        now={now}
        phrase={phrase}
        accent={accent}
        loading={heroLoading}
        stats={[
          { value: tasksToDoCount, label: "tâches à faire" },
          { value: urgentTasksCount, label: "tâches urgentes", accent: urgentTasksCount > 0 },
          { value: weekEventsCount, label: "événements cette semaine" },
        ]}
      />

      <DashboardWeekRibbon
        weekDays={weekDays}
        todayKey={todayKey}
        eventsByDate={weekEventsByDate}
      />

      <DashboardTodayList tasks={todayTasks} today={todayIso} />
    </div>
  );
}
```

- [ ] **Step 2: Vérifier la compilation**

Run : `npx tsc --noEmit`
Expected : aucune erreur. Si les types des hooks (`useTasksData`, etc.) ne correspondent pas aux annotations inline, ajuster les annotations en lisant le fichier source du hook concerné — ne pas modifier le hook.

- [ ] **Step 3: Tour manuel dans le navigateur**

Lance `npm run dev`. Va sur `/dashboard`. Vérifie :
- Le header pulse + date/heure s'affiche
- La phrase hero charge (peut prendre 1-2s la première fois, instant sur les fois suivantes du jour)
- Les 3 stats reflètent les vraies valeurs
- Le bandeau semaine montre 7 colonnes, le jour courant en yellow
- La section "Aujourd'hui" liste les tâches en 2 colonnes
- Aucun crash console
- L'ancienne `Card` (email + user id) et la barre XP ne sont plus là

- [ ] **Step 4: Commit**

```bash
git add src/modules/dashboard/components/DashboardPage.tsx
git commit -m "feat(dashboard): rebuild DashboardPage as cockpit poétique orchestrator"
```

---

## Task 9 : Nettoyage du wrapper de route

**Files:**
- Replace: `src/app/(app)/dashboard/page.tsx`
- Delete: `src/app/(app)/dashboard/sign-out-button.tsx`
- Verify only: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Remplacer `src/app/(app)/dashboard/page.tsx` par un wrapper minimal**

```tsx
// src/app/(app)/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { DashboardPage as DashboardPageContent } from "@/modules/dashboard/components/DashboardPage";

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <DashboardPageContent />;
}
```

- [ ] **Step 2: Supprimer `src/app/(app)/dashboard/sign-out-button.tsx`**

```bash
git rm src/app/(app)/dashboard/sign-out-button.tsx
```

Justification : le `Header` (`src/components/layout/Header.tsx`) expose déjà "Se déconnecter" via le `DropdownMenu` du menu utilisateur (lignes 126-132). Garder ce composant en double crée une dette inutile.

- [ ] **Step 3: Vérifier que `app/(app)/dashboard/page.tsx` est bien minimal**

Run : `cat "app/(app)/dashboard/page.tsx"`
Expected : un fichier de ~5 lignes qui rend juste `<DashboardPage />`. Si ce n'est pas le cas, le mettre au même contenu minimal que celui de l'étape 1 (wrapper avec auth check).

- [ ] **Step 4: Vérifier la compilation et le lint**

Run :
```bash
npx tsc --noEmit
npm run lint
```
Expected : aucune erreur. Aucun import orphelin de `SignOutButton`.

- [ ] **Step 5: Tour manuel**

Va sur `/dashboard` :
- L'ancienne `Card` "Dashboard protege / Session verifiee…" n'apparaît plus
- L'utilisateur peut toujours se déconnecter via le bouton rond yellow en haut à droite (Header → menu → Se déconnecter)
- Le redirect vers `/login` fonctionne si on est délogué

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/dashboard/page.tsx" "app/(app)/dashboard/page.tsx"
git commit -m "chore(dashboard): minimal route wrapper, remove redundant sign-out button"
```

---

## Task 10 : QA finale

**Files:** (aucune modification — pure vérification)

- [ ] **Step 1: TypeScript**

Run : `npx tsc --noEmit`
Expected : zéro erreur.

- [ ] **Step 2: Lint**

Run : `npm run lint`
Expected : zéro erreur (warnings acceptables si déjà présents avant la refonte).

- [ ] **Step 3: Build production**

Run : `npm run build`
Expected : build réussi, pas d'erreur sur `/dashboard` ni sur `/api/dashboard/hero-phrase`.

- [ ] **Step 4: Tour fonctionnel complet (dev server)**

Lance `npm run dev`. Connecté, vérifie chacun des 4 chemins de phrase hero :

1. **Urgence** : crée une tâche avec deadline = aujourd'hui ou hier, recharge la page → la phrase doit évoquer cette urgence (le `kind` retourné par la route est "urgence" — visible en `Network` DevTools).
2. **Événement <7j** : sans tâche urgente, ajoute une date de tour à 3 jours → la phrase doit évoquer l'événement.
3. **Question** : sans urgence ni événement <7j, mais avec ≥1 tâche ou projet → phrase de type "Et si on travaillait sur … ?".
4. **Fallback** : avec un compte vierge → "Bonne {matinée|après-midi|soirée}.".

Pour forcer une régénération sans attendre minuit, supprime la ligne `user_dashboard_hero` de l'utilisateur via l'UI Supabase, ou ajoute `force: true` au payload via DevTools.

- [ ] **Step 5: Vérifier le cache journalier**

Recharge la page deux fois → le second appel doit retourner `cached: true` (visible dans `Network`). Pas de regen Claude.

- [ ] **Step 6: Vérifier le déconnexion via Header**

Clique sur le bouton rond yellow en haut à droite → "Se déconnecter" → redirect vers `/`. RAS.

- [ ] **Step 7: Commit final si tout est vert**

S'il reste des ajustements visuels après le tour manuel (espacements, tailles), les corriger directement dans les composants concernés et créer un commit `style(dashboard): polish spacing/sizes after QA`.

---

## Self-review notes

- Spec coverage : tous les éléments du spec sont couverts (header pulse, hero, 3 stats, bandeau semaine, tâches 2 colonnes, suppression Card+XP+SignOut redondant, route POST, cache journalier, règle de priorité 4 niveaux, fallback temps-de-jour).
- Pas de tests unitaires — le projet n'en a pas (cf. `CLAUDE.md`). La validation passe par `tsc --noEmit`, `npm run lint`, `npm run build`, et tour manuel.
- Le composant `DashboardPage` orchestrateur reste un peu lourd (memo de payloads). Acceptable parce que la logique de dérivation est centralisée et que le risque de re-render se gère via les `useMemo`. Si un futur refactor veut alléger, déplacer la dérivation dans un hook `useDashboardData` est l'évolution naturelle — hors scope ici.
- La signature exacte des hooks (`useTasksData`, `useLiveData`, etc.) peut différer des annotations inline. En cas de conflit lors du `tsc --noEmit` de la Task 8, ajuster les annotations dans `DashboardPage.tsx` à partir des fichiers sources des hooks — ne pas modifier les hooks.
