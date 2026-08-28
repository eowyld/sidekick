// src/modules/dashboard/components/DashboardWeekRibbon.tsx
"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type RibbonEventDetail = {
  subLabel: string;
  dateKey: string;
  fields?: Array<{ label: string; value: string }>;
};

export type RibbonEvent = {
  id: string;
  title: string;
  sector: "live" | "phono" | "admin" | "marketing" | "edition" | "revenus" | "other";
  detail?: RibbonEventDetail;
};

const SECTOR_BORDER: Record<RibbonEvent["sector"], string> = {
  live: "border-l-blue-400",
  phono: "border-l-red-400",
  admin: "border-l-violet-400",
  marketing: "border-l-emerald-400",
  edition: "border-l-cyan-400",
  revenus: "border-l-orange-400",
  other: "border-l-white/25",
};

/** Ligne secondaire : type d'événement + heure ou lieu si dispo dans les champs. */
function eventMetaLine(e: RibbonEvent): string | null {
  const parts: string[] = [];
  if (e.detail?.subLabel) parts.push(e.detail.subLabel);
  const fields = e.detail?.fields ?? [];
  const time = fields.find((f) => f.label === "Heure")?.value;
  if (time) {
    parts.push(time);
  } else {
    const lieu = fields.find((f) => f.label === "Lieu" || f.label === "Ville")?.value;
    if (lieu && lieu !== "—") parts.push(lieu);
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

type Props = {
  weekDays: Date[]; // 7 dates, du lundi au dimanche
  todayKey: string; // YYYY-MM-DD
  eventsByDate: Record<string, RibbonEvent[]>; // clé YYYY-MM-DD
  onEventClick?: (event: RibbonEvent, rect: DOMRect) => void;
};

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DashboardWeekRibbon({ weekDays, todayKey, eventsByDate, onEventClick }: Props) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[9px] uppercase tracking-[0.22em] text-[#F5F5F5]/35">
          Cette semaine
        </h2>
        <Link
          href="/calendar"
          className="flex items-center gap-1 text-[10px] text-[#F5F5F5]/40 transition-colors hover:text-[#F0FF00]"
        >
          calendrier <ChevronRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-px border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.08)]">
        {weekDays.map((day) => {
          const key = toDateKey(day);
          const isToday = key === todayKey;
          const events = eventsByDate[key] ?? [];
          const visible = events.slice(0, 3);
          const overflow = events.length - visible.length;
          const dayLabel = day
            .toLocaleDateString("fr-FR", { weekday: "short" })
            .replace(".", "");

          return (
            <div
              key={key}
              className={cn(
                "flex min-h-[168px] flex-col bg-[#0c0c0c] px-2 py-3 sm:px-2.5",
                isToday && "bg-[rgba(240,255,0,0.04)]",
              )}
            >
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "text-[8px] uppercase tracking-[0.14em]",
                    isToday ? "text-[#F0FF00]" : "text-[#F5F5F5]/35",
                  )}
                >
                  {dayLabel}
                </span>
                <span
                  className={cn(
                    "text-[17px] font-light tabular-nums leading-none tracking-tight",
                    isToday ? "text-[#F0FF00]" : "text-[#F5F5F5]",
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="mt-2 flex flex-1 flex-col gap-2">
                {visible.map((e) => {
                  const meta = eventMetaLine(e);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={(evt) => onEventClick?.(e, evt.currentTarget.getBoundingClientRect())}
                      className={cn(
                        "group flex w-full flex-col gap-0.5 rounded-md border border-[rgba(245,245,245,0.06)] border-l-[3px] bg-[rgba(245,245,245,0.04)] py-2 pl-2.5 pr-1.5 text-left transition-colors duration-150",
                        "hover:bg-[rgba(245,245,245,0.08)]",
                        SECTOR_BORDER[e.sector]
                      )}
                      aria-label={meta ? `${e.title} — ${meta}` : e.title}
                    >
                      <span className="line-clamp-2 text-[12px] font-semibold leading-snug text-[#F5F5F5]">
                        {e.title}
                      </span>
                      {meta && (
                        <span className="line-clamp-1 text-[10px] leading-tight text-[#F5F5F5]/50">
                          {meta}
                        </span>
                      )}
                    </button>
                  );
                })}
                {overflow > 0 && (
                  <span className="text-[10px] font-medium text-[#F5F5F5]/45">+{overflow} autre{overflow > 1 ? "s" : ""}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
