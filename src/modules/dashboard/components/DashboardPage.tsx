"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSidekickData } from "@/hooks/useSidekickData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { ChevronRight, DollarSign, Disc2, Mic2, Music2 } from "lucide-react";

type TourDateItem = { id: number; city: string; venue: string; date: string };
type RehearsalItem = { id: number; date: string; location: string; label?: string };
type InvoiceItem = { id: number; dueDate: string; number: string; client: string };
type SessionItem = { id: number; date: string; title: string; location: string };

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

type EventType = "representation" | "rehearsal" | "invoice" | "session";

type UpcomingEvent = {
  id: string;
  title: string;
  date: Date;
  dateStr: string;
  type: EventType;
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
    icon: <Music2 className="h-3.5 w-3.5" />,
    label: "Répétition"
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
  }
};

function buildUpcomingEvents(
  representations: TourDateItem[],
  rehearsals: RehearsalItem[],
  invoices: InvoiceItem[],
  sessions: SessionItem[]
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
        id: `rep-${t.id}`,
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
        id: `reh-${r.id}`,
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
        id: `inv-${i.id}`,
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
        id: `sess-${s.id}`,
        title: s.title || s.location || "Session",
        date: d,
        dateStr: s.date,
        type: "session"
      });
    }
  });

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events.slice(0, 5);
}

export function DashboardPage() {
  const { data } = useSidekickData();
  const [representations] = useLocalStorage<TourDateItem[]>("live:representations", []);
  const [rehearsals] = useLocalStorage<RehearsalItem[]>("live:rehearsals", []);
  const [invoices] = useLocalStorage<InvoiceItem[]>("incomes:invoices", []);
  const [sessions] = useLocalStorage<SessionItem[]>("phono:sessions-studio", []);

  const todaysTasks = data.tasks.filter((t) => !t.done).slice(0, 5);
  const upcomingEvents = useMemo(
    () => buildUpcomingEvents(representations, rehearsals, invoices, sessions),
    [representations, rehearsals, invoices, sessions]
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
                    <li className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm transition-colors hover:bg-muted/80">
                      <span className="line-clamp-2">{task.title}</span>
                      <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                        À faire
                      </span>
                    </li>
                  </Link>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Événements à venir</CardTitle>
            <Link
              href="/calendar"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Calendrier
              <ChevronRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun événement planifié.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcomingEvents.map((event) => {
                  const config = EVENT_CONFIG[event.type];
                  return (
                    <Link key={event.id} href="/calendar">
                      <li className="flex items-center gap-3 rounded-md bg-muted px-3 py-2 text-sm transition-colors hover:bg-muted/80">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.bgClass} text-white`}
                          aria-hidden
                        >
                          {config.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{event.title}</span>
                          <span className={`text-xs ${config.color}`}>{config.label}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatEventDate(event.dateStr)}
                        </span>
                      </li>
                    </Link>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
