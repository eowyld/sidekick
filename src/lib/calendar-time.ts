const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/** Minutes depuis minuit (0–1439), ou null si invalide. */
/** Ramène HH:MM à la grille 5 minutes la plus proche (plage 00:00–23:55). */
export function snapTimeToFiveMinuteGrid(time: string): string | null {
  const m = parseTimeToMinutes(time);
  if (m === null) return null;
  let snapped = Math.round(m / 5) * 5;
  const max = 23 * 60 + 55;
  if (snapped > max) snapped = max;
  if (snapped < 0) snapped = 0;
  const h = Math.floor(snapped / 60);
  const min = snapped % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function parseTimeToMinutes(time: string): number | null {
  const m = String(time).trim().match(TIME_RE);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const s = m[3] ? parseInt(m[3], 10) : 0;
  if (h > 23 || min > 59 || s > 59) return null;
  return h * 60 + min + Math.round(s / 60);
}

/** HH:MM:SS pour Postgres / inputs time. */
export function minutesToTimeHHMMSS(total: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(total)));
  const h = Math.floor(clamped / 60);
  const min = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00`;
}

export function addMinutesToTimeString(time: string, delta: number): string {
  const base = parseTimeToMinutes(time);
  if (base === null) return time;
  return minutesToTimeHHMMSS(base + delta);
}

export function snapMinutes(m: number, mode: "floor" | "ceil", step = 5): number {
  if (mode === "floor") return Math.floor(m / step) * step;
  return Math.ceil(m / step) * step;
}

/** Arrondit début au 5 min inf., fin au 5 min sup. */
export function snapInterval(startMin: number, endMin: number): { start: number; end: number } {
  return {
    start: snapMinutes(startMin, "floor"),
    end: Math.max(snapMinutes(endMin, "ceil"), snapMinutes(startMin, "floor") + 5),
  };
}

export type CustomTimeFields = { time?: string; endTime?: string };

/**
 * Sans heure : pas de fin.
 * Avec heure : fin obligatoire en persistance — défaut début + 60 min si absente ou invalide.
 */
export function normalizeCustomTimes(item: CustomTimeFields): { time?: string; endTime?: string } {
  const t = item.time?.trim();
  if (!t) return { time: undefined, endTime: undefined };
  const startM = parseTimeToMinutes(t);
  if (startM === null) return { time: undefined, endTime: undefined };

  let end = item.endTime?.trim();
  let endM = end ? parseTimeToMinutes(end) : null;
  if (endM === null || endM <= startM) {
    end = addMinutesToTimeString(t, 60);
    endM = parseTimeToMinutes(end)!;
  }
  return { time: t, endTime: end };
}

export type CustomDateRangeFields = {
  date: string;
  endDate?: string;
} & CustomTimeFields;

/**
 * Persistance / formulaire : une journée → même règle que `normalizeCustomTimes`.
 * Plusieurs jours avec heures → début = heure du premier jour, fin = heure du dernier jour
 * (pas de contrainte « fin après début » sur une même horloge).
 */
export function normalizeCustomTimesForDateRange(
  fields: CustomDateRangeFields
): { time?: string; endTime?: string } {
  const startDate = fields.date?.trim() ?? "";
  const endRaw = fields.endDate?.trim();
  const endDate =
    endRaw && endRaw >= startDate ? endRaw : startDate;
  const multiDay = endDate > startDate;

  if (!multiDay) {
    return normalizeCustomTimes({ time: fields.time, endTime: fields.endTime });
  }

  const t = fields.time?.trim();
  if (!t || parseTimeToMinutes(t) === null) {
    return { time: undefined, endTime: undefined };
  }

  let end = fields.endTime?.trim();
  const endM = end ? parseTimeToMinutes(end) : null;
  if (!end || endM === null) {
    end = "23:59";
  }

  return { time: t, endTime: end };
}

const END_OF_DAY_DISPLAY = "23:59";

export type CustomVisualDaySlot = {
  dateKey: string;
  time?: string;
  endTime?: string;
};

/**
 * Projection pour la grille : événement multi-jours avec heures = pont (1er jour jusqu'à la fin de journée,
 * jours milieu journée complète en créneau horaire, dernier jour depuis minuit jusqu'à l'heure de fin).
 */
export function expandCustomEventVisualSlots(params: {
  dayKeys: string[];
  time?: string;
  endTime?: string;
}): CustomVisualDaySlot[] {
  const { dayKeys } = params;
  if (dayKeys.length === 0) return [];

  if (dayKeys.length === 1) {
    const nt = normalizeCustomTimes({ time: params.time, endTime: params.endTime });
    return [{ dateKey: dayKeys[0], time: nt.time, endTime: nt.endTime }];
  }

  const tTrim = params.time?.trim();
  if (!tTrim || parseTimeToMinutes(tTrim) === null) {
    return dayKeys.map((dateKey) => ({ dateKey }));
  }

  const startKey = dayKeys[0];
  const endKey = dayKeys[dayKeys.length - 1];

  let endLast = params.endTime?.trim();
  if (!endLast || parseTimeToMinutes(endLast) === null) {
    endLast = END_OF_DAY_DISPLAY;
  }

  return dayKeys.map((dateKey) => {
    const isFirst = dateKey === startKey;
    const isLast = dateKey === endKey;
    if (isFirst) {
      return { dateKey, time: tTrim, endTime: END_OF_DAY_DISPLAY };
    }
    if (isLast) {
      return { dateKey, time: "00:00", endTime: endLast };
    }
    return { dateKey, time: "00:00", endTime: END_OF_DAY_DISPLAY };
  });
}
