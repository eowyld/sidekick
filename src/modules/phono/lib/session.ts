// src/modules/phono/lib/session.ts
import type { StudioSession } from "@/hooks/usePhonoData";
import { frToIso } from "@/lib/date-format";

export type SessionType = "prise" | "essai" | "mix" | "mastering" | "autre";

export const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: "prise", label: "Enregistrement" },
  { value: "essai", label: "Démo" },
  { value: "mix", label: "Mixage" },
  { value: "mastering", label: "Mastering" },
  { value: "autre", label: "Autre" },
];

/**
 * Couleurs des types de session. Même famille que `RELEASE_STATUS_COLOR` et que
 * le pipeline de `LiveOverviewPage` : une teinte stable par valeur, réutilisée
 * par la barre segmentée, la légende et la pastille de ligne. L'ordre suit la
 * chaîne de fabrication d'un titre — démo, enregistrement, mixage, mastering.
 */
export const SESSION_TYPE_COLOR: Record<string, string> = {
  essai: "#38BDF8",
  prise: "#F59E0B",
  mix: "#A78BFA",
  mastering: "#34D399",
  autre: "#94A3B8",
};

export function sessionTypeColor(session: StudioSession): string {
  return SESSION_TYPE_COLOR[session.sessionType] ?? SESSION_TYPE_COLOR.autre!;
}

/** Libellé affiché : « Autre » cède la place à la saisie libre quand il y en a une. */
export function sessionTypeLabel(session: StudioSession): string {
  if (session.sessionType === "autre") return session.sessionTypeOther || "Autre";
  return (
    SESSION_TYPES.find((t) => t.value === session.sessionType)?.label ??
    session.sessionType
  );
}

export const SESSION_STATUS_LABEL: Record<string, string> = {
  planned: "Planifiée",
  completed: "Terminée",
  cancelled: "Annulée",
};

/**
 * Horodatage d'une session, en millisecondes. Les dates sont stockées en
 * JJ/MM/AAAA et l'heure séparément : une session sans date valide retombe à 0
 * pour ne jamais casser un tri.
 */
export function sessionTimestamp(s: StudioSession): number {
  const iso = frToIso(s.date || "");
  const value = Date.parse(`${iso || "1970-01-01"}T${s.time || "00:00"}`);
  return Number.isNaN(value) ? 0 : value;
}

/**
 * Passée = marquée terminée, ou datée d'avant maintenant sans avoir été
 * annulée. Une session annulée reste rangée à sa date, mais n'entre jamais
 * dans le décompte de ce qui arrive.
 */
export function isSessionPast(s: StudioSession): boolean {
  return (
    s.status === "completed" ||
    (s.status !== "cancelled" && sessionTimestamp(s) < Date.now())
  );
}

export function sessionCost(s: StudioSession): number {
  return (s.studioCost ?? 0) + (s.otherCosts ?? 0);
}

/** Durée en minutes d'après les heures de début et de fin. 0 si incalculable. */
export function sessionDurationMinutes(s: StudioSession): number {
  if (!s.time || !s.endTime) return 0;
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(":");
    const hours = Number(h);
    const minutes = Number(m);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return NaN;
    return hours * 60 + minutes;
  };
  const start = toMinutes(s.time);
  const end = toMinutes(s.endTime);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  // Une session qui finit « avant » d'avoir commencé a passé minuit.
  return end >= start ? end - start : end + 24 * 60 - start;
}

/** « 4 h 30 », « 45 min », ou chaîne vide quand les heures ne permettent rien. */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

export function linkedCount(s: StudioSession): number {
  return (
    (s.albumIds?.length ?? 0) +
    (s.trackIds?.length ?? 0) +
    (s.mixIds?.length ?? 0)
  );
}

const MONTH_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});
const WEEKDAY_FORMAT = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });

/** Clé de regroupement mensuel, triable telle quelle : « 2026-09 ». */
export function sessionMonthKey(s: StudioSession): string {
  const iso = frToIso(s.date || "");
  return iso ? iso.slice(0, 7) : "";
}

export function monthKeyLabel(key: string): string {
  if (!key) return "Sans date";
  const date = new Date(`${key}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Sans date";
  return MONTH_FORMAT.format(date);
}

/** « lun. », « mar. »… Vide si la date n'est pas exploitable. */
export function sessionWeekday(s: StudioSession): string {
  const iso = frToIso(s.date || "");
  if (!iso) return "";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return WEEKDAY_FORMAT.format(date).replace(".", "");
}

/**
 * Nombre de jours calendaires qui séparent la session d'aujourd'hui. Négatif
 * pour le passé. On compare des minuits, pas des instants : une session prévue
 * ce soir est « aujourd'hui », pas « dans 0 jour ».
 */
export function daysUntil(s: StudioSession): number | null {
  const iso = frToIso(s.date || "");
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** « aujourd'hui », « demain », « dans 6 jours », « il y a 3 jours ». */
export function relativeDayLabel(days: number): string {
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "demain";
  if (days === -1) return "hier";
  if (days > 1) return `dans ${days} jours`;
  return `il y a ${Math.abs(days)} jours`;
}
