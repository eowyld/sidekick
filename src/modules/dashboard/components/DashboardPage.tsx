"use client";

import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSidekickData } from "@/hooks/useSidekickData";
import { useTasksData } from "@/hooks/useTasksData";
import { useLiveData } from "@/hooks/useLiveData";
import { useIncomesData } from "@/hooks/useIncomesData";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useCalendarData } from "@/hooks/useCalendarData";
import {
  Briefcase,
  CalendarDays,
  ChevronRight,
  DollarSign,
  Disc2,
  Megaphone,
  Mic2,
  Music2,
  Pencil,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";

// ─── Types ────────────────────────────────────────────────────────────────────

type TourDateItem = { id: number; city: string; venue: string; date: string };
type RehearsalItem = { id: string; date: string; location: string; label?: string };
type InvoiceItem = { id: string; dueDate: string; number: string; client: string };
type SessionItem = { id: string; date: string; title: string; location: string };
type CustomCalendarItem = {
  id: string;
  title: string;
  date: string;
  time?: string;
  place?: string;
  sector?: "live" | "phono" | "admin" | "marketing" | "edition" | "revenus" | "other";
};

// ─── Helpers dates ────────────────────────────────────────────────────────────

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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatEventDate(dateStr: string | undefined): string {
  const d = parseDate(dateStr);
  if (!d) return "";
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 7) return "Encore debout ?";
  if (h < 12) return "Bonne matinée.";
  if (h < 14) return "Bonne après-midi.";
  if (h < 18) return "On avance.";
  if (h < 22) return "Bonne soirée.";
  return "Bonne nuit.";
}

// ─── Config événements ────────────────────────────────────────────────────────

type EventType = "representation" | "rehearsal" | "invoice" | "session" | "custom";

type UpcomingEvent = {
  id: string;
  title: string;
  date: Date;
  dateStr: string;
  type: EventType;
  sector?: CustomCalendarItem["sector"];
};

const EVENT_CONFIG: Record<EventType, { dot: string; label: string; icon: React.ReactNode }> = {
  representation: { dot: "bg-blue-400", label: "Live", icon: <Mic2 className="h-3 w-3" /> },
  rehearsal:      { dot: "bg-blue-400", label: "Répétition", icon: <Mic2 className="h-3 w-3" /> },
  invoice:        { dot: "bg-orange-400", label: "Facture", icon: <DollarSign className="h-3 w-3" /> },
  session:        { dot: "bg-red-400", label: "Studio", icon: <Disc2 className="h-3 w-3" /> },
  custom:         { dot: "bg-[#F5F5F5]/40", label: "Autre", icon: <CalendarDays className="h-3 w-3" /> },
};

const SECTOR_DOT: Record<NonNullable<CustomCalendarItem["sector"]>, string> = {
  live:      "bg-blue-400",
  phono:     "bg-red-400",
  admin:     "bg-violet-400",
  marketing: "bg-emerald-400",
  edition:   "bg-cyan-400",
  revenus:   "bg-orange-400",
  other:     "bg-[#F5F5F5]/40",
};

function getEventConfig(event: UpcomingEvent) {
  if (event.type !== "custom") return EVENT_CONFIG[event.type];
  const sector = event.sector ?? "other";
  return { ...EVENT_CONFIG.custom, dot: SECTOR_DOT[sector] ?? SECTOR_DOT.other };
}

// ─── Build events ─────────────────────────────────────────────────────────────

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
    if (d && toDateKey(d) >= todayKey)
      events.push({ id: `live-rep-${t.id}`, title: `${t.venue} – ${t.city}`, date: d, dateStr: t.date, type: "representation" });
  });
  rehearsals.forEach((r) => {
    const d = parseDate(r.date);
    if (d && toDateKey(d) >= todayKey)
      events.push({ id: `live-rehearsal-${r.id}`, title: r.label || r.location || "Répétition", date: d, dateStr: r.date, type: "rehearsal" });
  });
  invoices.forEach((i) => {
    const d = parseDate(i.dueDate);
    if (d && toDateKey(d) >= todayKey)
      events.push({ id: `revenus-invoice-${i.id}`, title: `Facture ${i.number} – ${i.client}`, date: d, dateStr: i.dueDate, type: "invoice" });
  });
  sessions.forEach((s) => {
    const d = parseDate(s.date);
    if (d && toDateKey(d) >= todayKey)
      events.push({ id: `phono-session-${s.id}`, title: s.title || s.location || "Session", date: d, dateStr: s.date, type: "session" });
  });
  customEvents.forEach((e) => {
    const d = parseDate(e.date);
    if (d && toDateKey(d) >= todayKey)
      events.push({ id: `custom-${e.id}`, title: e.title || "Événement", date: d, dateStr: e.date, type: "custom", sector: e.sector ?? "other" });
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

  const inRange = (d: Date | null) => d && toDateKey(d) >= startKey && toDateKey(d) <= endKey;

  representations.forEach((t) => {
    const d = parseDate(t.date);
    if (inRange(d)) events.push({ id: `live-rep-${t.id}`, title: `${t.venue} – ${t.city}`, date: d!, dateStr: t.date, type: "representation" });
  });
  rehearsals.forEach((r) => {
    const d = parseDate(r.date);
    if (inRange(d)) events.push({ id: `live-rehearsal-${r.id}`, title: r.label || r.location || "Répétition", date: d!, dateStr: r.date, type: "rehearsal" });
  });
  invoices.forEach((i) => {
    const d = parseDate(i.dueDate);
    if (inRange(d)) events.push({ id: `revenus-invoice-${i.id}`, title: `Facture ${i.number} – ${i.client}`, date: d!, dateStr: i.dueDate, type: "invoice" });
  });
  sessions.forEach((s) => {
    const d = parseDate(s.date);
    if (inRange(d)) events.push({ id: `phono-session-${s.id}`, title: s.title || s.location || "Session", date: d!, dateStr: s.date, type: "session" });
  });
  customEvents.forEach((e) => {
    const d = parseDate(e.date);
    if (inRange(d)) events.push({ id: `custom-${e.id}`, title: e.title || "Événement", date: d!, dateStr: e.date, type: "custom", sector: e.sector ?? "other" });
  });

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}

// ─── Composants internes ──────────────────────────────────────────────────────

function XpBar({ percent }: { percent: number }) {
  return (
    <div className="h-[3px] w-full overflow-hidden bg-[rgba(245,245,245,0.08)]">
      <div
        className="h-full bg-[#F0FF00] transition-all duration-700 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { data, preferencesReady } = useSidekickData();
  const enabled = data.preferences?.enabledModules ?? {
    live: true, phono: true, admin: true, marketing: true, edition: true, revenus: true,
  };

  const { tasks, error: tasksError } = useTasksData();
  const { tourDates: representations, rehearsals, error: liveError } = useLiveData();
  const { invoices, error: incomesError } = useIncomesData();
  const { sessions, error: phonoError } = usePhonoData();
  const { customEvents, error: calendarError } = useCalendarData();

  const todaysTasks = tasks
    .filter((t) => t.todayFocus && t.status !== "done")
    .map((t) => ({ ...t, description: t.description ?? "", deadline: t.deadline ?? "", sector: t.sector ?? "Admin" }));

  const completedTasksCount = tasks.filter((t) => t.status === "done").length;
  const sidekickLevel = Math.floor(completedTasksCount / 10) + 1;
  const sidekickXpPercent = Math.min(100, (completedTasksCount % 10) / 10 * 100);

  const filterEnabled = (events: UpcomingEvent[]) =>
    events.filter((event) => {
      if (event.type === "representation" || event.type === "rehearsal") return enabled.live;
      if (event.type === "session") return enabled.phono;
      if (event.type === "invoice") return enabled.revenus;
      if (event.type === "custom") {
        const s = event.sector ?? "other";
        if (s === "live") return enabled.live;
        if (s === "phono") return enabled.phono;
        if (s === "admin") return enabled.admin;
        if (s === "marketing") return enabled.marketing;
        if (s === "edition") return enabled.edition;
        if (s === "revenus") return enabled.revenus;
        return true;
      }
      return true;
    });

  const upcomingEvents = useMemo(() => {
    if (!preferencesReady) return [];
    return filterEnabled(buildUpcomingEvents(representations as TourDateItem[], rehearsals as RehearsalItem[], invoices as InvoiceItem[], sessions as SessionItem[], customEvents));
  }, [representations, rehearsals, invoices, sessions, customEvents, enabled, preferencesReady]);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

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

  const weekEventsByDate = useMemo(() => {
    if (!preferencesReady) return {};
    const events = filterEnabled(buildWeekEvents(representations as TourDateItem[], rehearsals as RehearsalItem[], invoices as InvoiceItem[], sessions as SessionItem[], customEvents, weekDays[0], weekDays[6]));
    const map: Record<string, UpcomingEvent[]> = {};
    events.forEach((e) => {
      const key = toDateKey(e.date);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [weekDays, representations, rehearsals, invoices, sessions, customEvents, enabled, preferencesReady]);

  const todayKey = toDateKey(today);

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
    <div className="space-y-6">

      {/* ── Header cockpit ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] uppercase tracking-[0.12em] text-[#F5F5F5]/40">
            {getGreeting()}
          </p>
          <h1 className="mt-1 text-[28px] font-bold uppercase tracking-tight text-[#F5F5F5]">
            Ton sidekick
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-none border border-[rgba(245,245,245,0.12)] px-3 py-2 text-[12px]">
          <Zap size={13} className="text-[#F0FF00]" />
          <span className="text-[#F5F5F5]/60">Niv.</span>
          <span className="font-semibold text-[#F0FF00]">{sidekickLevel}</span>
          <span className="text-[#F5F5F5]/30">·</span>
          <span className="text-[#F5F5F5]/50">{Math.round(sidekickXpPercent)}% XP</span>
        </div>
      </div>

      {/* Barre XP */}
      <XpBar percent={sidekickXpPercent} />

      {/* ── Grille principale 60/40 ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

        {/* Colonne gauche — Tâches + Échéances */}
        <div className="space-y-4 lg:col-span-3">

          {/* Tâches du jour */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-[rgba(245,245,245,0.08)] py-3">
              <CardTitle className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#F5F5F5]/60">
                Tâches du jour
              </CardTitle>
              <Link
                href="/tasks"
                className="flex items-center gap-1 text-[12px] text-[#F5F5F5]/40 transition-colors hover:text-[#F0FF00]"
              >
                Voir tout <ChevronRight size={13} />
              </Link>
            </CardHeader>
            <CardContent className="py-3">
              {todaysTasks.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-[#F5F5F5]/30">
                  Aucune tâche pour aujourd'hui.
                </p>
              ) : (
                <ul className="divide-y divide-[rgba(245,245,245,0.06)]">
                  {todaysTasks.slice(0, 5).map((task) => {
                    const todayIso = new Date().toISOString().slice(0, 10);
                    const overdue = task.deadline && task.deadline < todayIso;
                    return (
                      <li key={task.id} className="flex items-start justify-between gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-[#F5F5F5]">
                            {task.title}
                          </p>
                          {task.deadline && (
                            <span className={cn(
                              "mt-0.5 inline-flex items-center gap-1 text-[11px]",
                              overdue
                                ? "text-rose-400"
                                : "text-[#F5F5F5]/40"
                            )}>
                              {overdue && <TriangleAlert size={11} />}
                              {new Date(task.deadline).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                            </span>
                          )}
                        </div>
                        <Link href="/tasks" className="shrink-0 text-[#F5F5F5]/25 transition-colors hover:text-[#F5F5F5]">
                          <Pencil size={13} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Prochaines échéances */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-[rgba(245,245,245,0.08)] py-3">
              <CardTitle className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#F5F5F5]/60">
                Prochaines échéances
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              {upcomingEvents.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-[#F5F5F5]/30">
                  Aucun événement à venir.
                </p>
              ) : (
                <ul className="divide-y divide-[rgba(245,245,245,0.06)]">
                  {upcomingEvents.slice(0, 3).map((event) => {
                    const cfg = getEventConfig(event);
                    return (
                      <li key={event.id} className="flex items-center gap-3 py-2.5">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", cfg.dot)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-[#F5F5F5]">
                            {event.title}
                          </p>
                          <p className="text-[11px] text-[#F5F5F5]/40">{cfg.label}</p>
                        </div>
                        <span className="shrink-0 text-[11px] text-[#F5F5F5]/40">
                          {formatEventDate(event.dateStr)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite — Calendrier semaine */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[rgba(245,245,245,0.08)] py-3">
              <CardTitle className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#F5F5F5]/60">
                Cette semaine
              </CardTitle>
              <Link href="/calendar" className="text-[12px] text-[#F5F5F5]/40 transition-colors hover:text-[#F0FF00]">
                Calendrier
              </Link>
            </CardHeader>
            <CardContent className="py-3">
              <div className="space-y-1">
                {weekDays.map((day) => {
                  const key = toDateKey(day);
                  const dayEvents = weekEventsByDate[key] ?? [];
                  const isToday = key === todayKey;
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex items-start gap-3 rounded-none px-2 py-1.5",
                        isToday && "bg-[#F0FF00]/5 outline outline-1 outline-[#F0FF00]/20"
                      )}
                    >
                      <div className="w-16 shrink-0">
                        <p className={cn(
                          "text-[11px] font-medium capitalize",
                          isToday ? "text-[#F0FF00]" : "text-[#F5F5F5]/40"
                        )}>
                          {day.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}
                        </p>
                      </div>
                      <div className="flex flex-1 flex-wrap gap-1">
                        {dayEvents.length === 0 ? (
                          <span className="text-[11px] text-[#F5F5F5]/20">—</span>
                        ) : (
                          dayEvents.map((event) => {
                            const cfg = getEventConfig(event);
                            return (
                              <span
                                key={event.id}
                                className={cn(
                                  "flex items-center gap-1 rounded-none px-1.5 py-0.5 text-[10px] font-medium",
                                  "bg-[rgba(245,245,245,0.06)] text-[#F5F5F5]/70"
                                )}
                              >
                                <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                                <span className="max-w-[80px] truncate">{event.title}</span>
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
