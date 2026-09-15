"use client";

import { useEffect, useMemo, useRef } from "react";

import { cn, formatTimeForDisplay } from "@/lib/utils";
import {
  EVENT_TIER,
  SECTOR_CONFIG,
  resolveCalendarEventLeadingGlyph,
} from "@/modules/calendar/calendar-display-config";
import {
  addDaysToDateKey,
  assignOverlapLanes,
  buildWeekHourTimeline,
  daysBetweenDateKeys,
  eventAbsoluteInterval,
} from "@/modules/calendar/week-schedule-utils";
import type { CalendarEvent } from "@/modules/calendar/calendar-event-model";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const MIN_BLOCK_PX = 16;

/** En dessous, la ligne d’horaire mangerait la place du libellé. */
const TIME_LINE_MIN_PX = 34;

const LINE_CLAMP_CLASS: Record<number, string> = {
  1: "line-clamp-1",
  2: "line-clamp-2",
  3: "line-clamp-3",
};

/** Largeur colonne axe horaire + en-têtes « journée » */
const TIME_GUTTER_W = "w-[58px]";
/** Hauteur zone en-tête jour + étiquette toute la journée alignées avec les colonnes de droite */
const HEADER_CELL_CLASS =
  "flex min-h-[56px] flex-col justify-center border-b border-[rgba(245,245,245,0.08)] bg-[#101010] px-1 py-2 text-center";
const ALL_DAY_ROW_MIN_CLASS = "min-h-[80px]";

type Props = {
  weekMondayKey: string;
  /** dateKey du jour courant (yyyy-mm-dd) */
  todayKey: string;
  events: CalendarEvent[];
  onEventClick: (ev: CalendarEvent, rect?: DOMRect) => void;
  onEmptyTimedAreaClick?: (dateKey: string) => void;
};

export function WeekScheduleGrid({
  weekMondayKey,
  todayKey,
  events,
  onEventClick,
  onEmptyTimedAreaClick,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);

  const dateKeys = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        addDaysToDateKey(weekMondayKey, i)
      ),
    [weekMondayKey]
  );

  const timedIntervals = useMemo(() => {
    const list: { start: number; end: number }[] = [];
    for (const ev of events) {
      const iv = eventAbsoluteInterval(ev, weekMondayKey);
      if (iv) list.push(iv);
    }
    return list;
  }, [events, weekMondayKey]);

  const timeline = useMemo(
    () => buildWeekHourTimeline(timedIntervals),
    [timedIntervals]
  );

  const dayBuckets = useMemo(() => {
    const allDay: CalendarEvent[][] = Array.from({ length: 7 }, () => []);
    const timed: CalendarEvent[][] = Array.from({ length: 7 }, () => []);

    for (const ev of events) {
      const d = daysBetweenDateKeys(ev.dateKey, weekMondayKey);
      if (d < 0 || d > 6) continue;
      if (!ev.time?.trim()) allDay[d].push(ev);
      else timed[d].push(ev);
    }

    for (let i = 0; i < 7; i++) {
      const sortFn = (a: CalendarEvent, b: CalendarEvent) =>
        EVENT_TIER[a.type] - EVENT_TIER[b.type] ||
        a.label.localeCompare(b.label);
      allDay[i].sort(sortFn);
      timed[i].sort((a, b) => {
        const ia = eventAbsoluteInterval(a, weekMondayKey);
        const ib = eventAbsoluteInterval(b, weekMondayKey);
        if (!ia || !ib) return 0;
        return ia.start - ib.start || ia.end - ib.end;
      });
    }

    return { allDay, timed };
  }, [events, weekMondayKey]);

  const hasAllDayEvents = dayBuckets.allDay.some((day) => day.length > 0);

  useEffect(() => {
    const idx = dateKeys.indexOf(todayKey);
    const col = columnRefs.current[idx];
    if (!col) return;
    col.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [dateKeys, todayKey]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const now = new Date();
    const dayIdx = daysBetweenDateKeys(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
      weekMondayKey
    );
    if (dayIdx < 0 || dayIdx > 6) return;
    const mins = now.getHours() * 60 + now.getMinutes();
    const y = timeline.minuteToY(mins);
    const target = Math.max(0, y - el.clientHeight * 0.35);
    el.scrollTo({ top: target, behavior: "smooth" });
  }, [weekMondayKey, timeline]);

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-md border border-[rgba(245,245,245,0.08)] bg-[#101010]">
      {/* En-tête + journée entière (une colonne par jour, refs pour scroll horizontal) */}
      <div className="flex shrink-0 border-b border-[rgba(245,245,245,0.06)]">
        <div
          className={cn(
            TIME_GUTTER_W,
            "flex shrink-0 flex-col border-r border-[rgba(245,245,245,0.08)] bg-[#101010]",
          )}
        >
          <div className={cn(HEADER_CELL_CLASS, "border-b-0")} />
          {hasAllDayEvents ? (
            <div
              className={cn(
                "flex flex-1 flex-col justify-center border-t border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.03)] px-1 py-2",
                ALL_DAY_ROW_MIN_CLASS,
              )}
            >
              <span className="text-center text-[9px] font-semibold uppercase leading-tight tracking-[0.08em] text-[#F5F5F5]/45">
                Toute la journée
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1">
          {dateKeys.map((dateKey, dayIndex) => {
            const isToday = dateKey === todayKey;
            const headerDate = parseDateKeyHeader(dateKey);
            return (
              <div
                key={dateKey}
                ref={(node) => {
                  columnRefs.current[dayIndex] = node;
                }}
                className={cn(
                  "flex min-w-0 flex-1 flex-col border-r border-[rgba(245,245,245,0.06)] last:border-r-0",
                  isToday && "bg-[#F0FF00]/[0.04]",
                )}
              >
                <div
                  className={cn(
                    HEADER_CELL_CLASS,
                    "backdrop-blur-sm",
                    isToday && "ring-1 ring-inset ring-[#F0FF00]/35",
                  )}
                >
                  <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/35">
                    {WEEKDAY_LABELS[dayIndex]}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5 text-[13px] font-semibold tabular-nums",
                      isToday ? "text-[#F0FF00]" : "text-[#F5F5F5]/85",
                    )}
                  >
                    {headerDate.day}{" "}
                    <span className="text-[11px] font-medium capitalize text-[#F5F5F5]/45">
                      {headerDate.monthShort}
                    </span>
                  </div>
                </div>
                {hasAllDayEvents ? (
                  <div
                    className={cn(
                      "flex flex-1 flex-col bg-[rgba(245,245,245,0.02)] px-1.5 py-2",
                      ALL_DAY_ROW_MIN_CLASS,
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      {dayBuckets.allDay[dayIndex].map((ev) => (
                        <DayBandChip
                          key={ev.id}
                          ev={ev}
                          onClick={(r) => onEventClick(ev, r)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grille horaire scrollable */}
      <div
        ref={scrollRef}
        className="flex max-h-[min(70vh,560px)] min-h-0 w-full overflow-auto"
      >
        <div
          className={cn(
            TIME_GUTTER_W,
            "sticky left z-[15] shrink-0 border-r border-[rgba(245,245,245,0.1)] bg-[#101010]",
          )}
        >
          <TimeAxisLabels timeline={timeline} />
        </div>
        <div className="flex min-w-[640px] flex-1">
          {dateKeys.map((dateKey, dayIndex) => {
            const isToday = dateKey === todayKey;
            return (
              <div
                key={`timed-${dateKey}`}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col border-r border-[rgba(245,245,245,0.06)] last:border-r-0",
                  isToday && "bg-[#F0FF00]/[0.04]",
                )}
              >
                <div
                  className="relative flex-1"
                  style={{ minHeight: timeline.totalHeight }}
                >
                  <HourGridLines hourTicks={timeline.hourTicks} />
                  <button
                    type="button"
                    aria-label={`Créneaux horaires du ${dateKey}`}
                    className="absolute inset-0 z-0"
                    onClick={() => onEmptyTimedAreaClick?.(dateKey)}
                  />
                  {renderTimedColumn(
                    dayBuckets.timed[dayIndex],
                    dayIndex,
                    weekMondayKey,
                    timeline,
                    onEventClick,
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TimeAxisLabels({
  timeline,
}: {
  timeline: ReturnType<typeof buildWeekHourTimeline>;
}) {
  return (
    <div
      className="relative"
      style={{ minHeight: timeline.totalHeight }}
    >
      {timeline.hourTicks.map((tick, i) => (
        <div
          key={i}
          className="pointer-events-none absolute left-0 right-0 border-t border-[rgba(245,245,245,0.1)]"
          style={{ top: tick.y }}
        >
          <span
            className={cn(
              "absolute left-0 top-0 max-w-[52px] truncate bg-[#101010] pr-0.5 text-[9px] tabular-nums leading-none text-[#F5F5F5]/45",
              i === 0 ? "pt-0.5" : "-translate-y-1/2",
            )}
          >
            {tick.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function HourGridLines({
  hourTicks,
}: {
  hourTicks: ReturnType<typeof buildWeekHourTimeline>["hourTicks"];
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1]">
      {hourTicks.map((tick, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-t border-[rgba(245,245,245,0.055)]"
          style={{ top: tick.y }}
        />
      ))}
    </div>
  );
}

function parseDateKeyHeader(dateKey: string): {
  day: number;
  monthShort: string;
} {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const monthShort = dt.toLocaleDateString("fr-FR", { month: "short" });
  return { day: d, monthShort };
}

function DayBandChip({
  ev,
  onClick,
}: {
  ev: CalendarEvent;
  onClick: (rect: DOMRect) => void;
}) {
  const { borderClass } = SECTOR_CONFIG[ev.sector];
  const tier = EVENT_TIER[ev.type];
  const glyph = resolveCalendarEventLeadingGlyph(ev);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e.currentTarget.getBoundingClientRect());
      }}
      className={cn(
        "flex w-full items-start gap-1.5 border-l-2 px-1.5 py-1 text-left transition-colors",
        "bg-[rgba(245,245,245,0.07)] hover:bg-[rgba(245,245,245,0.13)]",
        borderClass,
        ev.isPast && "opacity-45",
      )}
    >
      {glyph ? (
        <glyph.Icon
          className={cn("mt-[2px] h-2.5 w-2.5 shrink-0", glyph.className)}
        />
      ) : null}
      <span
        className={cn(
          "line-clamp-3 text-[10px] leading-snug text-[#F5F5F5]/85",
          tier === 1 && "font-semibold",
        )}
      >
        {ev.label}
      </span>
    </button>
  );
}

function renderTimedColumn(
  dayEvents: CalendarEvent[],
  dayIndex: number,
  weekMondayKey: string,
  timeline: ReturnType<typeof buildWeekHourTimeline>,
  onEventClick: (ev: CalendarEvent, rect?: DOMRect) => void,
) {
  const dayOffsetMin = dayIndex * 1440;

  const placed = dayEvents
    .map((ev) => {
      const iv = eventAbsoluteInterval(ev, weekMondayKey);
      if (!iv) return null;
      return { ev, ...iv };
    })
    .filter(Boolean) as Array<{
      ev: CalendarEvent;
      start: number;
      end: number;
    }>;

  const { lane, laneCount } = assignOverlapLanes(
    placed.map((p) => ({
      id: p.ev.id,
      start: p.start - dayOffsetMin,
      end: p.end - dayOffsetMin,
    })),
  );

  return (
    <>
      {placed.map(({ ev, start, end }) => {
        const { top, height } = timeline.yRange(
          start - dayOffsetMin,
          end - dayOffsetMin,
        );
        const h = Math.max(MIN_BLOCK_PX, height);
        const li = lane.get(ev.id) ?? 0;
        const wPct = 100 / laneCount;
        const leftPct = li * wPct;

        const { borderClass } = SECTOR_CONFIG[ev.sector];
        const tier = EVENT_TIER[ev.type];
        const glyph = resolveCalendarEventLeadingGlyph(ev);
        const timeLabel =
          ev.time &&
          `${formatTimeForDisplay(ev.time)}${ev.endTime ? ` – ${formatTimeForDisplay(ev.endTime)}` : ""}`;
        const labelLines = h >= 64 ? 3 : h >= 36 ? 2 : 1;
        const showTime = h >= TIME_LINE_MIN_PX;

        return (
          <button
            key={ev.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(ev, e.currentTarget.getBoundingClientRect());
            }}
            className={cn(
              "absolute z-[2] flex flex-col overflow-hidden border-l-2 px-1.5 py-[3px] text-left transition-colors",
              "bg-[rgba(245,245,245,0.07)] hover:bg-[rgba(245,245,245,0.13)]",
              borderClass,
              ev.isPast && "opacity-45",
            )}
            style={{
              top,
              height: h,
              left: `calc(${leftPct}% + 2px)`,
              width: `calc(${wPct}% - 4px)`,
            }}
          >
            <span className="flex min-h-0 items-baseline gap-1">
              {glyph ? (
                <glyph.Icon
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 self-start",
                    glyph.className,
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "text-[10px] leading-tight text-[#F5F5F5]/90",
                  LINE_CLAMP_CLASS[labelLines],
                  tier === 1 && "font-semibold",
                )}
              >
                {ev.label}
              </span>
            </span>
            {timeLabel && showTime ? (
              <span className="truncate text-[9px] tabular-nums text-[#F5F5F5]/45">
                {timeLabel}
              </span>
            ) : null}
          </button>
        );
      })}
    </>
  );
}
