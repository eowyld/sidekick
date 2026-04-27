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
