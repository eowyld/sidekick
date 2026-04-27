// src/modules/dashboard/components/DashboardWeekRibbon.tsx
"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type RibbonEvent = {
  id: string;
  title: string;
  sector: "live" | "phono" | "admin" | "marketing" | "edition" | "revenus" | "other";
};

const SECTOR_DOT: Record<RibbonEvent["sector"], string> = {
  live: "bg-blue-400",
  phono: "bg-red-400",
  admin: "bg-violet-400",
  marketing: "bg-emerald-400",
  edition: "bg-cyan-400",
  revenus: "bg-orange-400",
  other: "bg-[#F5F5F5]/40",
};

type Props = {
  weekDays: Date[]; // 7 dates, du lundi au dimanche
  todayKey: string; // YYYY-MM-DD
  eventsByDate: Record<string, RibbonEvent[]>; // clé YYYY-MM-DD
};

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DashboardWeekRibbon({ weekDays, todayKey, eventsByDate }: Props) {
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
          const visible = events.slice(0, 2);
          const overflow = events.length - visible.length;
          const dayLabel = day
            .toLocaleDateString("fr-FR", { weekday: "short" })
            .replace(".", "");

          return (
            <div
              key={key}
              className={cn(
                "flex min-h-[110px] flex-col bg-[#0c0c0c] px-3 py-3.5",
                isToday && "bg-[rgba(240,255,0,0.04)]",
              )}
            >
              <div
                className={cn(
                  "text-[9px] uppercase tracking-[0.18em]",
                  isToday ? "text-[#F0FF00]" : "text-[#F5F5F5]/35",
                )}
              >
                {dayLabel}
              </div>
              <div
                className={cn(
                  "mt-0.5 text-[24px] font-extralight leading-none tracking-[-0.02em]",
                  isToday ? "text-[#F0FF00]" : "text-[#F5F5F5]",
                )}
              >
                {day.getDate()}
              </div>
              <div className="mt-3 flex flex-col gap-1">
                {visible.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-1.5 text-[10px] leading-[1.3] text-[#F5F5F5]/70"
                  >
                    <span className={cn("h-[4px] w-[4px] shrink-0 rounded-full", SECTOR_DOT[e.sector])} />
                    <span className="truncate">{e.title}</span>
                  </div>
                ))}
                {overflow > 0 && (
                  <span className="text-[10px] text-[#F5F5F5]/40">+{overflow}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
