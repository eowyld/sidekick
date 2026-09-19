"use client";

import { useEffect, useMemo, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Share2 } from "lucide-react";

import { ICalSyncPanel } from "./ICalSyncPanel";
import { UpcomingBanner } from "./UpcomingBanner";
import { WeekScheduleGrid } from "./WeekScheduleGrid";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EventDialog, type EventDialogField } from "@/components/ui/event-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSidekickData } from "@/hooks/useSidekickData";
import { usePreferencesData } from "@/hooks/usePreferencesData";
import { useLiveData } from "@/hooks/useLiveData";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useIncomesData } from "@/hooks/useIncomesData";
import { useMarketingData } from "@/hooks/useMarketingData";
import { useAdminData } from "@/hooks/useAdminData";
import { useTasksData } from "@/hooks/useTasksData";
import { useCalendarData, type CustomCalendarItem } from "@/hooks/useCalendarData";
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";
import {
  expandCustomEventVisualSlots,
  normalizeCustomTimes,
  normalizeCustomTimesForDateRange,
  snapTimeToFiveMinuteGrid,
} from "@/lib/calendar-time";
import {
  getRepresentationScheduleTimes,
  type TimetableItem,
} from "@/modules/live/data/defaultRepresentations";
import type { CalendarEvent } from "@/modules/calendar/calendar-event-model";
import {
  EVENT_TIER,
  SECTOR_CONFIG,
  resolveCalendarEventLeadingGlyph,
  type CalendarEventType,
  type CalendarSector,
} from "@/modules/calendar/calendar-display-config";
import {
  daysBetweenDateKeys,
  enumerateDateKeysInclusive,
  startOfWeekMonday,
} from "@/modules/calendar/week-schedule-utils";
import { cn, formatTimeForDisplay } from "@/lib/utils";

export type { CalendarSector, CalendarEventType } from "@/modules/calendar/calendar-display-config";
export type { CalendarEvent } from "@/modules/calendar/calendar-event-model";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

type CalendarViewMode = "month" | "week";

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

function formatDateKeyFr(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
  timetable?: TimetableItem[];
};
type RehearsalItem = {
  id: number;
  date: string;
  time?: string;
  location: string;
  city?: string;
  label?: string;
  address?: string;
  note?: string;
};
type InvoiceItem = {
  id: string | number;
  number: string;
  client: string;
  subject?: string;
  amount?: string;
  dueDate: string;
  status?: string;
};
type SessionItem = {
  id: string | number;
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
type PhonoMixItem = {
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
  recurrence?: "none" | "monthly" | "quarterly" | "semi_annual" | "annual";
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
  status?: "todo" | "in_progress" | "done";
  description?: string;
  deadline?: string;
  sector?:
    | "Live"
    | "Phono"
    | "Admin"
    | "Marketing"
    | "Edition"
    | "Revenus"
    | "Projets"
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
  if (sector === "Projets") return "other";
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

function shiftDateKey(dateKey: string, recurrence: AdminProcedureItem["recurrence"]): string | null {
  const base = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  if (recurrence === "monthly") base.setMonth(base.getMonth() + 1);
  else if (recurrence === "quarterly") base.setMonth(base.getMonth() + 3);
  else if (recurrence === "semi_annual") base.setMonth(base.getMonth() + 6);
  else if (recurrence === "annual") base.setFullYear(base.getFullYear() + 1);
  else return null;
  return toDateKey(base);
}

function buildCalendarEvents(
  representations: TourDateItem[],
  rehearsals: RehearsalItem[],
  invoices: InvoiceItem[],
  sessions: SessionItem[],
  phonoTracks: PhonoTrackItem[],
  phonoAlbums: PhonoAlbumItem[],
  phonoMixes: PhonoMixItem[],
  tasks: TaskItem[],
  marketingEvents: MarketingItem[],
  adminProcedures: AdminProcedureItem[],
  adminStatuses: AdminStatusItem[],
  editionEvents: EditionCalendarItem[],
  customEvents: CustomCalendarItem[]
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  representations.forEach((r) => {
    const dateKey = normalizeToDateKey(r.date);
    if (!dateKey) return;
    const isPast = dateKey < todayKey;
    const label =
      [r.venue, r.organisateur].filter(Boolean).join(" – ") ||
      r.city ||
      "Représentation";
    const schedule = getRepresentationScheduleTimes(r.timetable ?? []);
    const nt = normalizeCustomTimes({
      time: schedule.start,
      endTime: schedule.end
    });
    events.push({
      id: `live-rep-${r.id}`,
      dateKey,
      label,
      sector: "live",
      type: "representation",
      subLabel: "Représentation",
      isPast,
      place: [r.venue, r.city].filter(Boolean).join(" – ") || r.city,
      time: nt.time,
      endTime: nt.endTime
    });
  });

  rehearsals.forEach((r) => {
    const dateKey = normalizeToDateKey(r.date);
    if (!dateKey) return;
    const isPast = dateKey < todayKey;
    events.push({
      id: `live-rehearsal-${r.id}`,
      dateKey,
      label: r.label || r.location || r.city || "Répétition",
      sector: "live",
      type: "rehearsal",
      subLabel: "Répétition",
      isPast,
      time: r.time,
      place: r.location || r.city
    });
  });

  invoices.forEach((i) => {
    const dateKey = normalizeToDateKey(i.dueDate);
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
    const dateKey = normalizeToDateKey(s.date);
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
    const dateKey = normalizeToDateKey(a.releaseDate || "");
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
    const trackDateKey = normalizeToDateKey(t.releaseDate || "");
    if (!trackDateKey) return;

    // Évite le doublon: si le titre est dans un album avec la même date, on n'affiche que l'album.
    const duplicatedByAlbum = phonoAlbums.some((a) => {
      const albumDateKey = normalizeToDateKey(a.releaseDate || "");
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

  // Sorties de mixes (Phono)
  phonoMixes.forEach((p) => {
    const dateKey = normalizeToDateKey(p.releaseDate || "");
    if (!dateKey) return;
    const isPast = dateKey < todayKey;
    events.push({
      id: `phono-mix-release-${p.id}`,
      dateKey,
      label: p.title || "Sortie mix",
      sector: "phono",
      type: "track_release",
      subLabel: p.artists ? `Mix · ${p.artists}` : "Mix",
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
      subLabel: (t.done ?? t.status === "done") ? "Tâche terminée" : "Tâche",
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
    if ((p.status ?? "a_faire") === "termine") return;
    const dateKey = normalizeToDateKey(p.dateLimite);
    if (!dateKey) return;
    const label = p.label || "Démarche administrative";

    const rec = p.recurrence ?? "none";
    const futureKeys: string[] = [];
    let cursor = dateKey;
    let safety = 0;
    while (futureKeys.length < 2 && safety < 12) {
      if (cursor >= todayKey) futureKeys.push(cursor);
      if (rec === "none") break;
      const next = shiftDateKey(cursor, rec);
      if (!next) break;
      cursor = next;
      safety += 1;
    }
    if (futureKeys.length === 0) {
      // fallback: affiche au moins l'occurrence actuelle si tout est dans le passé
      futureKeys.push(dateKey);
    }

    futureKeys.forEach((occurrenceDate, idx) => {
      events.push({
        id: `admin-procedure-${String(p.id)}-${occurrenceDate}`,
        dateKey: occurrenceDate,
        label,
        sector: "admin",
        type: "admin_procedure",
        subLabel: idx === 0 ? "Date limite" : "Prochaine échéance",
        isPast: occurrenceDate < todayKey,
      });
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
    const startKey = normalizeToDateKey(c.date);
    const endKey = normalizeToDateKey(c.endDate ?? c.date);
    if (!startKey || !endKey) return;
    const dayKeys = enumerateDateKeysInclusive(startKey, endKey);
    const slots = expandCustomEventVisualSlots({
      dayKeys,
      time: c.time,
      endTime: c.endTime,
    });
    slots.forEach(({ dateKey, time, endTime }) => {
      const isPast = dateKey < todayKey;
      const displayId =
        dayKeys.length === 1 ? `custom-${c.id}` : `custom-${c.id}__${dateKey}`;
      events.push({
        id: displayId,
        dateKey,
        label: c.title,
        sector: c.sector,
        type: "custom",
        subLabel: "Événement personnalisé",
        isPast,
        time,
        endTime,
        place: c.place,
      });
    });
  });

  return events;
}

const CUSTOM_TIME_NONE = "__none__";

const CUSTOM_TIME_HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);

const CUSTOM_TIME_MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0"),
);

function customTimeToHourMinuteSelects(time: string): {
  hour: string;
  minute: string;
} {
  const raw = time.trim();
  if (!raw) return { hour: CUSTOM_TIME_NONE, minute: "00" };
  const snapped = snapTimeToFiveMinuteGrid(raw);
  if (!snapped) return { hour: CUSTOM_TIME_NONE, minute: "00" };
  const [h, m] = snapped.split(":");
  return { hour: h, minute: m };
}

function hourMinuteSelectsToTime(hour: string, minute: string): string {
  if (hour === CUSTOM_TIME_NONE) return "";
  return `${hour}:${minute}`;
}

function CustomEventHourMinuteRow(props: {
  legend: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const { legend, value, onChange, disabled, idPrefix } = props;
  const { hour, minute } = customTimeToHourMinuteSelects(value);
  const timeActive = hour !== CUSTOM_TIME_NONE && !disabled;

  const triggerClass =
    "h-10 min-h-10 shrink-0 border-[rgba(245,245,245,0.12)] bg-[rgba(255,255,255,0.05)] px-3 py-0 text-sm leading-none focus:ring-[#F0FF00]/40";

  return (
    <div className="flex flex-col">
      <div className="mb-1.5 flex min-h-[2.75rem] items-end">
        <span className="text-[12px] font-medium uppercase leading-snug tracking-[0.08em] text-[#F5F5F5]/60">
          {legend}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 items-stretch">
        <Select
          value={hour}
          disabled={disabled}
          onValueChange={(h) => {
            if (disabled) return;
            if (h === CUSTOM_TIME_NONE) {
              onChange("");
              return;
            }
            onChange(hourMinuteSelectsToTime(h, minute));
          }}
        >
          <SelectTrigger id={`${idPrefix}-hour`} className={triggerClass}>
            <SelectValue placeholder="Heure" />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            <SelectItem value={CUSTOM_TIME_NONE} className="py-1.5 text-xs">
              —
            </SelectItem>
            {CUSTOM_TIME_HOUR_OPTIONS.map((h) => (
              <SelectItem key={h} value={h} className="py-1.5 text-xs">
                {h} h
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={minute}
          disabled={!timeActive}
          onValueChange={(min) => {
            if (!timeActive) return;
            onChange(hourMinuteSelectsToTime(hour, min));
          }}
        >
          <SelectTrigger id={`${idPrefix}-minute`} className={triggerClass}>
            <SelectValue placeholder="Min" />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {CUSTOM_TIME_MINUTE_OPTIONS.map((m) => (
              <SelectItem key={m} value={m} className="py-1.5 text-xs">
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Tous les secteurs visibles par défaut. `sectorFiltersSafe` masque ensuite les
// secteurs dont le module est désactivé ; un module activé reste donc visible
// sans action de l'utilisateur.
const DEFAULT_SECTOR_FILTERS = {
  live: true,
  phono: true,
  admin: true,
  marketing: true,
  edition: true,
  revenus: true,
  other: true
} satisfies Record<CalendarSector, boolean>;

// ── CTA par type d'événement ───────────────────────────────────────────────
const EVENT_CTA: Partial<
  Record<CalendarEventType, { label: string; href: string }>
> = {
  representation:     { label: "Voir dans Live →",      href: "/live/representations" },
  rehearsal:          { label: "Voir dans Live →",      href: "/live/repetitions" },
  session:            { label: "Voir dans Phono →",     href: "/phono/sessions-studio" },
  album_release:      { label: "Voir dans Phono →",     href: "/phono" },
  track_release:      { label: "Voir dans Phono →",     href: "/phono" },
  invoice:            { label: "Voir dans Revenus →",   href: "/incomes/facturation" },
  task_deadline:      { label: "Voir les tâches →",     href: "/tasks" },
  marketing_content:  { label: "Voir dans Marketing →", href: "/marketing" },
  admin_procedure:    { label: "Voir dans Admin →",     href: "/admin" },
  admin_status_start: { label: "Voir dans Admin →",     href: "/admin" },
  admin_status_end:   { label: "Voir dans Admin →",     href: "/admin" },
  edition_event:      { label: "Voir dans Édition →",   href: "/edition" },
};

// ── Champs par type d'événement ────────────────────────────────────────────
function buildCalendarEventFields(
  type: CalendarEventType,
  source: unknown
): EventDialogField[] {
  if (!source) return [];

  if (type === "representation") {
    const r = source as TourDateItem;
    const fields: EventDialogField[] = [
      { label: "Salle", value: r.venue || "—" },
      { label: "Ville", value: r.city || "—" },
    ];
    if (r.address) fields.push({ label: "Adresse", value: r.address });
    if (r.organisateur) fields.push({ label: "Organisateur", value: r.organisateur });
    if (r.status) fields.push({ label: "Statut", value: r.status });
    if (r.timetable && r.timetable.length > 0) {
      fields.push({
        label: "Horaires",
        value: (
          <div className="flex flex-col gap-0.5">
            {r.timetable.map((t, i) => (
              <span key={i} className="flex gap-2">
                <span className="min-w-[38px] text-[#F5F5F5]/35 tabular-nums">{t.time}</span>
                <span>{t.activity}</span>
              </span>
            ))}
          </div>
        ),
      });
    }
    if (r.note) fields.push({ label: "Note", value: r.note });
    return fields;
  }

  if (type === "rehearsal") {
    const r = source as RehearsalItem;
    const fields: EventDialogField[] = [{ label: "Lieu", value: r.location || r.city || "—" }];
    if (r.time) fields.push({ label: "Heure", value: r.time });
    if (r.address) fields.push({ label: "Adresse", value: r.address });
    if (r.note) fields.push({ label: "Note", value: r.note });
    return fields;
  }

  if (type === "invoice") {
    const i = source as InvoiceItem;
    const fields: EventDialogField[] = [
      { label: "N° facture", value: i.number },
      { label: "Client", value: i.client },
    ];
    if (i.subject) fields.push({ label: "Objet", value: i.subject });
    if (i.amount) fields.push({ label: "Montant", value: i.amount.includes("€") ? i.amount : `${i.amount} €` });
    fields.push({ label: "Statut", value: i.status === "payee" ? "Payée" : "En attente" });
    return fields;
  }

  if (type === "session") {
    const s = source as SessionItem;
    const fields: EventDialogField[] = [{ label: "Lieu", value: s.location }];
    if (s.time) fields.push({ label: "Heure", value: s.time });
    if (s.sessionType) fields.push({ label: "Type", value: s.sessionType });
    return fields;
  }

  if (type === "album_release" || type === "track_release") {
    // source est PhonoAlbumItem | PhonoTrackItem | PhonoMixItem
    const a = source as { title?: string; artist?: string; mainArtist?: string; type?: string; artists?: string };
    const fields: EventDialogField[] = [];
    const artist = a.artist ?? a.mainArtist ?? a.artists;
    if (artist) fields.push({ label: "Artiste", value: artist });
    if (a.type) {
      const typeLabel = a.type === "ep" ? "EP" : a.type === "single" ? "Single" : a.type === "album" ? "Album" : a.type;
      fields.push({ label: "Type", value: typeLabel });
    }
    return fields;
  }

  if (type === "task_deadline") {
    const t = source as TaskItem;
    const fields: EventDialogField[] = [
      { label: "Tâche", value: t.title || "—" },
      { label: "Statut", value: (t.done ?? t.status === "done") ? "Terminée" : "À faire" },
    ];
    if (t.description) fields.push({ label: "Description", value: t.description });
    return fields;
  }

  if (type === "marketing_content") {
    const m = source as MarketingItem;
    const fields: EventDialogField[] = [];
    if (m.title) fields.push({ label: "Titre", value: m.title });
    if (m.status) fields.push({ label: "Statut", value: m.status });
    if (Array.isArray(m.platforms) && m.platforms.length > 0)
      fields.push({ label: "Plateformes", value: m.platforms.join(", ") });
    if (Array.isArray(m.contentTypes) && m.contentTypes.length > 0)
      fields.push({ label: "Types", value: m.contentTypes.join(", ") });
    return fields;
  }

  if (type === "admin_procedure") {
    const p = source as AdminProcedureItem;
    const fields: EventDialogField[] = [{ label: "Démarche", value: p.label || "—" }];
    if (p.organisme) fields.push({ label: "Organisme", value: p.organisme });
    if (p.status) fields.push({ label: "Statut", value: p.status });
    if (p.notes) fields.push({ label: "Notes", value: p.notes });
    return fields;
  }

  if (type === "admin_status_start" || type === "admin_status_end") {
    const s = source as AdminStatusItem;
    const fields: EventDialogField[] = [{ label: "Statut", value: s.nom || "—" }];
    if (s.type) fields.push({ label: "Type", value: s.type });
    fields.push({ label: "Actif", value: s.actif ? "Oui" : "Non" });
    if (s.notes) fields.push({ label: "Notes", value: s.notes });
    return fields;
  }

  if (type === "edition_event") {
    const e = source as EditionCalendarItem;
    const fields: EventDialogField[] = [{ label: "Événement", value: e.title || "—" }];
    if (typeof e.start === "string") fields.push({ label: "Début", value: e.start });
    if (typeof e.end === "string") fields.push({ label: "Fin", value: e.end });
    return fields;
  }

  if (type === "custom") {
    const c = source as CustomCalendarItem;
    const fields: EventDialogField[] = [];
    const sk = normalizeToDateKey(c.date);
    const ek = normalizeToDateKey(c.endDate ?? c.date);
    if (sk && ek && ek !== sk) {
      fields.push({
        label: "Période",
        value: `${formatDateKeyFr(sk)} → ${formatDateKeyFr(ek)}`,
      });
    } else if (sk) {
      fields.push({ label: "Date", value: formatDateKeyFr(sk) });
    }
    if (c.time) {
      const multi = sk && ek && ek !== sk;
      fields.push({
        label: multi ? "Début (1er jour)" : "Heure",
        value: formatTimeForDisplay(c.time),
      });
      if (c.endTime) {
        fields.push({
          label: multi ? "Fin (dernier jour)" : "Fin",
          value: formatTimeForDisplay(c.endTime),
        });
      }
    }
    if (c.place) fields.push({ label: "Lieu", value: c.place });
    return fields;
  }

  return [];
}

export function GlobalCalendarPage() {
  const posthog = usePostHog();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const eventFromQuery = searchParams.get("event");
  const { data: sidekickData } = useSidekickData();
  // Les préférences vivent dans `user_preferences` depuis le 31/08 :
  // `useSidekickData` est du localStorage pur et ne lit jamais Supabase, si
  // bien qu'un module coupé dans les Réglages restait visible ici (ses défauts
  // sont tous à `true`). Même bug que celui corrigé sur `DashboardPage` le
  // 14/09. `preferencesReady` vient donc de ce hook-ci, plus de l'autre — il
  // ne signalait que la relecture du localStorage sous la bonne clé.
  const { enabledModules, preferencesReady } = usePreferencesData();
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // v2 : l'ancienne clé avait été persistée avec tous les secteurs à `false`
  // (calendrier vide). On repart de la nouvelle valeur par défaut.
  const [sectorFilters, setSectorFilters] = useLocalStorage<Record<
    CalendarSector,
    boolean
  >>("calendar:sector-filters:v2", DEFAULT_SECTOR_FILTERS);

  // Masque les secteurs des modules désactivés sans toucher au choix persisté :
  // réactiver un module restaure donc son secteur.
  const sectorFiltersSafe = useMemo(() => {
    const merged = { ...DEFAULT_SECTOR_FILTERS, ...sectorFilters };
    return {
      ...merged,
      live: merged.live && enabledModules.live,
      phono: merged.phono && enabledModules.phono,
      admin: merged.admin && enabledModules.admin,
      marketing: merged.marketing && enabledModules.marketing,
      edition: merged.edition && enabledModules.edition,
      revenus: merged.revenus && enabledModules.revenus,
    };
  }, [
    sectorFilters,
    enabledModules.live,
    enabledModules.phono,
    enabledModules.admin,
    enabledModules.marketing,
    enabledModules.edition,
    enabledModules.revenus,
  ]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedEventAnchor, setSelectedEventAnchor] = useState<DOMRect | null>(null);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState(() => toDateKey(new Date()));
  const [newEventEndDate, setNewEventEndDate] = useState(() =>
    toDateKey(new Date()),
  );
  const [newEventSector, setNewEventSector] = useState<CalendarSector>("other");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventEndTime, setNewEventEndTime] = useState("");
  const [newEventPlace, setNewEventPlace] = useState("");
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);
  const [calendarView, setCalendarView] = useLocalStorage<CalendarViewMode>(
    "calendar:view-mode",
    "month"
  );

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

  const { tourDates: representations, rehearsals: liveRehearsals } = useLiveData();
  const rehearsals = liveRehearsals as unknown as RehearsalItem[];
  const { invoices } = useIncomesData();
  const {
    tracks: phonoTracks,
    albums: phonoAlbums,
    mixes: phonoMixes,
    sessions: phonoSessions
  } = usePhonoData();
  const sessions = phonoSessions as unknown as SessionItem[];
  const { customEvents, setCustomEvents, loading: calendarLoading, error: calendarError } = useCalendarData();
  const { tasks } = useTasksData();
  const { marketingEvents } = useMarketingData();
  const { statuses, procedures } = useAdminData();
  const adminProcedures = procedures as unknown as AdminProcedureItem[];
  const adminStatuses = statuses as unknown as AdminStatusItem[];
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
        phonoMixes,
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
      phonoMixes,
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

  const weekRangeLabel = useMemo(() => {
    const mon = startOfWeekMonday(currentDate);
    const sun = new Date(mon);
    sun.setDate(sun.getDate() + 6);
    const sameMonthYear =
      mon.getMonth() === sun.getMonth() && mon.getFullYear() === sun.getFullYear();
    if (sameMonthYear) {
      return `${mon.getDate()}–${sun.getDate()} ${mon.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      })}`;
    }
    return `${mon.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    })} – ${sun.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  }, [currentDate]);

  const weekMondayKey = useMemo(() => toDateKey(startOfWeekMonday(currentDate)), [currentDate]);

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

  const goToPreviousWeek = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const goToNextWeek = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
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

  const todayDateKey = useMemo(() => toDateKey(today), [today]);

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

  const openEventDialog = (ev: CalendarEvent, rect?: DOMRect) => {
    setSelectedEvent(ev);
    setSelectedEventAnchor(rect ?? null);
  };

  const openCustomDialogForDate = (dateKey: string) => {
    setEditingEventId(null);
    setNewEventName("");
    setNewEventTime("");
    setNewEventEndTime("");
    setNewEventPlace("");
    setNewEventSector("other");
    setNewEventDate(dateKey);
    setNewEventEndDate(dateKey);
    setCustomDialogOpen(true);
  };

  const handleDeleteCustomEvent = (eventId: string) => {
    const customId = eventId.replace(/^custom-/, "").split("__")[0];
    posthog?.capture("event_deleted", { module: "calendar" });
    setCustomEvents((prev) => prev.filter((e) => e.id !== customId));
    setSelectedEvent(null);
  };

  const handleEditCustomEvent = (eventId: string) => {
    const customId = eventId.replace(/^custom-/, "").split("__")[0];
    const existing = customEvents.find((e) => e.id === customId);
    if (!existing) return;
    setEditingEventId(customId);
    setNewEventName(existing.title);
    setNewEventDate(existing.date);
    setNewEventEndDate(existing.endDate ?? existing.date);
    setNewEventSector(existing.sector);
    setNewEventTime(
      existing.time
        ? snapTimeToFiveMinuteGrid(existing.time) ?? existing.time.trim()
        : "",
    );
    setNewEventEndTime(
      existing.endTime
        ? snapTimeToFiveMinuteGrid(existing.endTime) ?? existing.endTime.trim()
        : "",
    );
    setNewEventPlace(existing.place ?? "");
    setSelectedEvent(null);
    setCustomDialogOpen(true);
  };

  const selectedEventDetails = useMemo(() => {
    if (!selectedEvent) return null;

    const albumReleaseMatch = selectedEvent.id.match(/^phono-album-release-(.+)$/);
    if (albumReleaseMatch) {
      const id = albumReleaseMatch[1];
      const source = phonoAlbums.find((a) => String(a.id) === id) ?? null;
      return { event: selectedEvent, source };
    }
    const trackReleaseMatch = selectedEvent.id.match(/^phono-track-release-(.+)$/);
    if (trackReleaseMatch) {
      const id = trackReleaseMatch[1];
      const source = phonoTracks.find((t) => String(t.id) === id) ?? null;
      return { event: selectedEvent, source };
    }
    const mixReleaseMatch = selectedEvent.id.match(/^phono-mix-release-(.+)$/);
    if (mixReleaseMatch) {
      const id = mixReleaseMatch[1];
      const source = phonoMixes.find((p) => String(p.id) === id) ?? null;
      return { event: selectedEvent, source };
    }

    const normalizedId = selectedEvent.id.replace(
      /^admin-procedure-(.+)-\d{4}-\d{2}-\d{2}$/,
      "admin-procedure-$1"
    );
    const match = normalizedId.match(
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
      const storageId = id.split("__")[0];
      const source =
        customEvents.find((e) => String(e.id) === storageId) ?? null;
      return { event: selectedEvent, source };
    }
    return { event: selectedEvent, source: null };
  }, [
    selectedEvent,
    representations,
    rehearsals,
    invoices,
    sessions,
    phonoAlbums,
    phonoTracks,
    phonoMixes,
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
    setSelectedEventAnchor(null);
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
              setNewEventEndTime("");
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
        <span className="text-[11px] uppercase tracking-[0.1em] text-[#F5F5F5]/55 mr-1">
          Filtres :
        </span>
        {(Object.keys(SECTOR_CONFIG) as CalendarSector[]).map((sector) => {
          if (sector === "live" && !enabledModules.live) return null;
          if (sector === "phono" && !enabledModules.phono) return null;
          if (sector === "admin" && !enabledModules.admin) return null;
          if (sector === "marketing" && !enabledModules.marketing) return null;
          if (sector === "edition" && !enabledModules.edition) return null;
          if (sector === "revenus" && !enabledModules.revenus) return null;
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

      {/* ── Bannière À venir ───────────────────────────────────────────────── */}
      <div className="w-full max-w-[908px]">
        <UpcomingBanner
          filteredEvents={filteredEvents}
          onEventClick={(ev, rect) => openEventDialog(ev, rect)}
          onAddEvent={() => {
            setEditingEventId(null);
            setNewEventName("");
            setNewEventTime("");
            setNewEventEndTime("");
            setNewEventPlace("");
            setNewEventSector("other");
            setNewEventDate(toDateKey(currentDate));
            setCustomDialogOpen(true);
          }}
        />
      </div>

      {/* ── Grille calendrier ──────────────────────────────────────────────── */}
      <div className="grid w-full max-w-[908px] grid-cols-1 gap-4">

        <Card className="">
          <CardHeader className="border-b border-[rgba(245,245,245,0.08)] py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCalendarView("month")}
                  className={cn(
                    "rounded border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.06em] transition-colors",
                    calendarView === "month"
                      ? "border-[#F0FF00]/50 bg-[#F0FF00]/10 text-[#F0FF00]"
                      : "border-[rgba(245,245,245,0.1)] text-[#F5F5F5]/45 hover:text-[#F5F5F5]/70"
                  )}
                >
                  Mois
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarView("week")}
                  className={cn(
                    "rounded border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.06em] transition-colors",
                    calendarView === "week"
                      ? "border-[#F0FF00]/50 bg-[#F0FF00]/10 text-[#F0FF00]"
                      : "border-[rgba(245,245,245,0.1)] text-[#F5F5F5]/45 hover:text-[#F5F5F5]/70"
                  )}
                >
                  Semaine
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={calendarView === "month" ? goToPreviousMonth : goToPreviousWeek}
                    aria-label={calendarView === "month" ? "Mois précédent" : "Semaine précédente"}
                    className="flex h-7 w-7 items-center justify-center text-[#F5F5F5]/40 transition-colors hover:text-[#F5F5F5]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-[160px] text-center text-[13px] font-semibold capitalize text-[#F5F5F5]">
                    {calendarView === "month" ? monthLabel : weekRangeLabel}
                  </span>
                  <button
                    type="button"
                    onClick={calendarView === "month" ? goToNextMonth : goToNextWeek}
                    aria-label={calendarView === "month" ? "Mois suivant" : "Semaine suivante"}
                    className="flex h-7 w-7 items-center justify-center text-[#F5F5F5]/40 transition-colors hover:text-[#F5F5F5]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={goToToday}
                  className="shrink-0 text-[11px] uppercase tracking-[0.08em] text-[#F5F5F5]/40 transition-colors hover:text-[#F0FF00]"
                >
                  Aujourd'hui
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className={cn(calendarView === "week" ? "pt-3" : "pt-4")}>
            {calendarView === "month" ? (
              <>
                <div className="mb-2 grid grid-cols-7 text-center">
                  {WEEKDAYS.map((day) => (
                    <div
                      key={day}
                      className="py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/30"
                    >
                      {day}
                    </div>
                  ))}
                </div>

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
                            day
                              ? "cursor-pointer hover:bg-[rgba(245,245,245,0.03)]"
                              : "bg-[rgba(245,245,245,0.02)]",
                            isTodayDay && "bg-[#F0FF00]/5"
                          )}
                          onClick={() => {
                            if (eventCount === 0 && dateKey) openCustomDialogForDate(dateKey);
                          }}
                        >
                          <span
                            className={cn(
                              "mb-1 inline-block w-fit text-[11px] font-medium leading-none",
                              !day && "invisible",
                              isTodayDay
                                ? "bg-[#F0FF00] px-1 py-0.5 font-bold text-[#101010]"
                                : "text-[#F5F5F5]/50"
                            )}
                          >
                            {day ?? ""}
                          </span>

                          {eventCount > 0 && (() => {
                            const MAX_VISIBLE = 3;
                            const visible = dayEvents
                              .slice()
                              .sort((a, b) => EVENT_TIER[a.type] - EVENT_TIER[b.type])
                              .slice(0, MAX_VISIBLE);
                            const overflow = dayEvents.length - MAX_VISIBLE;
                            return (
                              <div className="mt-1 flex flex-1 flex-col gap-px overflow-hidden">
                                {visible.map((ev) => {
                                  const { borderClass } = SECTOR_CONFIG[ev.sector];
                                  const tier = EVENT_TIER[ev.type];
                                  const glyph = resolveCalendarEventLeadingGlyph(ev);
                                  return (
                                    <button
                                      key={ev.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEventDialog(
                                          ev,
                                          e.currentTarget.getBoundingClientRect()
                                        );
                                      }}
                                      className={cn(
                                        "flex min-h-0 w-full flex-1 items-start gap-1 border-l-2 py-[3px] pl-1.5 pr-1 text-left transition-colors duration-150",
                                        "bg-[rgba(245,245,245,0.07)] hover:bg-[rgba(245,245,245,0.13)]",
                                        borderClass,
                                        ev.isPast && "opacity-45"
                                      )}
                                    >
                                      {glyph ? (
                                        <glyph.Icon
                                          className={cn(
                                            "mt-[2px] h-2.5 w-2.5 shrink-0",
                                            glyph.className,
                                          )}
                                        />
                                      ) : null}
                                      <span
                                        className={cn(
                                          "line-clamp-3 break-words text-[10px] leading-[1.3] text-[#F5F5F5]/80",
                                          tier === 1 && "font-semibold"
                                        )}
                                      >
                                        {ev.label}
                                      </span>
                                    </button>
                                  );
                                })}
                                {overflow > 0 && (
                                  <div className="flex items-center pl-1.5 text-[10px] text-[#F5F5F5]/35">
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
              </>
            ) : (
              <WeekScheduleGrid
                weekMondayKey={weekMondayKey}
                todayKey={todayDateKey}
                events={filteredEvents.filter((ev) => {
                  const d = daysBetweenDateKeys(ev.dateKey, weekMondayKey);
                  return d >= 0 && d <= 6;
                })}
                onEventClick={openEventDialog}
                onEmptyTimedAreaClick={openCustomDialogForDate}
              />
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
                : "Ajoute un événement : nom, secteur, dates de début et de fin. Sur plusieurs jours avec heures : début le premier jour, fin le dernier jour ; la grille prolonge le créneau sur les jours entre les deux."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newEventName.trim() || !newEventDate || !newEventEndDate) return;
              const start = newEventDate.trim();
              const end =
                newEventEndDate.trim() >= start ? newEventEndDate.trim() : start;
              const endDateField = end !== start ? end : undefined;
              const nt = normalizeCustomTimesForDateRange({
                date: start,
                endDate: endDateField ?? start,
                time: newEventTime || undefined,
                endTime: newEventEndTime || undefined,
              });
              if (editingEventId) {
                setCustomEvents((prev) =>
                  prev.map((ev) =>
                    ev.id === editingEventId
                      ? {
                          ...ev,
                          title: newEventName.trim(),
                          date: start,
                          endDate: endDateField,
                          time: nt.time,
                          endTime: nt.endTime,
                          place: newEventPlace || undefined,
                          sector: newEventSector,
                        }
                      : ev
                  )
                );
              } else {
                const id = Date.now().toString();
                const item: CustomCalendarItem = {
                  id,
                  title: newEventName.trim(),
                  date: start,
                  endDate: endDateField,
                  time: nt.time,
                  endTime: nt.endTime,
                  place: newEventPlace || undefined,
                  sector: newEventSector,
                };
                posthog?.capture("event_created", { module: "calendar" });
                posthog?.capture("item_created", { module: "calendar" });
                setCustomEvents((prev) => [...prev, item]);
              }
              setCustomDialogOpen(false);
              setEditingEventId(null);
              setNewEventName("");
              setNewEventTime("");
              setNewEventEndTime("");
              setNewEventPlace("");
              setNewEventSector("other");
              const todayIso = toDateKey(new Date());
              setNewEventDate(todayIso);
              setNewEventEndDate(todayIso);
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-[#F5F5F5]/60 uppercase tracking-[0.08em]">
                  Date de début
                </label>
                <DatePicker
                  value={newEventDate}
                  onChange={(v) => {
                    setNewEventDate(v);
                    setNewEventEndDate((prev) =>
                      prev < v ? v : prev,
                    );
                  }}
                  placeholder="Début"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-[#F5F5F5]/60 uppercase tracking-[0.08em]">
                  Date de fin
                </label>
                <DatePicker
                  value={newEventEndDate}
                  onChange={setNewEventEndDate}
                  placeholder="Fin (inclus)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch">
              <CustomEventHourMinuteRow
                idPrefix="custom-start"
                legend="Heure de début (optionnel)"
                value={newEventTime}
                onChange={(next) => {
                  setNewEventTime(next);
                  if (!next) setNewEventEndTime("");
                }}
              />
              <CustomEventHourMinuteRow
                idPrefix="custom-end"
                legend="Fin (optionnel)"
                value={newEventEndTime}
                disabled={!newEventTime}
                onChange={setNewEventEndTime}
              />
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
                  setNewEventTime("");
                  setNewEventEndTime("");
                  const todayIso = toDateKey(new Date());
                  setNewEventDate(todayIso);
                  setNewEventEndDate(todayIso);
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

      {selectedEventDetails && (() => {
        const ev = selectedEventDetails.event;
        const cta = ev.type !== "custom" ? (EVENT_CTA[ev.type] ?? null) : null;
        const fields = buildCalendarEventFields(ev.type, selectedEventDetails.source);
        return (
          <EventDialog
            open={!!selectedEvent}
            onClose={closeSelectedEventDialog}
            title={ev.label}
            subLabel={ev.subLabel ?? ""}
            dateKey={ev.dateKey}
            sector={ev.sector}
            isPast={ev.isPast}
            fields={fields}
            ctaLabel={cta?.label}
            ctaHref={cta?.href}
            onEdit={ev.type === "custom" ? () => handleEditCustomEvent(ev.id) : undefined}
            onDelete={ev.type === "custom" ? () => handleDeleteCustomEvent(ev.id) : undefined}
            anchorRect={selectedEventAnchor}
          />
        );
      })()}
    </div>
  )
}
