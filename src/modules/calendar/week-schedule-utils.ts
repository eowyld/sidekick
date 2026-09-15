import {
  parseTimeToMinutes,
  snapInterval,
} from "@/lib/calendar-time";

export const WEEK_MINUTES = 7 * 1440;

export const DAY_MINUTES = 1440;

export function parseDateKeyLocal(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const d = parseDateKeyLocal(dateKey);
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export function daysBetweenDateKeys(dateKey: string, mondayKey: string): number {
  const a = parseDateKeyLocal(dateKey);
  const b = parseDateKeyLocal(mondayKey);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

/** Clés `yyyy-mm-dd` de `startKey` à `endKey` inclus. Si `startKey` &gt; `endKey`, retourne `[startKey]`. */
export function enumerateDateKeysInclusive(
  startKey: string,
  endKey: string
): string[] {
  const keys: string[] = [];
  let offset = 0;
  const endTime = parseDateKeyLocal(endKey).getTime();
  while (true) {
    const key = addDaysToDateKey(startKey, offset);
    keys.push(key);
    if (parseDateKeyLocal(key).getTime() >= endTime) break;
    offset += 1;
  }
  return keys;
}

export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

/** Intervalle en minutes depuis le lundi 00:00 de la semaine affichée. */
export function eventAbsoluteInterval(
  ev: { dateKey: string; time?: string; endTime?: string },
  weekMondayKey: string
): { start: number; end: number } | null {
  if (!ev.time?.trim()) return null;
  const dayOffset = daysBetweenDateKeys(ev.dateKey, weekMondayKey);
  if (dayOffset < 0 || dayOffset > 6) return null;
  const startM = parseTimeToMinutes(ev.time);
  if (startM === null) return null;
  let endM: number;
  if (ev.endTime?.trim()) {
    const e = parseTimeToMinutes(ev.endTime);
    endM = e !== null ? e : startM + 60;
  } else {
    endM = startM + 60;
  }
  const snapped = snapInterval(startM, Math.max(endM, startM + 5));
  return {
    start: dayOffset * 1440 + snapped.start,
    end: dayOffset * 1440 + snapped.end,
  };
}

/** Hauteur d’une heure « occupée » (au moins un événement ce jour-là cette heure-là, quelque jour que ce soit de la semaine). */
export const OCCUPIED_HOUR_PX = 52;

/** Heure sans aucun événement sur les 7 jours, mais à l’intérieur de la plage affichée. */
export const EMPTY_HOUR_PX = 24;

/** Journée « type », affichée telle quelle quand la semaine n’a aucun horaire. */
export const BASE_RANGE_START_HOUR = 8;
export const BASE_RANGE_END_HOUR = 20;

/** Amplitude minimale de la grille : en dessous, elle ne se lit plus comme une journée. */
export const MIN_RANGE_HOURS = 8;

export type HourTick = {
  y: number;
  label: string;
};

/**
 * Pour chaque heure 0–23 : true si au moins un créneau [d×1440+h×60, …) intersecte un événement pour un jour d de la semaine.
 */
export function computeHourOccupancyAcrossWeek(
  intervals: { start: number; end: number }[]
): boolean[] {
  const globalBusyHour = Array.from({ length: 24 }, () => false);
  for (let h = 0; h < 24; h++) {
    busy: for (let d = 0; d < 7; d++) {
      const bs = d * 1440 + h * 60;
      const be = bs + 60;
      for (const iv of intervals) {
        if (iv.start < be && iv.end > bs) {
          globalBusyHour[h] = true;
          break busy;
        }
      }
    }
  }
  return globalBusyHour;
}

/**
 * Plage horaire réellement rendue : la journée type, étendue d’une heure de
 * marge autour des événements qui en sortent. `endHour` est exclusive.
 */
export function computeDisplayedHourRange(globalBusyHour: boolean[]): {
  startHour: number;
  endHour: number;
} {
  let firstBusy = -1;
  let lastBusy = -1;
  for (let h = 0; h < 24; h++) {
    if (!globalBusyHour[h]) continue;
    if (firstBusy === -1) firstBusy = h;
    lastBusy = h;
  }
  if (firstBusy === -1) {
    return { startHour: BASE_RANGE_START_HOUR, endHour: BASE_RANGE_END_HOUR };
  }

  let startHour = Math.max(0, firstBusy - 1);
  let endHour = Math.min(24, lastBusy + 2);

  // On étire vers la journée type avant d’empiéter sur la nuit : une heure de
  // bureau vide informe davantage qu’une heure de nuit vide.
  while (endHour - startHour < MIN_RANGE_HOURS) {
    if (startHour > BASE_RANGE_START_HOUR) startHour -= 1;
    else if (endHour < BASE_RANGE_END_HOUR) endHour += 1;
    else if (startHour > 0) startHour -= 1;
    else if (endHour < 24) endHour += 1;
    else break;
  }

  return { startHour, endHour };
}

function hourHeightPx(
  globalBusyHour: boolean[],
  range: { startHour: number; endHour: number }
): number[] {
  return globalBusyHour.map((busy, h) => {
    if (h < range.startHour || h >= range.endHour) return 0;
    return busy ? OCCUPIED_HOUR_PX : EMPTY_HOUR_PX;
  });
}

/**
 * Une journée (0h → 24h) par colonne ; même échelle pour les 7 jours affichés.
 * La compression des heures « vides » utilise encore la semaine entière
 * (computeHourOccupancyAcrossWeek sur les intervalles absolus).
 *
 * `minuteToY` / `yRange` attendent des minutes **depuis minuit** [0, 1440].
 */
export function buildWeekHourTimeline(intervals: {
  start: number;
  end: number;
}[]): {
  totalHeight: number;
  minuteToY: (minutesSinceMidnight: number) => number;
  yRange: (
    startMinutesSinceMidnight: number,
    endMinutesSinceMidnight: number
  ) => { top: number; height: number };
  hourTicks: HourTick[];
} {
  const globalBusyHour = computeHourOccupancyAcrossWeek(intervals);
  const range = computeDisplayedHourRange(globalBusyHour);
  const hPx = hourHeightPx(globalBusyHour, range);
  const totalHeight = hPx.reduce((a, b) => a + b, 0);

  const hourTicks: HourTick[] = [];
  let yCursor = 0;
  for (let h = 0; h < 24; h++) {
    if (h >= range.startHour && h < range.endHour) {
      hourTicks.push({ y: yCursor, label: `${h}h` });
    }
    yCursor += hPx[h];
  }

  function minuteToY(m: number): number {
    if (m >= DAY_MINUTES) return totalHeight;
    const clamped = Math.max(0, m);
    const hour = Math.floor(clamped / 60);
    const frac = (clamped - hour * 60) / 60;

    let y = 0;
    for (let hh = 0; hh < hour; hh++) y += hPx[hh];
    y += frac * hPx[hour];
    return Math.min(y, totalHeight);
  }

  function yRange(start: number, end: number): { top: number; height: number } {
    const top = minuteToY(start);
    const bottom = minuteToY(end);
    return { top, height: Math.max(8, bottom - top) };
  }

  return { totalHeight, minuteToY, yRange, hourTicks };
}

/** Voies pour événements qui se chevauchent (indices 0..n-1). */
export function assignOverlapLanes(
  items: { id: string; start: number; end: number }[]
): { lane: Map<string, number>; laneCount: number } {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
  const laneEnds: number[] = [];
  const lane = new Map<string, number>();

  for (const ev of sorted) {
    let idx = laneEnds.findIndex((end) => end <= ev.start);
    if (idx === -1) {
      idx = laneEnds.length;
      laneEnds.push(ev.end);
    } else {
      laneEnds[idx] = ev.end;
    }
    lane.set(ev.id, idx);
  }

  return { lane, laneCount: Math.max(1, laneEnds.length) };
}
