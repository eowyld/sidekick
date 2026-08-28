import type { CalendarEvent, CalendarEventType } from "./GlobalCalendarPage";

const BANNER_TIER: Record<CalendarEventType, 1 | 2 | 3> = {
  representation:     1,
  album_release:      1,
  track_release:      1,
  rehearsal:          2,
  session:            2,
  marketing_content:  2,
  edition_event:      2,
  custom:             2,
  admin_procedure:    2,
  admin_status_start: 2,
  admin_status_end:   2,
  invoice:            3,
  task_deadline:      3,
};

const DAY_NAMES_FR = [
  "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi",
];

const MONTH_NAMES_FR = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

/** Clé YYYY-MM-DD au fuseau local — ne pas utiliser toISOString() (UTC) pour comparer aux dateKey métier. */
function localDateKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Nombre de jours calendaires entre aujourd'hui (minuit) et dateKey. */
export function daysUntil(dateKey: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateKey.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Label compact : "Auj.", "J-1", "J-7", "J-42" */
export function compactCountdown(days: number): string {
  if (days < 0) return "";
  if (days === 0) return "Auj.";
  if (days === 1) return "J-1";
  return `J-${days}`;
}

/** Sous-ligne expressive en français. */
export function expressiveCountdown(dateKey: string, days: number): string {
  if (days < 0) return "";
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  if (days === 2) return "Après-demain";

  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = DAY_NAMES_FR[date.getDay()];

  if (days <= 6) return `Ce ${dayName.toLowerCase()}`;
  if (days <= 13) return `${dayName} prochain`;

  return `${d} ${MONTH_NAMES_FR[m - 1]}`;
}

/** Couleur du countdown : accent jaune si ≤ 3 jours, blanc sinon. */
export function countdownColorClass(days: number): string {
  if (days < 0) return "text-[#F5F5F5]/40";
  return days <= 3 ? "text-[#F0FF00]" : "text-[#F5F5F5]/70";
}

/** Identifiant logique `custom-<id>` pour les lignes étendues `custom-<id>__yyyy-mm-dd`. */
function customMultiDayRoot(id: string): string | null {
  const idx = id.lastIndexOf("__");
  if (idx < 0) return null;
  const suffix = id.slice(idx + 2);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(suffix)) return null;
  return id.slice(0, idx);
}

/** Une carte bandeau par perso multi-jours : jour de début + fin de plage pour filtres. */
function dedupeCustomMultiDayForBanner(events: CalendarEvent[]): CalendarEvent[] {
  const buckets = new Map<string, CalendarEvent[]>();
  const out: CalendarEvent[] = [];

  for (const e of events) {
    if (e.type !== "custom") {
      out.push(e);
      continue;
    }
    const root = customMultiDayRoot(e.id);
    if (!root) {
      out.push(e);
      continue;
    }
    const arr = buckets.get(root) ?? [];
    arr.push(e);
    buckets.set(root, arr);
  }

  for (const [, group] of buckets) {
    group.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    const start = group[0];
    const endKey = group[group.length - 1].dateKey;
    out.push({
      ...start,
      bannerSpanEndDateKey: endKey,
    });
  }

  return out;
}

/**
 * Jours jusqu’à l’affichage bandeau : perso multi-jours « en cours » → 0 (comme aujourd’hui).
 */
export function bannerCountdownDays(ev: CalendarEvent): number {
  if (!ev.bannerSpanEndDateKey) {
    return daysUntil(ev.dateKey);
  }
  const todayKey = localDateKeyFromDate(new Date());
  if (ev.dateKey.localeCompare(todayKey) > 0) {
    return daysUntil(ev.dateKey);
  }
  if (ev.bannerSpanEndDateKey.localeCompare(todayKey) >= 0) {
    return 0;
  }
  return -1;
}

/**
 * Sélectionne les events à afficher dans la bannière :
 * 1. Tous les Tier 1 dans les 90 prochains jours, triés par date.
 * 2. Si < 4 cartes, compléter avec les Tier 2 les plus proches.
 * 3. Tier 3 jamais inclus. Max 8 cartes.
 */
export function selectBannerEvents(events: CalendarEvent[]): CalendarEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 90);
  const cutoffKey = localDateKeyFromDate(cutoff);
  const cutoff180 = new Date(today);
  cutoff180.setDate(cutoff180.getDate() + 180);
  const cutoffKey180 = localDateKeyFromDate(cutoff180);
  const todayKey = localDateKeyFromDate(today);

  const deduped = dedupeCustomMultiDayForBanner(events);

  const future = deduped.filter((e) => {
    if (e.bannerSpanEndDateKey) {
      return e.bannerSpanEndDateKey >= todayKey;
    }
    return e.dateKey >= todayKey;
  });

  const tier1 = future
    .filter((e) => BANNER_TIER[e.type] === 1 && e.dateKey <= cutoffKey)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  if (tier1.length >= 4) return tier1.slice(0, 8);

  const tier2 = future
    .filter((e) => BANNER_TIER[e.type] === 2 && e.dateKey <= cutoffKey180)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const combined = [...tier1];
  for (const ev of tier2) {
    if (combined.length >= 8) break;
    combined.push(ev);
  }

  combined.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return combined
    .filter((e) => bannerCountdownDays(e) >= 0)
    .slice(0, 8);
}
