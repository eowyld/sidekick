"use client";

import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSidekickData } from "@/hooks/useSidekickData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Briefcase, CalendarDays, ChevronRight, DollarSign, Disc2, Megaphone, Mic2, Music2 } from "lucide-react";

type TourDateItem = { id: number; city: string; venue: string; date: string };
type RehearsalItem = { id: number; date: string; location: string; label?: string };
type InvoiceItem = { id: number; dueDate: string; number: string; client: string };
type SessionItem = { id: number; date: string; title: string; location: string };
type CustomCalendarItem = {
  id: string;
  title: string;
  date: string;
  time?: string;
  place?: string;
  sector?: "live" | "phono" | "admin" | "marketing" | "edition" | "revenus" | "other";
};

function parseDate(dateStr: string | undefined): Date | null {
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatEventDate(dateStr: string | undefined): string {
  const d = parseDate(dateStr);
  if (!d) return "";
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

type EventType = "representation" | "rehearsal" | "invoice" | "session" | "custom";

type UpcomingEvent = {
  id: string;
  title: string;
  date: Date;
  dateStr: string;
  type: EventType;
  sector?: CustomCalendarItem["sector"];
};

const EVENT_CONFIG: Record<
  EventType,
  { color: string; bgClass: string; icon: React.ReactNode; label: string }
> = {
  representation: {
    color: "text-blue-600",
    bgClass: "bg-blue-500",
    icon: <Mic2 className="h-3.5 w-3.5" />,
    label: "Live"
  },
  rehearsal: {
    color: "text-blue-600",
    bgClass: "bg-blue-500",
    icon: <Mic2 className="h-3.5 w-3.5" />,
    label: "Live"
  },
  invoice: {
    color: "text-orange-600",
    bgClass: "bg-orange-500",
    icon: <DollarSign className="h-3.5 w-3.5" />,
    label: "Revenus"
  },
  session: {
    color: "text-red-600",
    bgClass: "bg-red-500",
    icon: <Disc2 className="h-3.5 w-3.5" />,
    label: "Phono"
  },
  custom: {
    color: "text-slate-600",
    bgClass: "bg-slate-500",
    icon: <CalendarDays className="h-3.5 w-3.5" />,
    label: "Autre"
  }
};

const CUSTOM_SECTOR_CONFIG: Record<
  NonNullable<CustomCalendarItem["sector"]>,
  { bgClass: string; icon: React.ReactNode; label: string }
> = {
  live: { bgClass: "bg-blue-500", icon: <Mic2 className="h-3.5 w-3.5" />, label: "Live" },
  phono: { bgClass: "bg-red-500", icon: <Disc2 className="h-3.5 w-3.5" />, label: "Phono" },
  admin: { bgClass: "bg-violet-500", icon: <Briefcase className="h-3.5 w-3.5" />, label: "Admin" },
  marketing: { bgClass: "bg-emerald-500", icon: <Megaphone className="h-3.5 w-3.5" />, label: "Marketing" },
  edition: { bgClass: "bg-cyan-500", icon: <Music2 className="h-3.5 w-3.5" />, label: "Edition" },
  revenus: { bgClass: "bg-orange-500", icon: <DollarSign className="h-3.5 w-3.5" />, label: "Revenus" },
  other: { bgClass: "bg-slate-500", icon: <CalendarDays className="h-3.5 w-3.5" />, label: "Autre" }
};

function getEventConfig(event: UpcomingEvent) {
  if (event.type !== "custom") return EVENT_CONFIG[event.type];
  const sector = event.sector ?? "other";
  return CUSTOM_SECTOR_CONFIG[sector] ?? CUSTOM_SECTOR_CONFIG.other;
}

function buildUpcomingEvents(
  representations: TourDateItem[],
  rehearsals: RehearsalItem[],
  invoices: InvoiceItem[],
  sessions: SessionItem[],
  customEvents: CustomCalendarItem[]
): UpcomingEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(today);
  const events: UpcomingEvent[] = [];

  representations.forEach((t) => {
    const d = parseDate(t.date);
    if (!d) return;
    if (toDateKey(d) >= todayKey) {
      events.push({
        id: `live-rep-${t.id}`,
        title: `${t.venue} – ${t.city}`,
        date: d,
        dateStr: t.date,
        type: "representation"
      });
    }
  });
  rehearsals.forEach((r) => {
    const d = parseDate(r.date);
    if (!d) return;
    if (toDateKey(d) >= todayKey) {
      events.push({
        id: `live-rehearsal-${r.id}`,
        title: r.label || r.location || "Répétition",
        date: d,
        dateStr: r.date,
        type: "rehearsal"
      });
    }
  });
  invoices.forEach((i) => {
    const d = parseDate(i.dueDate);
    if (!d) return;
    if (toDateKey(d) >= todayKey) {
      events.push({
        id: `revenus-invoice-${i.id}`,
        title: `Facture ${i.number} – ${i.client}`,
        date: d,
        dateStr: i.dueDate,
        type: "invoice"
      });
    }
  });
  sessions.forEach((s) => {
    const d = parseDate(s.date);
    if (!d) return;
    if (toDateKey(d) >= todayKey) {
      events.push({
        id: `phono-session-${s.id}`,
        title: s.title || s.location || "Session",
        date: d,
        dateStr: s.date,
        type: "session"
      });
    }
  });
  customEvents.forEach((e) => {
    const d = parseDate(e.date);
    if (!d) return;
    if (toDateKey(d) >= todayKey) {
      events.push({
        id: `custom-${e.id}`,
        title: e.title || "Événement personnalisé",
        date: d,
        dateStr: e.date,
        type: "custom",
        sector: e.sector ?? "other"
      });
    }
  });

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events.slice(0, 5);
}

function buildWeekEvents(
  representations: TourDateItem[],
  rehearsals: RehearsalItem[],
  invoices: InvoiceItem[],
  sessions: SessionItem[],
  customEvents: CustomCalendarItem[],
  weekStart: Date,
  weekEnd: Date
): UpcomingEvent[] {
  const startKey = toDateKey(weekStart);
  const endKey = toDateKey(weekEnd);
  const events: UpcomingEvent[] = [];

  representations.forEach((t) => {
    const d = parseDate(t.date);
    if (!d) return;
    const key = toDateKey(d);
    if (key >= startKey && key <= endKey) {
      events.push({
        id: `live-rep-${t.id}`,
        title: `${t.venue} – ${t.city}`,
        date: d,
        dateStr: t.date,
        type: "representation"
      });
    }
  });

  rehearsals.forEach((r) => {
    const d = parseDate(r.date);
    if (!d) return;
    const key = toDateKey(d);
    if (key >= startKey && key <= endKey) {
      events.push({
        id: `live-rehearsal-${r.id}`,
        title: r.label || r.location || "Répétition",
        date: d,
        dateStr: r.date,
        type: "rehearsal"
      });
    }
  });

  invoices.forEach((i) => {
    const d = parseDate(i.dueDate);
    if (!d) return;
    const key = toDateKey(d);
    if (key >= startKey && key <= endKey) {
      events.push({
        id: `revenus-invoice-${i.id}`,
        title: `Facture ${i.number} – ${i.client}`,
        date: d,
        dateStr: i.dueDate,
        type: "invoice"
      });
    }
  });

  sessions.forEach((s) => {
    const d = parseDate(s.date);
    if (!d) return;
    const key = toDateKey(d);
    if (key >= startKey && key <= endKey) {
      events.push({
        id: `phono-session-${s.id}`,
        title: s.title || s.location || "Session",
        date: d,
        dateStr: s.date,
        type: "session"
      });
    }
  });
  customEvents.forEach((e) => {
    const d = parseDate(e.date);
    if (!d) return;
    const key = toDateKey(d);
    if (key >= startKey && key <= endKey) {
      events.push({
        id: `custom-${e.id}`,
        title: e.title || "Événement personnalisé",
        date: d,
        dateStr: e.date,
        type: "custom",
        sector: e.sector ?? "other"
      });
    }
  });

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}

export function DashboardPage() {
  const { data, preferencesReady } = useSidekickData();
  const enabled = data.preferences?.enabledModules ?? {
    live: true,
    phono: true,
    admin: true,
    marketing: true,
    edition: true,
    revenus: true
  };
  const [representations] = useLocalStorage<TourDateItem[]>("live:representations", []);
  const [rehearsals] = useLocalStorage<RehearsalItem[]>("live:rehearsals", []);
  const [invoices] = useLocalStorage<InvoiceItem[]>("incomes:invoices", []);
  const [sessions] = useLocalStorage<SessionItem[]>("phono:sessions-studio", []);
  const [customEvents] = useLocalStorage<CustomCalendarItem[]>("calendar:custom-events", []);

  const todaysTasks = data.tasks
    .filter((t) => !t.done)
    .map((t) => ({
      ...t,
      description: t.description ?? "",
      deadline: t.deadline ?? "",
      sector: t.sector ?? "Admin"
    }))
    .slice(0, 5);
  const completedTasksCount = data.tasks.filter((t) => t.done).length;
  const sidekickLevel = Math.floor(completedTasksCount / 10) + 1;
  const sidekickLevelProgressRaw = completedTasksCount % 10;
  const sidekickXpPercent = Math.min(
    100,
    (sidekickLevelProgressRaw / 10) * 100
  );
  const upcomingEvents = useMemo(
    () => {
      if (!preferencesReady) return [];
      const all = buildUpcomingEvents(representations, rehearsals, invoices, sessions, customEvents);
      return all.filter((event) => {
        if (event.type === "representation" || event.type === "rehearsal") return enabled.live;
        if (event.type === "session") return enabled.phono;
        if (event.type === "invoice") return enabled.revenus;
        if (event.type === "custom") {
          const sector = event.sector ?? "other";
          if (sector === "live") return enabled.live;
          if (sector === "phono") return enabled.phono;
          if (sector === "admin") return enabled.admin;
          if (sector === "marketing") return enabled.marketing;
          if (sector === "edition") return enabled.edition;
          if (sector === "revenus") return enabled.revenus;
          return true;
        }
        return true;
      });
    },
    [representations, rehearsals, invoices, sessions, customEvents, enabled, preferencesReady]
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekDays = useMemo(() => {
    const base = new Date(today);
    const jsDay = base.getDay(); // 0 = dimanche ... 6 = samedi
    const offsetToMonday = (jsDay + 6) % 7; // 0 = lundi
    const monday = new Date(base);
    monday.setDate(base.getDate() - offsetToMonday);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [today]);

  const weekEventsByDate = useMemo(() => {
    if (!preferencesReady) return {};
    const start = weekDays[0];
    const end = weekDays[6];
    const events = buildWeekEvents(
      representations,
      rehearsals,
      invoices,
      sessions,
      customEvents,
      start,
      end
    );
    const filtered = events.filter((event) => {
      if (event.type === "representation" || event.type === "rehearsal") return enabled.live;
      if (event.type === "session") return enabled.phono;
      if (event.type === "invoice") return enabled.revenus;
      if (event.type === "custom") {
        const sector = event.sector ?? "other";
        if (sector === "live") return enabled.live;
        if (sector === "phono") return enabled.phono;
        if (sector === "admin") return enabled.admin;
        if (sector === "marketing") return enabled.marketing;
        if (sector === "edition") return enabled.edition;
        if (sector === "revenus") return enabled.revenus;
        return true;
      }
      return true;
    });
    const map: Record<string, UpcomingEvent[]> = {};
    filtered.forEach((e) => {
      const key = toDateKey(e.date);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [weekDays, representations, rehearsals, invoices, sessions, customEvents, enabled, preferencesReady]);

  const nextThreeEvents = useMemo(
    () => upcomingEvents.slice(0, 3),
    [upcomingEvents]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">
          Tableau de bord
        </h1>
        <p className="text-sm text-muted-foreground">
          Vue rapide sur ce qui demande ton attention aujourd&apos;hui.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_30%_30%,#fbbf24,#ec4899,transparent_60%)] opacity-60" />
          <CardHeader className="relative z-10 pb-2">
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-50">
                Ton sidekick
              </CardTitle>
              <div className="flex items-center gap-2 text-[11px] text-slate-200">
                <span className="rounded-full bg-slate-800/80 px-2 py-0.5 font-semibold uppercase tracking-wide">
                  Niveau {sidekickLevel}
                </span>
                <span className="text-slate-400">
                  XP {sidekickLevelProgressRaw}/10
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 flex items-center gap-4">
            <div className="h-36 w-36 shrink-0 overflow-hidden rounded-2xl">
              <img
                src="/images/sidekick-manager.png"
                alt="Sidekick manager artistique"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex-1 space-y-2 text-sm text-slate-100">
              <div className="space-y-1">
                <p className="font-medium">
                  Bienvenue sur ton tableau de bord.
                </p>
                <p className="text-xs text-slate-300">
                  Je suis ton sidekick, ton manager artistique virtuel, cool et
                  décontracté. On fait monter ton niveau en avançant sur tes
                  tâches et tes événements.
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Progression du niveau</span>
                  <span>{Math.round(sidekickXpPercent)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 via-rose-400 to-sky-400"
                    style={{ width: `${sidekickXpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Tâches du jour</CardTitle>
            <Link
              href="/tasks"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Tâches
              <ChevronRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {todaysTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune tâche en attente.
              </p>
            ) : (
              <ul className="space-y-2">
                {todaysTasks.map((task) => (
                  <Link key={task.id} href="/tasks">
                    <li className="rounded-md bg-muted px-3 py-2 text-sm transition-colors hover:bg-muted/80">
                      <div className="flex items-start justify-between gap-2">
                        <span className="line-clamp-2 font-medium">
                          {task.title}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          À faire
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-background/60 px-2 py-0.5">
                          {task.sector}
                        </span>
                        {task.deadline && (
                          <span>
                            Échéance :{" "}
                            {new Date(task.deadline).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {task.description}
                        </p>
                      )}
                    </li>
                  </Link>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Calendrier hebdomadaire</CardTitle>
          <span className="text-xs text-muted-foreground">
            Semaine du{" "}
            {weekDays[0].toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short"
            })}{" "}
            au{" "}
            {weekDays[6].toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short"
            })}
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-[repeat(7,minmax(0,1fr))_220px]">
            {weekDays.map((day) => {
              const key = toDateKey(day);
              const dayEvents = weekEventsByDate[key] ?? [];
              return (
                <div
                  key={key}
                  className="flex min-h-24 flex-col rounded-lg border bg-muted/40 p-2"
                >
                  <div className="mb-1 text-xs font-medium">
                    {day.toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short"
                    })}
                  </div>
                  {dayEvents.length === 0 ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Aucun événement.
                    </p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {dayEvents.map((event) => {
                        const config = getEventConfig(event);
                        return (
                          <li
                            key={event.id}
                            className="flex items-start gap-1 rounded-md bg-background/70 px-1.5 py-1"
                          >
                            <span
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${config.bgClass}`}
                            >
                              {config.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] font-medium">
                                {event.title}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {config.label}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
            <div className="rounded-lg border bg-muted/30 p-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Prochains événements
              </p>
              {nextThreeEvents.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  Aucun événement à venir.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {nextThreeEvents.map((event) => {
                    const config = getEventConfig(event);
                    return (
                      <li key={`upcoming-week-${event.id}`}>
                        <Link
                          href={`/calendar?event=${encodeURIComponent(event.id)}`}
                          className="block rounded-md border bg-background/70 px-2 py-1.5 transition-colors hover:bg-muted/50"
                        >
                          <div className="flex items-start gap-1.5">
                            <span
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${config.bgClass}`}
                            >
                              {config.icon}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-medium">
                                {event.title}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatEventDate(event.dateStr)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
