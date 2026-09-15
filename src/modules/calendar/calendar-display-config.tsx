import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CheckSquare,
  DollarSign,
  Mic2,
  Music2,
  BookOpen,
  Briefcase,
  Megaphone,
} from "lucide-react";

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

export const SECTOR_CONFIG: Record<
  CalendarSector,
  {
    label: string;
    color: string;
    bgClass: string;
    iconColor: string;
    borderClass: string;
    Icon: LucideIcon;
  }
> = {
  live: {
    label: "Live",
    color: "text-blue-400",
    bgClass: "bg-blue-400",
    iconColor: "text-blue-400",
    borderClass: "border-l-blue-400",
    Icon: Mic2,
  },
  phono: {
    label: "Phono",
    color: "text-red-400",
    bgClass: "bg-red-400",
    iconColor: "text-red-400",
    borderClass: "border-l-red-400",
    Icon: Music2,
  },
  admin: {
    label: "Admin",
    color: "text-violet-400",
    bgClass: "bg-violet-400",
    iconColor: "text-violet-400",
    borderClass: "border-l-violet-400",
    Icon: Briefcase,
  },
  marketing: {
    label: "Marketing",
    color: "text-emerald-400",
    bgClass: "bg-emerald-400",
    iconColor: "text-emerald-400",
    borderClass: "border-l-emerald-400",
    Icon: Megaphone,
  },
  edition: {
    label: "Édition",
    color: "text-cyan-400",
    bgClass: "bg-cyan-400",
    iconColor: "text-cyan-400",
    borderClass: "border-l-cyan-400",
    Icon: BookOpen,
  },
  revenus: {
    label: "Revenus",
    color: "text-orange-400",
    bgClass: "bg-orange-400",
    iconColor: "text-orange-400",
    borderClass: "border-l-orange-400",
    Icon: DollarSign,
  },
  other: {
    label: "Autre",
    color: "text-[#F5F5F5]/40",
    bgClass: "bg-[#F5F5F5]/40",
    iconColor: "text-[#F5F5F5]/40",
    borderClass: "border-l-white/20",
    Icon: CalendarDays,
  },
};

export const EVENT_TIER: Record<CalendarEventType, 1 | 2 | 3> = {
  representation: 1,
  album_release: 1,
  track_release: 1,
  rehearsal: 2,
  session: 2,
  marketing_content: 2,
  edition_event: 2,
  custom: 2,
  invoice: 3,
  task_deadline: 3,
  admin_procedure: 2,
  admin_status_start: 2,
  admin_status_end: 2,
};

/**
 * Glyphe à gauche du libellé (mois / semaine). Réservé à ce qui se repère d’un
 * coup d’œil : les temps forts (tier 1) et les tâches. Pour tout le reste, la
 * barre de couleur du secteur suffit — un glyphe de plus alourdit la cellule
 * sans rien ajouter.
 */
export type CalendarLeadingGlyph = {
  Icon: LucideIcon;
  className: string;
};

export function resolveCalendarEventLeadingGlyph(ev: {
  type: CalendarEventType;
  sector: CalendarSector;
}): CalendarLeadingGlyph | null {
  const sc = SECTOR_CONFIG[ev.sector];

  if (ev.type === "task_deadline") {
    return { Icon: CheckSquare, className: sc.iconColor };
  }

  if (EVENT_TIER[ev.type] === 1) {
    return { Icon: sc.Icon, className: sc.iconColor };
  }

  return null;
}
