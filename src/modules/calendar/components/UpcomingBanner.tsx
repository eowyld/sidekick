"use client";

import { useMemo } from "react";
import {
  CalendarDays,
  CheckSquare,
  Mic2, Music2, Briefcase, Megaphone, BookOpen, DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarSector } from "./GlobalCalendarPage";
import {
  selectBannerEvents,
  bannerCountdownDays,
  compactCountdown,
  expressiveCountdown,
  countdownColorClass,
} from "./calendar-banner-utils";

const SECTOR_CARD_CONFIG: Record<
  CalendarSector,
  { borderTopClass: string; Icon: React.ElementType; iconColor: string }
> = {
  live:      { borderTopClass: "border-t-blue-400",    iconColor: "text-blue-400",    Icon: Mic2 },
  phono:     { borderTopClass: "border-t-red-400",     iconColor: "text-red-400",     Icon: Music2 },
  admin:     { borderTopClass: "border-t-violet-400",  iconColor: "text-violet-400",  Icon: Briefcase },
  marketing: { borderTopClass: "border-t-emerald-400", iconColor: "text-emerald-400", Icon: Megaphone },
  edition:   { borderTopClass: "border-t-cyan-400",    iconColor: "text-cyan-400",    Icon: BookOpen },
  revenus:   { borderTopClass: "border-t-orange-400",  iconColor: "text-orange-400",  Icon: DollarSign },
  other:     { borderTopClass: "border-t-white/20",    iconColor: "text-[#F5F5F5]/40", Icon: CalendarDays },
};

type Props = {
  filteredEvents: CalendarEvent[];
  onEventClick: (ev: CalendarEvent, rect: DOMRect) => void;
  onAddEvent: () => void;
};

export function UpcomingBanner({ filteredEvents, onEventClick, onAddEvent }: Props) {
  const bannerEvents = useMemo(
    () => selectBannerEvents(filteredEvents),
    [filteredEvents]
  );

  if (bannerEvents.length === 0) {
    return (
      <div className="flex items-center gap-4 border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.4)] px-5 py-4">
        <CalendarDays className="h-5 w-5 shrink-0 text-[#F5F5F5]/30" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[#F5F5F5]/70">Rien à l&apos;horizon.</p>
          <p className="mt-0.5 text-[12px] text-[#F5F5F5]/40">
            Ce que tu rentres dans les autres modules s&apos;affichera ici
            automatiquement. Tu peux aussi ajouter un événement personnalisé et
            synchroniser avec ton téléphone via les boutons en haut à droite.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddEvent}
          className="shrink-0 text-[12px] font-medium text-[#F0FF00] hover:underline"
        >
          + Événement
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Fade droit pour indiquer le scroll */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#101010] to-transparent z-10" />

      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {bannerEvents.map((ev) => {
          const days = bannerCountdownDays(ev);
          const compact = compactCountdown(days);
          const expressive = expressiveCountdown(ev.dateKey, days);
          const countdownColor = countdownColorClass(days);
          const config = SECTOR_CARD_CONFIG[ev.sector] ?? SECTOR_CARD_CONFIG.other;
          const { borderTopClass, iconColor } = config;
          const Icon =
            ev.type === "task_deadline" ? CheckSquare : config.Icon;

          return (
            <button
              key={ev.id}
              type="button"
              onClick={(e) => onEventClick(ev, e.currentTarget.getBoundingClientRect())}
              aria-label={`Voir : ${ev.label}`}
              className={cn(
                "group flex w-[172px] shrink-0 flex-col gap-2 border border-t-[3px] border-[rgba(245,245,245,0.10)] p-4 text-left",
                "bg-[rgba(44,44,46,0.72)] backdrop-blur-xl",
                "transition-all duration-200 ease-out hover:scale-[1.03] hover:bg-[rgba(44,44,46,0.90)] hover:border-[rgba(245,245,245,0.18)]",
                borderTopClass
              )}
            >
              {/* Compte à rebours */}
              <div className="flex items-end justify-between gap-2">
                <span className={cn("text-[22px] font-bold leading-none tabular-nums", countdownColor)}>
                  {compact}
                </span>
                <span className="text-[11px] text-[#F5F5F5]/40 leading-none mb-0.5">
                  {expressive}
                </span>
              </div>

              {/* Titre */}
              <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#F5F5F5] group-hover:text-white">
                {ev.label}
              </p>

              {/* Sous-type + lieu */}
              <div className="flex items-center gap-1.5 mt-auto">
                <Icon className={cn("h-3 w-3 shrink-0", iconColor)} />
                <span className="line-clamp-1 text-[11px] text-[#F5F5F5]/50">
                  {[ev.subLabel, ev.place].filter(Boolean).join(" · ")}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
