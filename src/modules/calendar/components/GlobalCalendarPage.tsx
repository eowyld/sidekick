"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Mic2,
  Disc2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export type CalendarSector = "live" | "revenus" | "phono";

export type CalendarEventType =
  | "representation"
  | "rehearsal"
  | "invoice"
  | "session";

export interface CalendarEvent {
  id: string;
  dateKey: string;
  label: string;
  sector: CalendarSector;
  type: CalendarEventType;
  subLabel?: string;
  isPast: boolean;
}

function parseFrDate(frDate: string): Date | null {
  if (!frDate) return null;
  const parts = String(frDate).trim().split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  return isNaN(date.getTime()) ? null : date;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function frToDateKey(frDate: string): string | null {
  const date = parseFrDate(frDate);
  return date ? toDateKey(date) : null;
}

const todayKey = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return toDateKey(d);
})();

function createMonthMatrix(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const startOffset = (firstOfMonth.getDay() + 6) % 7;

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];

  for (let i = 0; i < startOffset; i++) {
    currentWeek.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

// Minimal types for localStorage data (same shape as in modules)
type TourDateItem = {
  id: number;
  city: string;
  venue: string;
  date: string;
  address?: string;
  status?: string;
  note?: string;
  timetable?: { time: string; activity: string }[];
};
type RehearsalItem = {
  id: number;
  date: string;
  time?: string;
  location: string;
  label?: string;
  address?: string;
  note?: string;
};
type InvoiceItem = {
  id: number;
  number: string;
  client: string;
  subject?: string;
  amount?: string;
  dueDate: string;
  status?: string;
};
type SessionItem = {
  id: number;
  date: string;
  time?: string;
  title: string;
  location: string;
  sessionType?: string;
};

function buildCalendarEvents(
  representations: TourDateItem[],
  rehearsals: RehearsalItem[],
  invoices: InvoiceItem[],
  sessions: SessionItem[]
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  representations.forEach((r) => {
    const dateKey = frToDateKey(r.date);
    if (!dateKey) return;
    const isPast = dateKey < todayKey;
    events.push({
      id: `live-rep-${r.id}`,
      dateKey,
      label: `${r.venue} - ${r.city}`,
      sector: "live",
      type: "representation",
      subLabel: "Représentation",
      isPast
    });
  });

  rehearsals.forEach((r) => {
    const dateKey = frToDateKey(r.date);
    if (!dateKey) return;
    const isPast = dateKey < todayKey;
    events.push({
      id: `live-rehearsal-${r.id}`,
      dateKey,
      label: r.label || r.location,
      sector: "live",
      type: "rehearsal",
      subLabel: "Répétition",
      isPast
    });
  });

  invoices.forEach((i) => {
    const dateKey = frToDateKey(i.dueDate);
    if (!dateKey) return;
    const isPast = dateKey < todayKey;
    events.push({
      id: `revenus-invoice-${i.id}`,
      dateKey,
      label: `Facture ${i.number} - ${i.client}`,
      sector: "revenus",
      type: "invoice",
      subLabel: "Échéance facture",
      isPast
    });
  });

  sessions.forEach((s) => {
    const dateKey = frToDateKey(s.date);
    if (!dateKey) return;
    const isPast = dateKey < todayKey;
    events.push({
      id: `phono-session-${s.id}`,
      dateKey,
      label: s.title || s.location,
      sector: "phono",
      type: "session",
      subLabel: "Session studio",
      isPast
    });
  });

  return events;
}

function formatDateKeyToFr(dateKey: string): string {
  const [y, m, d] = dateKey.split("-");
  return `${d}/${m}/${y}`;
}

const SECTOR_CONFIG: Record<
  CalendarSector,
  { label: string; color: string; bgClass: string; icon: React.ReactNode }
> = {
  live: {
    label: "Live",
    color: "text-blue-600",
    bgClass: "bg-blue-500",
    icon: <Mic2 className="h-3.5 w-3.5" />
  },
  revenus: {
    label: "Revenus",
    color: "text-orange-600",
    bgClass: "bg-orange-500",
    icon: <DollarSign className="h-3.5 w-3.5" />
  },
  phono: {
    label: "Phono",
    color: "text-red-600",
    bgClass: "bg-red-500",
    icon: <Disc2 className="h-3.5 w-3.5" />
  }
};

export function GlobalCalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [filterLive, setFilterLive] = useState(true);
  const [filterRevenus, setFilterRevenus] = useState(true);
  const [filterPhono, setFilterPhono] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const [representations] = useLocalStorage<TourDateItem[]>(
    "live:representations",
    []
  );
  const [rehearsals] = useLocalStorage<RehearsalItem[]>("live:rehearsals", []);
  const [invoices] = useLocalStorage<InvoiceItem[]>("incomes:invoices", []);
  const [sessions] = useLocalStorage<SessionItem[]>("phono:sessions-studio", []);

  const allEvents = useMemo(
    () =>
      buildCalendarEvents(representations, rehearsals, invoices, sessions),
    [representations, rehearsals, invoices, sessions]
  );

  const sectorFilter = useMemo(
    () => ({
      live: filterLive,
      revenus: filterRevenus,
      phono: filterPhono
    }),
    [filterLive, filterRevenus, filterPhono]
  );

  const filteredEvents = useMemo(
    () =>
      allEvents.filter((e) => sectorFilter[e.sector]),
    [allEvents, sectorFilter]
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const eventsByDateKey = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach((ev) => {
      if (!map[ev.dateKey]) map[ev.dateKey] = [];
      map[ev.dateKey].push(ev);
    });
    return map;
  }, [filteredEvents]);

  const monthMatrix = useMemo(() => createMonthMatrix(currentDate), [currentDate]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("fr-FR", {
        month: "long",
        year: "numeric"
      }).format(currentDate),
    [currentDate]
  );

  const upcomingEvents = useMemo(() => {
    return filteredEvents
      .filter((e) => !e.isPast)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .slice(0, 20);
  }, [filteredEvents]);

  const goToPreviousMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const goToNextMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const goToToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCurrentDate(d);
  };

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isToday = (day: number | null) => {
    if (!day) return false;
    const d = new Date(year, month, day);
    return d.getTime() === today.getTime();
  };

  const getDateKeyForDay = (day: number | null): string | null => {
    if (!day) return null;
    const d = new Date(year, month, day);
    return toDateKey(d);
  };

  const openEventDialog = (ev: CalendarEvent) => () => setSelectedEvent(ev);

  const selectedEventDetails = useMemo(() => {
    if (!selectedEvent) return null;
    const match = selectedEvent.id.match(/^(live-rep|live-rehearsal|revenus-invoice|phono-session)-(\d+)$/);
    if (!match) return { event: selectedEvent, source: null };
    const [, type, idStr] = match;
    const id = parseInt(idStr, 10);
    if (type === "live-rep") {
      const source = representations.find((r) => r.id === id) ?? null;
      return { event: selectedEvent, source };
    }
    if (type === "live-rehearsal") {
      const source = rehearsals.find((r) => r.id === id) ?? null;
      return { event: selectedEvent, source };
    }
    if (type === "revenus-invoice") {
      const source = invoices.find((i) => i.id === id) ?? null;
      return { event: selectedEvent, source };
    }
    if (type === "phono-session") {
      const source = sessions.find((s) => s.id === id) ?? null;
      return { event: selectedEvent, source };
    }
    return { event: selectedEvent, source: null };
  }, [selectedEvent, representations, rehearsals, invoices, sessions]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Calendrier
            </h1>
            <p className="text-sm text-muted-foreground">
              Représentations, répétitions, factures et sessions studio.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousMonth}
            aria-label="Mois précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[150px] text-center text-sm font-medium capitalize">
            {monthLabel}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextMonth}
            aria-label="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="ml-1"
          >
            Aujourd&apos;hui
          </Button>
        </div>
      </div>

      {/* Filtre par secteur */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground mr-1">
          Secteurs :
        </span>
        {(Object.keys(SECTOR_CONFIG) as CalendarSector[]).map((sector) => {
          const config = SECTOR_CONFIG[sector];
          const isActive =
            sector === "live"
              ? filterLive
              : sector === "revenus"
                ? filterRevenus
                : filterPhono;
          const toggle = () => {
            if (sector === "live") setFilterLive((v) => !v);
            else if (sector === "revenus") setFilterRevenus((v) => !v);
            else setFilterPhono((v) => !v);
          };
          return (
            <button
              key={sector}
              type="button"
              onClick={toggle}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-transparent text-white"
                  : "border-border bg-muted/50 text-muted-foreground hover:bg-muted",
                isActive && sector === "live" && "bg-blue-500",
                isActive && sector === "revenus" && "bg-orange-500",
                isActive && sector === "phono" && "bg-red-500"
              )}
            >
              {config.icon}
              {config.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-1.5">
            <CardTitle className="text-base">Vue mensuelle</CardTitle>
            <CardDescription>
              Événements Live (bleu), Revenus (orange) et Phono (rouge).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="mb-3 grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-sm">
              {monthMatrix.map((week, weekIndex) =>
                week.map((day, dayIndex) => {
                  const dateKey = getDateKeyForDay(day);
                  const dayEvents = dateKey ? eventsByDateKey[dateKey] ?? [] : [];

                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={cn(
                        "flex min-h-14 flex-col rounded-md border p-1 transition-colors",
                        day
                          ? "bg-background/80"
                          : "bg-muted/40 border-dashed",
                        isToday(day) && "border-primary ring-1 ring-primary/30"
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-medium",
                          day ? "text-foreground" : "text-muted-foreground/60",
                          isToday(day) && "text-primary"
                        )}
                      >
                        {day ?? ""}
                      </span>
                      <div className="mt-0.5 flex flex-wrap gap-0.5">
                        {dayEvents.slice(0, 3).map((ev) => {
                          const config = SECTOR_CONFIG[ev.sector];
                          return (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={openEventDialog(ev)}
                              className={cn(
                                "inline-flex cursor-pointer items-center rounded px-1 py-0.5 text-[10px] font-medium text-white transition-opacity hover:opacity-90",
                                config.bgClass,
                                ev.isPast && "opacity-70"
                              )}
                              title={ev.label}
                            >
                              {config.icon}
                            </button>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">Prochains événements</CardTitle>
            <CardDescription>
              Liste des événements à venir (selon les filtres).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
                <p>Aucun événement à venir.</p>
                <p className="mt-1">
                  Modifie les filtres ou ajoute des dates dans Live, Revenus ou
                  Phono.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {upcomingEvents.map((ev) => {
                  const config = SECTOR_CONFIG[ev.sector];
                  const frDate = (() => {
                    const [y, m, d] = ev.dateKey.split("-");
                    return `${d}/${m}/${y}`;
                  })();
                  return (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={openEventDialog(ev)}
                        className={cn(
                          "flex w-full cursor-pointer items-start gap-2 rounded-lg border p-2 text-left text-sm transition-colors hover:bg-muted/50",
                          ev.isPast && "opacity-75"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white",
                            config.bgClass
                          )}
                        >
                          {config.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium leading-tight">{ev.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {ev.subLabel} · {frDate}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        <DialogContent className="sm:max-w-md">
          {selectedEventDetails && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white",
                      SECTOR_CONFIG[selectedEventDetails.event.sector].bgClass
                    )}
                  >
                    {SECTOR_CONFIG[selectedEventDetails.event.sector].icon}
                  </span>
                  <div>
                    <DialogTitle className="text-left">
                      {selectedEventDetails.event.label}
                    </DialogTitle>
                    <DialogDescription className="text-left">
                      {selectedEventDetails.event.subLabel} ·{" "}
                      {formatDateKeyToFr(selectedEventDetails.event.dateKey)}
                      {selectedEventDetails.event.isPast && " (passé)"}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white",
                      SECTOR_CONFIG[selectedEventDetails.event.sector].bgClass
                    )}
                  >
                    {SECTOR_CONFIG[selectedEventDetails.event.sector].icon}
                    {SECTOR_CONFIG[selectedEventDetails.event.sector].label}
                  </span>
                </div>

                {selectedEventDetails.source &&
                  (() => {
                    const src = selectedEventDetails.source as
                      | TourDateItem
                      | RehearsalItem
                      | InvoiceItem
                      | SessionItem;
                    const type = selectedEventDetails.event.type;
                    if (type === "representation") {
                      const r = src as TourDateItem;
                      return (
                        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                          <p>
                            <span className="font-medium">Lieu :</span>{" "}
                            {r.venue}, {r.city}
                          </p>
                          {r.address && (
                            <p>
                              <span className="font-medium">Adresse :</span>{" "}
                              {r.address}
                            </p>
                          )}
                          {r.status && (
                            <p>
                              <span className="font-medium">Statut :</span>{" "}
                              {r.status}
                            </p>
                          )}
                          {r.timetable && r.timetable.length > 0 && (
                            <div>
                              <span className="font-medium">Horaires :</span>
                              <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                                {r.timetable.map((t, i) => (
                                  <li key={i}>
                                    {t.time} — {t.activity}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {r.note && (
                            <p className="text-muted-foreground">
                              <span className="font-medium">Note :</span> {r.note}
                            </p>
                          )}
                        </div>
                      );
                    }
                    if (type === "rehearsal") {
                      const r = src as RehearsalItem;
                      return (
                        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                          <p>
                            <span className="font-medium">Lieu :</span>{" "}
                            {r.location}
                          </p>
                          {r.time && (
                            <p>
                              <span className="font-medium">Heure :</span>{" "}
                              {r.time}
                            </p>
                          )}
                          {r.address && (
                            <p>
                              <span className="font-medium">Adresse :</span>{" "}
                              {r.address}
                            </p>
                          )}
                          {r.note && (
                            <p className="text-muted-foreground">
                              <span className="font-medium">Note :</span> {r.note}
                            </p>
                          )}
                        </div>
                      );
                    }
                    if (type === "invoice") {
                      const i = src as InvoiceItem;
                      return (
                        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                          <p>
                            <span className="font-medium">N° facture :</span>{" "}
                            {i.number}
                          </p>
                          <p>
                            <span className="font-medium">Client :</span>{" "}
                            {i.client}
                          </p>
                          {i.subject && (
                            <p>
                              <span className="font-medium">Objet :</span>{" "}
                              {i.subject}
                            </p>
                          )}
                          {i.amount && (
                            <p>
                              <span className="font-medium">Montant :</span>{" "}
                              {i.amount.includes("€") ? i.amount : `${i.amount} €`}
                            </p>
                          )}
                          <p>
                            <span className="font-medium">Échéance :</span>{" "}
                            {i.dueDate}
                          </p>
                          {i.status && (
                            <p>
                              <span className="font-medium">Statut :</span>{" "}
                              {i.status === "payee" ? "Payée" : "En attente"}
                            </p>
                          )}
                        </div>
                      );
                    }
                    if (type === "session") {
                      const s = src as SessionItem;
                      return (
                        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                          <p>
                            <span className="font-medium">Titre :</span>{" "}
                            {s.title}
                          </p>
                          <p>
                            <span className="font-medium">Lieu :</span>{" "}
                            {s.location}
                          </p>
                          {s.time && (
                            <p>
                              <span className="font-medium">Heure :</span>{" "}
                              {s.time}
                            </p>
                          )}
                          {s.sessionType && (
                            <p>
                              <span className="font-medium">Type :</span>{" "}
                              {s.sessionType}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
