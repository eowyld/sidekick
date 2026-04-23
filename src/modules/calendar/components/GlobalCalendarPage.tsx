"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Mic2,
  Music2,
  BookOpen,
  Briefcase,
  Megaphone,
  Trash2,
  Pencil,
  Share2
} from "lucide-react";

import { ICalSyncPanel } from "./ICalSyncPanel";

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
import { DatePicker } from "@/components/ui/date-picker";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSidekickData } from "@/hooks/useSidekickData";
import { useCalendarData, type CustomCalendarItem } from "@/hooks/useCalendarData";
import { PageError } from "@/components/ui/page-error";
import { EmptyState } from "@/components/ui/empty-state";
import { mutate } from "swr";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export type CalendarSector =
  | "live"
  | "phono"
  | "admin"
  | "marketing"
  | "edition"
  | "revenus"
  | "other";

export type CalendarEventType =
  | "representation"
  | "rehearsal"
  | "invoice"
  | "session"
  | "album_release"
  | "track_release"
  | "task_deadline"
  | "marketing_content"
  | "admin_procedure"
  | "admin_status_start"
  | "admin_status_end"
  | "edition_event"
  | "custom";

export interface CalendarEvent {
  id: string;
  dateKey: string;
  label: string;
  sector: CalendarSector;
  type: CalendarEventType;
  subLabel?: string;
  isPast: boolean;
  time?: string;
  place?: string;
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
  organisateur?: string;
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
type PhonoTrackItem = {
  id: string;
  title: string;
  mainArtist?: string;
  releaseDate?: string;
};
type PhonoAlbumItem = {
  id: string;
  title: string;
  artist?: string;
  type?: string;
  releaseDate?: string;
  trackIds?: string[];
};
type PhonoPodcastItem = {
  id: string;
  title: string;
  artists?: string;
  releaseDate?: string;
};
type MarketingItem = {
  id: string | number;
  title?: string;
  date?: string;
  status?: string;
  platforms?: string[];
  contentTypes?: string[];
};
type AdminProcedureItem = {
  id: string | number;
  label?: string;
  dateLimite?: string;
  status?: string;
  organisme?: string;
  notes?: string;
};
type AdminStatusItem = {
  id: string | number;
  nom?: string;
  type?: string;
  dateDebut?: string;
  dateFin?: string;
  actif?: boolean;
  notes?: string;
};
type EditionCalendarItem = {
  id: string | number;
  title?: string;
  start?: string;
  end?: string;
  module?: string;
  sector?: string;
  [key: string]: unknown;
};
type TaskItem = {
  id: string;
  title: string;
  done?: boolean;
  description?: string;
  deadline?: string;
  sector?:
    | "Live"
    | "Phono"
    | "Admin"
    | "Marketing"
    | "Edition"
    | "Revenus"
    | "Autre";
};

function mapTaskSectorToCalendarSector(
  sector?: TaskItem["sector"]
): CalendarSector {
  if (sector === "Live") return "live";
  if (sector === "Phono") return "phono";
  if (sector === "Marketing") return "marketing";
  if (sector === "Edition") return "edition";
  if (sector === "Revenus") return "revenus";
  if (sector === "Autre") return "other";
  return "admin";
}

function normalizeToDateKey(value: string | undefined | null): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return frToDateKey(value);
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return null;
  return toDateKey(parsed);
}

function buildCalendarEvents(
  representations: TourDateItem[],
  rehearsals: RehearsalItem[],
  invoices: InvoiceItem[],
  sessions: SessionItem[],
  phonoTracks: PhonoTrackItem[],
  phonoAlbums: PhonoAlbumItem[],
  phonoPodcasts: PhonoPodcastItem[],
  tasks: TaskItem[],
  marketingEvents: MarketingItem[],
  adminProcedures: AdminProcedureItem[],
  adminStatuses: AdminStatusItem[],
  editionEvents: EditionCalendarItem[],
  customEvents: CustomCalendarItem[]
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  representations.forEach((r) => {
    const dateKey = frToDateKey(r.date);
    if (!dateKey) return;
    const isPast = dateKey < todayKey;
    const label =
      [r.venue, r.organisateur].filter(Boolean).join(" – ") ||
      r.city ||
      "Représentation";
    events.push({
      id: `live-rep-${r.id}`,
      dateKey,
      label,
      sector: "live",
      type: "representation",
      subLabel: "Représentation",
      isPast,
      place: [r.venue, r.city].filter(Boolean).join(" – ") || r.city
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
      isPast,
      time: r.time,
      place: r.location
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
      isPast,
      time: s.time,
      place: s.location
    });
  });

  phonoAlbums.forEach((a) => {
    const dateKey = frToDateKey(a.releaseDate || "");
    if (!dateKey) return;
    const isPast = dateKey < todayKey;
    const albumTypeLabel =
      a.type === "ep" ? "EP" : a.type === "single" ? "Single" : "Album";
    events.push({
      id: `phono-album-release-${a.id}`,
      dateKey,
      label: a.title || "Sortie album",
      sector: "phono",
      type: "album_release",
      subLabel: `${albumTypeLabel}${a.artist ? ` · ${a.artist}` : ""}`,
      isPast
    });
  });

  phonoTracks.forEach((t) => {
    const trackDateKey = frToDateKey(t.releaseDate || "");
    if (!trackDateKey) return;

    // Évite le doublon: si le titre est dans un album avec la même date, on n'affiche que l'album.
    const duplicatedByAlbum = phonoAlbums.some((a) => {
      const albumDateKey = frToDateKey(a.releaseDate || "");
      if (!albumDateKey || albumDateKey !== trackDateKey) return false;
      return Array.isArray(a.trackIds) && a.trackIds.includes(t.id);
    });
    if (duplicatedByAlbum) return;

    const isPast = trackDateKey < todayKey;
    events.push({
      id: `phono-track-release-${t.id}`,
      dateKey: trackDateKey,
      label: t.title || "Sortie titre",
      sector: "phono",
      type: "track_release",
      subLabel: t.mainArtist ? `Titre · ${t.mainArtist}` : "Titre",
      isPast
    });
  });

  // Sorties de podcasts (Phono)
  phonoPodcasts.forEach((p) => {
    const dateKey = frToDateKey(p.releaseDate || "");
    if (!dateKey) return;
    const isPast = dateKey < todayKey;
    events.push({
      id: `phono-podcast-release-${p.id}`,
      dateKey,
      label: p.title || "Sortie podcast",
      sector: "phono",
      type: "track_release",
      subLabel: p.artists ? `Podcast · ${p.artists}` : "Podcast",
      isPast
    });
  });

  tasks.forEach((t) => {
    const dateKey = normalizeToDateKey(t.deadline);
    if (!dateKey) return;
    const isPast = dateKey < todayKey;
    events.push({
      id: `task-${String(t.id)}`,
      dateKey,
      label: t.title || "Tâche",
      sector: mapTaskSectorToCalendarSector(t.sector),
      type: "task_deadline",
      subLabel: t.done ? "Tâche terminée" : "Tâche",
      isPast
    });
  });

  marketingEvents.forEach((m) => {
    const dateKey = normalizeToDateKey(m.date);
    if (!dateKey) return;
    const isPast = dateKey < todayKey;
    events.push({
      id: `marketing-event-${String(m.id)}`,
      dateKey,
      label: m.title || "Contenu marketing",
      sector: "marketing",
      type: "marketing_content",
      subLabel: "Publication",
      isPast
    });
  });

  adminProcedures.forEach((p) => {
    const dateKey = normalizeToDateKey(p.dateLimite);
    if (!dateKey) return;
    const isPast = dateKey < todayKey;
    events.push({
      id: `admin-procedure-${String(p.id)}`,
      dateKey,
      label: p.label || "Démarche administrative",
      sector: "admin",
      type: "admin_procedure",
      subLabel: "Date limite",
      isPast
    });
  });

  adminStatuses.forEach((s) => {
    const startKey = normalizeToDateKey(s.dateDebut);
    if (startKey) {
      events.push({
        id: `admin-status-start-${String(s.id)}`,
        dateKey: startKey,
        label: s.nom || "Statut administratif",
        sector: "admin",
        type: "admin_status_start",
        subLabel: "Début de statut",
        isPast: startKey < todayKey
      });
    }
    const endKey = normalizeToDateKey(s.dateFin);
    if (endKey) {
      events.push({
        id: `admin-status-end-${String(s.id)}`,
        dateKey: endKey,
        label: s.nom || "Statut administratif",
        sector: "admin",
        type: "admin_status_end",
        subLabel: "Fin de statut",
        isPast: endKey < todayKey
      });
    }
  });

  editionEvents.forEach((e) => {
    const dateKey = normalizeToDateKey(e.start);
    if (!dateKey) return;
    const isPast = dateKey < todayKey;
    events.push({
      id: `edition-event-${String(e.id)}`,
      dateKey,
      label: e.title || "Événement édition",
      sector: "edition",
      type: "edition_event",
      subLabel: "Édition",
      isPast
    });
  });

  customEvents.forEach((c) => {
    const dateKey = normalizeToDateKey(c.date);
    if (!dateKey) return;
    const isPast = dateKey < todayKey;
    events.push({
      id: `custom-${c.id}`,
      dateKey,
      label: c.title,
      sector: c.sector,
      type: "custom",
      subLabel: "Événement personnalisé",
      isPast,
      time: c.time,
      place: c.place
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
  { label: string; color: string; bgClass: string; iconColor: string; Icon: React.ElementType }
> = {
  live:      { label: "Live",      color: "text-blue-400",    bgClass: "bg-blue-400",    iconColor: "text-blue-400",    Icon: Mic2 },
  phono:     { label: "Phono",     color: "text-red-400",     bgClass: "bg-red-400",     iconColor: "text-red-400",     Icon: Music2 },
  admin:     { label: "Admin",     color: "text-violet-400",  bgClass: "bg-violet-400",  iconColor: "text-violet-400",  Icon: Briefcase },
  marketing: { label: "Marketing", color: "text-emerald-400", bgClass: "bg-emerald-400", iconColor: "text-emerald-400", Icon: Megaphone },
  edition:   { label: "Édition",   color: "text-cyan-400",    bgClass: "bg-cyan-400",    iconColor: "text-cyan-400",    Icon: BookOpen },
  revenus:   { label: "Revenus",   color: "text-orange-400",  bgClass: "bg-orange-400",  iconColor: "text-orange-400",  Icon: DollarSign },
  other:     { label: "Autre",     color: "text-[#F5F5F5]/40",bgClass: "bg-[#F5F5F5]/40",iconColor: "text-[#F5F5F5]/40",Icon: CalendarDays },
};

const DEFAULT_SECTOR_FILTERS = {
  live: false,
  phono: false,
  admin: false,
  marketing: false,
  edition: false,
  revenus: false,
  other: true
} satisfies Record<CalendarSector, boolean>;

export function GlobalCalendarPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const eventFromQuery = searchParams.get("event");
  const { data: sidekickData, preferencesReady } = useSidekickData();
  const enabledModules = sidekickData.preferences.enabledModules;
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [sectorFilters, setSectorFilters] = useLocalStorage<Record<
    CalendarSector,
    boolean
  >>("calendar:sector-filters", DEFAULT_SECTOR_FILTERS);

  const sectorFiltersSafe = useMemo(
    () => ({ ...DEFAULT_SECTOR_FILTERS, ...sectorFilters }),
    [sectorFilters]
  );
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState(() => toDateKey(new Date()));
  const [newEventSector, setNewEventSector] = useState<CalendarSector>("other");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventPlace, setNewEventPlace] = useState("");
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);

  // Si un secteur vient d'être désactivé, on évite de garder une valeur "ancienne"
  // dans le formulaire de création (sinon on peut créer un événement dans un secteur caché).
  useEffect(() => {
    if (!preferencesReady) return;
    if (newEventSector === "other") return;
    const allowed =
      (newEventSector === "live" && enabledModules.live) ||
      (newEventSector === "phono" && enabledModules.phono) ||
      (newEventSector === "admin" && enabledModules.admin) ||
      (newEventSector === "marketing" && enabledModules.marketing) ||
      (newEventSector === "edition" && enabledModules.edition) ||
      (newEventSector === "revenus" && enabledModules.revenus);

    if (!allowed) setNewEventSector("other");
  }, [
    preferencesReady,
    newEventSector,
    enabledModules.live,
    enabledModules.phono,
    enabledModules.admin,
    enabledModules.marketing,
    enabledModules.edition,
    enabledModules.revenus
  ]);

  const [representations] = useLocalStorage<TourDateItem[]>(
    "live:representations",
    []
  );
  const [rehearsals] = useLocalStorage<RehearsalItem[]>("live:rehearsals", []);
  const [invoices] = useLocalStorage<InvoiceItem[]>("incomes:invoices", []);
  const [sessions] = useLocalStorage<SessionItem[]>("phono:sessions-studio", []);
  const phonoTracks = (sidekickData.phono?.tracks ?? []) as PhonoTrackItem[];
  const phonoAlbums = (sidekickData.phono?.albums ?? []) as PhonoAlbumItem[];
  const phonoPodcasts = (sidekickData.phono?.podcasts ?? []) as PhonoPodcastItem[];
  const { customEvents, setCustomEvents, loading: calendarLoading, error: calendarError } = useCalendarData();
  const tasks = (sidekickData.tasks ?? []) as TaskItem[];
  const marketingEvents = (sidekickData.marketing.events ?? []) as MarketingItem[];
  const adminProcedures = (sidekickData.admin.procedures ?? []) as AdminProcedureItem[];
  const adminStatuses = (sidekickData.admin.statuses ?? []) as AdminStatusItem[];
  const editionEvents = ((sidekickData.calendar.events ?? []) as EditionCalendarItem[]).filter(
    (event) => event.sector === "edition" || event.module === "edition"
  );

  const allEvents = useMemo(
    () =>
      buildCalendarEvents(
        representations,
        rehearsals,
        invoices,
        sessions,
        phonoTracks,
        phonoAlbums,
        phonoPodcasts,
        tasks,
        marketingEvents,
        adminProcedures,
        adminStatuses,
        editionEvents,
        customEvents
      ),
    [
      representations,
      rehearsals,
      invoices,
      sessions,
      phonoTracks,
      phonoAlbums,
      phonoPodcasts,
      tasks,
      marketingEvents,
      adminProcedures,
      adminStatuses,
      editionEvents,
      customEvents
    ]
  );

  const filteredEvents = useMemo(
    () =>
      preferencesReady
        ? allEvents.filter((e) => sectorFiltersSafe[e.sector])
        : [],
    [allEvents, sectorFiltersSafe, preferencesReady]
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

  useEffect(() => {
    // Synchronise les filtres avec les modules activés : un module désactivé est toujours masqué.
    setSectorFilters((prev) => ({
      ...DEFAULT_SECTOR_FILTERS,
      ...prev,
      live: enabledModules.live ? prev.live : false,
      phono: enabledModules.phono ? prev.phono : false,
      admin: enabledModules.admin ? prev.admin : false,
      marketing: enabledModules.marketing ? prev.marketing : false,
      edition: enabledModules.edition ? prev.edition : false,
      revenus: enabledModules.revenus ? prev.revenus : false
    }));
  }, [enabledModules.live, enabledModules.phono, enabledModules.admin, enabledModules.marketing, enabledModules.edition, enabledModules.revenus]);

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

  const openCustomDialogForDate = (dateKey: string) => {
    setEditingEventId(null);
    setNewEventName("");
    setNewEventTime("");
    setNewEventPlace("");
    setNewEventSector("other");
    setNewEventDate(dateKey);
    setCustomDialogOpen(true);
  };

  const handleDeleteCustomEvent = (eventId: string) => {
    const customId = eventId.replace(/^custom-/, "");
    setCustomEvents((prev) => prev.filter((e) => e.id !== customId));
    setSelectedEvent(null);
  };

  const handleEditCustomEvent = (eventId: string) => {
    const customId = eventId.replace(/^custom-/, "");
    const existing = customEvents.find((e) => e.id === customId);
    if (!existing) return;
    setEditingEventId(customId);
    setNewEventName(existing.title);
    setNewEventDate(existing.date);
    setNewEventSector(existing.sector);
    setNewEventTime(existing.time ?? "");
    setNewEventPlace(existing.place ?? "");
    setSelectedEvent(null);
    setCustomDialogOpen(true);
  };

  const selectedEventDetails = useMemo(() => {
    if (!selectedEvent) return null;
    const match = selectedEvent.id.match(
      /^(live-rep|live-rehearsal|revenus-invoice|phono-session|task|marketing-event|admin-procedure|admin-status-start|admin-status-end|edition-event|custom)-(.+)$/
    );
    if (!match) return { event: selectedEvent, source: null };
    const [, type, id] = match;
    if (type === "live-rep") {
      const source = representations.find((r) => String(r.id) === id) ?? null;
      return { event: selectedEvent, source };
    }
    if (type === "live-rehearsal") {
      const source = rehearsals.find((r) => String(r.id) === id) ?? null;
      return { event: selectedEvent, source };
    }
    if (type === "revenus-invoice") {
      const source = invoices.find((i) => String(i.id) === id) ?? null;
      return { event: selectedEvent, source };
    }
    if (type === "phono-session") {
      const source = sessions.find((s) => String(s.id) === id) ?? null;
      return { event: selectedEvent, source };
    }
    if (type === "task") {
      const source = tasks.find((t) => String(t.id) === id) ?? null;
      return { event: selectedEvent, source };
    }
    if (type === "marketing-event") {
      const source = marketingEvents.find((m) => String(m.id) === id) ?? null;
      return { event: selectedEvent, source };
    }
    if (type === "admin-procedure") {
      const source = adminProcedures.find((p) => String(p.id) === id) ?? null;
      return { event: selectedEvent, source };
    }
    if (type === "admin-status-start" || type === "admin-status-end") {
      const source = adminStatuses.find((s) => String(s.id) === id) ?? null;
      return { event: selectedEvent, source };
    }
    if (type === "edition-event") {
      const source = editionEvents.find((e) => String(e.id) === id) ?? null;
      return { event: selectedEvent, source };
    }
    if (type === "custom") {
      const source = customEvents.find((e) => String(e.id) === id) ?? null;
      return { event: selectedEvent, source };
    }
    return { event: selectedEvent, source: null };
  }, [
    selectedEvent,
    representations,
    rehearsals,
    invoices,
    sessions,
    tasks,
    marketingEvents,
    adminProcedures,
    adminStatuses,
    editionEvents,
    customEvents
  ]);

  useEffect(() => {
    if (!eventFromQuery) return;
    const target = allEvents.find((event) => event.id === eventFromQuery);
    if (!target) return;
    setSelectedEvent((prev) => (prev?.id === target.id ? prev : target));
    const [year, month, day] = target.dateKey.split("-").map(Number);
    if (year && month && day) {
      setCurrentDate((prev) => {
        if (
          prev.getFullYear() === year &&
          prev.getMonth() === month - 1 &&
          prev.getDate() === day
        ) {
          return prev;
        }
        return new Date(year, month - 1, day);
      });
    }
  }, [eventFromQuery, allEvents]);

  const closeSelectedEventDialog = () => {
    setSelectedEvent(null);
    if (!eventFromQuery) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("event");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  if (calendarError) return (
    <PageError
      title="Impossible de charger ton calendrier"
      description="Vérifie ta connexion ou réessaie dans quelques instants."
      onRetry={() => mutate("calendar_events")}
    />
  );

  return !preferencesReady ? (
    <div className="space-y-4">
      <div className="animate-pulse space-y-2">
        <div className="h-6 w-40 bg-[rgba(245,245,245,0.08)]" />
        <div className="h-4 w-64 bg-[rgba(245,245,245,0.06)]" />
      </div>
      <div className="h-[480px] w-full border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)]" />
    </div>
  ) : (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] uppercase tracking-[0.12em] text-[#F5F5F5]/40">Planning</p>
          <h1 className="mt-1 text-[28px] font-bold uppercase tracking-tight text-[#F5F5F5]">
            Calendrier
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSyncPanelOpen((v) => !v)}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Synchroniser
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingEventId(null);
              setNewEventName("");
              setNewEventTime("");
              setNewEventPlace("");
              setNewEventSector("other");
              setNewEventDate(toDateKey(currentDate));
              setCustomDialogOpen(true);
            }}
          >
            + Événement
          </Button>
        </div>
      </div>

      {/* ── Sync panel ─────────────────────────────────────────────────────── */}
      {syncPanelOpen && (
        <div className="border border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#F5F5F5]/60">
              Synchronisation calendrier
            </p>
            <Button variant="ghost" size="sm" onClick={() => setSyncPanelOpen(false)}>Fermer</Button>
          </div>
          <ICalSyncPanel allEvents={allEvents} />
        </div>
      )}

      {/* ── Filtres secteurs ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-[0.1em] text-[#F5F5F5]/30 mr-1">
          Filtres :
        </span>
        {(Object.keys(SECTOR_CONFIG) as CalendarSector[]).map((sector) => {
          if (sector === "live" && !sidekickData.preferences.enabledModules.live) return null;
          if (sector === "phono" && !sidekickData.preferences.enabledModules.phono) return null;
          if (sector === "admin" && !sidekickData.preferences.enabledModules.admin) return null;
          if (sector === "marketing" && !sidekickData.preferences.enabledModules.marketing) return null;
          if (sector === "edition" && !sidekickData.preferences.enabledModules.edition) return null;
          if (sector === "revenus" && !sidekickData.preferences.enabledModules.revenus) return null;
          const config = SECTOR_CONFIG[sector];
          const isActive = sectorFiltersSafe[sector];
          const toggle = () =>
            setSectorFilters((prev) => {
              const merged = { ...DEFAULT_SECTOR_FILTERS, ...prev };
              return { ...merged, [sector]: !merged[sector] };
            });
          const { Icon, iconColor } = config;
          return (
            <button
              key={sector}
              type="button"
              onClick={toggle}
              className={cn(
                "inline-flex items-center gap-1.5 border px-2.5 py-1 text-[12px] font-medium transition-colors duration-150",
                isActive
                  ? "border-[rgba(245,245,245,0.2)] bg-[rgba(245,245,245,0.08)] text-[#F5F5F5]"
                  : "border-[rgba(245,245,245,0.08)] text-[#F5F5F5]/35 hover:text-[#F5F5F5]/60"
              )}
            >
              <Icon className={cn("h-3 w-3", isActive ? iconColor : "text-[#F5F5F5]/30")} />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* ── Grille calendrier + liste ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Calendrier mensuel */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-[rgba(245,245,245,0.08)] py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  aria-label="Mois précédent"
                  className="flex h-7 w-7 items-center justify-center text-[#F5F5F5]/40 transition-colors hover:text-[#F5F5F5]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[140px] text-center text-[13px] font-semibold capitalize text-[#F5F5F5]">
                  {monthLabel}
                </span>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  aria-label="Mois suivant"
                  className="flex h-7 w-7 items-center justify-center text-[#F5F5F5]/40 transition-colors hover:text-[#F5F5F5]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={goToToday}
                className="text-[11px] uppercase tracking-[0.08em] text-[#F5F5F5]/40 transition-colors hover:text-[#F0FF00]"
              >
                Aujourd'hui
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Jours de semaine */}
            <div className="mb-2 grid grid-cols-7 text-center">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/30">
                  {day}
                </div>
              ))}
            </div>

            {/* Grille */}
            <div className="grid grid-cols-7 gap-px bg-[rgba(245,245,245,0.06)]">
              {monthMatrix.map((week, weekIndex) =>
                week.map((day, dayIndex) => {
                  const dateKey = getDateKeyForDay(day);
                  const dayEvents = dateKey ? eventsByDateKey[dateKey] ?? [] : [];
                  const eventCount = dayEvents.length;
                  const isTodayDay = isToday(day);

                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={cn(
                        "flex min-h-[96px] flex-col bg-[#101010] p-1.5 transition-colors",
                        day ? "cursor-pointer hover:bg-[rgba(245,245,245,0.03)]" : "bg-[rgba(245,245,245,0.02)]",
                        isTodayDay && "bg-[#F0FF00]/5"
                      )}
                      onClick={() => {
                        if (eventCount === 0 && dateKey) openCustomDialogForDate(dateKey);
                      }}
                    >
                      <span className={cn(
                        "mb-1 inline-block w-fit text-[11px] font-medium leading-none",
                        !day && "invisible",
                        isTodayDay
                          ? "bg-[#F0FF00] px-1 py-0.5 text-[#101010] font-bold"
                          : "text-[#F5F5F5]/50"
                      )}>
                        {day ?? ""}
                      </span>

                      {/* Événements — occupent tout l'espace disponible */}
                      {eventCount > 0 && (() => {
                        const MAX_VISIBLE = 4;
                        const visible = dayEvents.slice(0, MAX_VISIBLE);
                        const overflow = dayEvents.length - MAX_VISIBLE;
                        return (
                          <div className="mt-1 flex flex-1 flex-col gap-px overflow-hidden">
                            {visible.map((ev) => {
                              const { Icon, iconColor } = SECTOR_CONFIG[ev.sector];
                              return (
                                <button
                                  key={ev.id}
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); openEventDialog(ev)(); }}
                                  className={cn(
                                    "flex min-h-0 flex-1 w-full items-start gap-1 px-1.5 py-0.5 text-left transition-colors",
                                    "bg-[rgba(245,245,245,0.06)] hover:bg-[rgba(245,245,245,0.11)]",
                                    ev.isPast && "opacity-45"
                                  )}
                                >
                                  <Icon className={cn("mt-[2px] h-2.5 w-2.5 shrink-0", iconColor)} />
                                  <span className="line-clamp-3 text-[10px] leading-[1.3] text-[#F5F5F5]/75 break-words">{ev.label}</span>
                                </button>
                              );
                            })}
                            {overflow > 0 && (
                              <div className="flex items-center px-1.5 text-[10px] text-[#F5F5F5]/30">
                                +{overflow} autre{overflow > 1 ? "s" : ""}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Prochains événements */}
        <Card className="h-full">
          <CardHeader className="border-b border-[rgba(245,245,245,0.08)] py-3">
            <CardTitle className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#F5F5F5]/60">
              Prochains événements
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            {upcomingEvents.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Aucun événement planifié"
                description="Ton agenda regroupe automatiquement tes dates de tournée, répétitions, sorties, et événements que tu ajoutes à la main."
                action={{
                  label: "Ajouter un événement",
                  onClick: () => {
                    setEditingEventId(null);
                    setNewEventName("");
                    setNewEventTime("");
                    setNewEventPlace("");
                    setNewEventSector("other");
                    setNewEventDate(toDateKey(currentDate));
                    setCustomDialogOpen(true);
                  }
                }}
              />
            ) : (
              <ul className="divide-y divide-[rgba(245,245,245,0.06)]">
                {upcomingEvents.map((ev) => {
                  const [y, m, d] = ev.dateKey.split("-");
                  const frDate = `${d}/${m}/${y}`;
                  const { Icon, iconColor } = SECTOR_CONFIG[ev.sector];
                  return (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={openEventDialog(ev)}
                        className={cn(
                          "flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-[rgba(245,245,245,0.03)]",
                          ev.isPast && "opacity-50"
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-[#F5F5F5]">{ev.label}</p>
                          <p className="text-[11px] text-[#F5F5F5]/40">{ev.subLabel}</p>
                        </div>
                        <span className="shrink-0 text-[11px] text-[#F5F5F5]/40">{frDate}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Création / Modification d'un événement personnalisé */}
      <Dialog
        open={customDialogOpen}
        onOpenChange={(open) => {
          setCustomDialogOpen(open);
          if (!open) setEditingEventId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEventId ? "Modifier l\u2019événement" : "Nouvel événement personnalisé"}
            </DialogTitle>
            <DialogDescription>
              {editingEventId
                ? "Modifie les informations de cet événement."
                : "Ajoute un événement rapide au calendrier : nom, secteur, heure et lieu."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newEventName.trim() || !newEventDate) return;
              if (editingEventId) {
                setCustomEvents((prev) =>
                  prev.map((ev) =>
                    ev.id === editingEventId
                      ? {
                          ...ev,
                          title: newEventName.trim(),
                          date: newEventDate,
                          time: newEventTime || undefined,
                          place: newEventPlace || undefined,
                          sector: newEventSector
                        }
                      : ev
                  )
                );
              } else {
                const id = Date.now().toString();
                const item: CustomCalendarItem = {
                  id,
                  title: newEventName.trim(),
                  date: newEventDate,
                  time: newEventTime || undefined,
                  place: newEventPlace || undefined,
                  sector: newEventSector
                };
                setCustomEvents((prev) => [...prev, item]);
              }
              setCustomDialogOpen(false);
              setEditingEventId(null);
              setNewEventName("");
              setNewEventTime("");
              setNewEventPlace("");
              setNewEventSector("other");
            }}
          >
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#F5F5F5]/60 uppercase tracking-[0.08em]" htmlFor="custom-name">Nom</label>
              <input
                id="custom-name"
                className="w-full border border-[rgba(245,245,245,0.12)] bg-[rgba(255,255,255,0.05)] px-3 py-2 text-sm text-[#F5F5F5] placeholder:text-[#F5F5F5]/40 focus:border-[#F0FF00]/40 focus:outline-none"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="Nom de l'événement"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-[#F5F5F5]/60 uppercase tracking-[0.08em]" htmlFor="custom-date">Date</label>
                <DatePicker
                  value={newEventDate}
                  onChange={(v) => setNewEventDate(v)}
                  placeholder="Sélectionner une date"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-[#F5F5F5]/60 uppercase tracking-[0.08em]" htmlFor="custom-time">Heure</label>
                <input
                  id="custom-time"
                  type="time"
                  className="w-full border border-[rgba(245,245,245,0.12)] bg-[rgba(255,255,255,0.05)] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#F0FF00]/40 focus:outline-none"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#F5F5F5]/60 uppercase tracking-[0.08em]" htmlFor="custom-sector">Secteur</label>
              <select
                id="custom-sector"
                className="w-full border border-[rgba(245,245,245,0.12)] bg-[rgba(255,255,255,0.05)] px-3 py-2 text-sm text-[#F5F5F5] focus:border-[#F0FF00]/40 focus:outline-none"
                value={newEventSector}
                onChange={(e) => setNewEventSector(e.target.value as CalendarSector)}
              >
                {enabledModules.live && <option value="live">Live</option>}
                {enabledModules.phono && <option value="phono">Phono</option>}
                {enabledModules.admin && <option value="admin">Admin</option>}
                {enabledModules.marketing && <option value="marketing">Marketing</option>}
                {enabledModules.edition && <option value="edition">Edition</option>}
                {enabledModules.revenus && <option value="revenus">Revenus</option>}
                <option value="other">Autre</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-[#F5F5F5]/60 uppercase tracking-[0.08em]" htmlFor="custom-place">Lieu</label>
              <input
                id="custom-place"
                className="w-full border border-[rgba(245,245,245,0.12)] bg-[rgba(255,255,255,0.05)] px-3 py-2 text-sm text-[#F5F5F5] placeholder:text-[#F5F5F5]/40 focus:border-[#F0FF00]/40 focus:outline-none"
                value={newEventPlace}
                onChange={(e) => setNewEventPlace(e.target.value)}
                placeholder="Ville, salle, adresse..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setCustomDialogOpen(false);
                  setEditingEventId(null);
                }}
              >
                Annuler
              </Button>
              <Button type="submit" size="sm">
                {editingEventId ? "Enregistrer" : "Ajouter"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedEvent}
        onOpenChange={(open) => !open && closeSelectedEventDialog()}
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
                    {(() => { const Ic = SECTOR_CONFIG[selectedEventDetails.event.sector].Icon; return <Ic className="h-4 w-4" />; })()}
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
                    {(() => { const Ic = SECTOR_CONFIG[selectedEventDetails.event.sector].Icon; return <Ic className="h-3.5 w-3.5" />; })()}
                    {SECTOR_CONFIG[selectedEventDetails.event.sector].label}
                  </span>
                </div>

                {selectedEventDetails.source &&
                  (() => {
                    const src = selectedEventDetails.source as
                      | TourDateItem
                      | RehearsalItem
                      | InvoiceItem
                      | SessionItem
                      | TaskItem
                      | MarketingItem
                      | AdminProcedureItem
                      | AdminStatusItem
                      | EditionCalendarItem;
                    const type = selectedEventDetails.event.type;
                    if (type === "representation") {
                      const r = src as TourDateItem;
                      return (
                        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                          <p>
                            <span className="font-medium">Salle :</span>{" "}
                            {r.venue || "—"}
                          </p>
                          <p>
                            <span className="font-medium">Organisateur :</span>{" "}
                            {r.organisateur || "—"}
                          </p>
                          <p>
                            <span className="font-medium">Ville :</span>{" "}
                            {r.city || "—"}
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
                    if (type === "task_deadline") {
                      const t = src as TaskItem;
                      return (
                        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                          <p>
                            <span className="font-medium">Tâche :</span>{" "}
                            {t.title || "—"}
                          </p>
                          <p>
                            <span className="font-medium">Statut :</span>{" "}
                            {t.done ? "Terminée" : "À faire"}
                          </p>
                          {t.description && (
                            <p className="text-muted-foreground">
                              <span className="font-medium">Description :</span>{" "}
                              {t.description}
                            </p>
                          )}
                        </div>
                      );
                    }
                    if (type === "marketing_content") {
                      const m = src as MarketingItem;
                      return (
                        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                          <p>
                            <span className="font-medium">Titre :</span>{" "}
                            {m.title || "—"}
                          </p>
                          {m.status && (
                            <p>
                              <span className="font-medium">Statut :</span>{" "}
                              {m.status}
                            </p>
                          )}
                          {Array.isArray(m.platforms) && m.platforms.length > 0 && (
                            <p>
                              <span className="font-medium">Plateformes :</span>{" "}
                              {m.platforms.join(", ")}
                            </p>
                          )}
                          {Array.isArray(m.contentTypes) && m.contentTypes.length > 0 && (
                            <p>
                              <span className="font-medium">Types :</span>{" "}
                              {m.contentTypes.join(", ")}
                            </p>
                          )}
                        </div>
                      );
                    }
                    if (type === "admin_procedure") {
                      const p = src as AdminProcedureItem;
                      return (
                        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                          <p>
                            <span className="font-medium">Démarche :</span>{" "}
                            {p.label || "—"}
                          </p>
                          {p.organisme && (
                            <p>
                              <span className="font-medium">Organisme :</span>{" "}
                              {p.organisme}
                            </p>
                          )}
                          {p.status && (
                            <p>
                              <span className="font-medium">Statut :</span>{" "}
                              {p.status}
                            </p>
                          )}
                          {p.notes && (
                            <p className="text-muted-foreground">
                              <span className="font-medium">Notes :</span> {p.notes}
                            </p>
                          )}
                        </div>
                      );
                    }
                    if (type === "admin_status_start" || type === "admin_status_end") {
                      const s = src as AdminStatusItem;
                      return (
                        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                          <p>
                            <span className="font-medium">Statut :</span>{" "}
                            {s.nom || "—"}
                          </p>
                          {s.type && (
                            <p>
                              <span className="font-medium">Type :</span>{" "}
                              {s.type}
                            </p>
                          )}
                          <p>
                            <span className="font-medium">Actif :</span>{" "}
                            {s.actif ? "Oui" : "Non"}
                          </p>
                          {s.notes && (
                            <p className="text-muted-foreground">
                              <span className="font-medium">Notes :</span> {s.notes}
                            </p>
                          )}
                        </div>
                      );
                    }
                    if (type === "edition_event") {
                      const e = src as EditionCalendarItem;
                      return (
                        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                          <p>
                            <span className="font-medium">Événement :</span>{" "}
                            {e.title || "—"}
                          </p>
                          {typeof e.start === "string" && (
                            <p>
                              <span className="font-medium">Début :</span>{" "}
                              {e.start}
                            </p>
                          )}
                          {typeof e.end === "string" && (
                            <p>
                              <span className="font-medium">Fin :</span>{" "}
                              {e.end}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                {selectedEventDetails.event.type === "custom" &&
                  selectedEventDetails.source &&
                  (() => {
                    const c = selectedEventDetails.source as CustomCalendarItem;
                    return (
                      <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                        {c.time && (
                          <p>
                            <span className="font-medium">Heure :</span> {c.time}
                          </p>
                        )}
                        {c.place && (
                          <p>
                            <span className="font-medium">Lieu :</span> {c.place}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                {selectedEventDetails.event.type === "custom" && (
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleEditCustomEvent(selectedEventDetails.event.id)
                      }
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() =>
                        handleDeleteCustomEvent(selectedEventDetails.event.id)
                      }
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Supprimer
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
