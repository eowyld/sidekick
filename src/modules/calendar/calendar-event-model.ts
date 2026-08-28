import type { CalendarEventType, CalendarSector } from "@/modules/calendar/calendar-display-config";

export interface CalendarEvent {
  id: string;
  dateKey: string;
  label: string;
  sector: CalendarSector;
  type: CalendarEventType;
  subLabel?: string;
  isPast: boolean;
  time?: string;
  /** Présent pour les customs persistés avec heure ; défaut affichage +1 h sinon. */
  endTime?: string;
  place?: string;
  /** Bandeau calendrier : fin inclusive d’un perso multi-jours (une seule carte au début). */
  bannerSpanEndDateKey?: string;
}
