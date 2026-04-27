// src/modules/dashboard/components/DashboardHero.tsx
"use client";

import { cn } from "@/lib/utils";

type Stat = { value: number; label: string; accent?: boolean };

type Props = {
  now: Date;
  phrase: string | null;
  accent: string | null;
  loading: boolean;
  stats: [Stat, Stat, Stat];
};

function formatHeader(now: Date): string {
  const day = now.toLocaleDateString("fr-FR", { weekday: "long" });
  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time.replace(":", "h")}`;
}

function renderPhraseWithAccent(phrase: string, accent: string | null) {
  if (!accent || !phrase.includes(accent)) {
    return <>{phrase}</>;
  }
  const idx = phrase.indexOf(accent);
  return (
    <>
      {phrase.slice(0, idx)}
      <em className="not-italic font-light text-[#F0FF00]">{accent}</em>
      {phrase.slice(idx + accent.length)}
    </>
  );
}

export function DashboardHero({ now, phrase, accent, loading, stats }: Props) {
  return (
    <div>
      <div className="flex items-center text-[10px] uppercase tracking-[0.22em] text-[#F5F5F5]/40">
        <span className="mr-2 inline-block h-[6px] w-[6px] rounded-full bg-[#F0FF00] shadow-[0_0_10px_#F0FF00]" />
        {formatHeader(now)}
      </div>

      <h1
        className={cn(
          "mt-5 max-w-[780px] text-[44px] font-extralight leading-[1.08] tracking-[-0.02em] text-[#F5F5F5]",
          loading && "opacity-40",
        )}
      >
        {phrase ? renderPhraseWithAccent(phrase, accent) : "…"}
      </h1>

      <div className="mt-10 flex items-baseline gap-14 border-b border-[rgba(245,245,245,0.08)] pb-6">
        {stats.map((s, i) => (
          <div key={i} className="flex items-baseline gap-3">
            <span
              className={cn(
                "text-[36px] font-extralight leading-none tracking-[-0.02em]",
                s.accent ? "text-[#F0FF00]" : "text-[#F5F5F5]",
              )}
            >
              {s.value}
            </span>
            <span className="max-w-[110px] text-[11px] leading-[1.3] text-[#F5F5F5]/55">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
