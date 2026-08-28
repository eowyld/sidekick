"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  X,
  Mic2,
  Music2,
  BookOpen,
  Briefcase,
  Megaphone,
  DollarSign,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type EventSector =
  | "live"
  | "phono"
  | "admin"
  | "marketing"
  | "edition"
  | "revenus"
  | "other";

export type EventDialogField = { label: string; value: string | ReactNode };

type EventDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subLabel: string;
  /** YYYY-MM-DD */
  dateKey: string;
  sector: EventSector;
  isPast?: boolean;
  fields?: EventDialogField[];
  /** Si fourni, affiche le CTA jaune */
  ctaLabel?: string;
  ctaHref?: string;
  /** Événements custom seulement — remplace le CTA */
  onEdit?: () => void;
  onDelete?: () => void;
  /** Rect de l'élément cliqué — positionne la carte près du clic */
  anchorRect?: DOMRect | null;
};

const SECTOR_CONFIG: Record<
  EventSector,
  {
    label: string;
    dateBg: string;
    dateTextClass: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    Icon: React.ElementType;
  }
> = {
  live: {
    label: "Live",
    dateBg: "bg-blue-900",
    dateTextClass: "text-white",
    badgeBg: "bg-blue-400/[0.12]",
    badgeBorder: "border-blue-400/25",
    badgeText: "text-blue-400",
    Icon: Mic2,
  },
  phono: {
    label: "Phono",
    dateBg: "bg-red-900",
    dateTextClass: "text-white",
    badgeBg: "bg-red-400/[0.12]",
    badgeBorder: "border-red-400/25",
    badgeText: "text-red-400",
    Icon: Music2,
  },
  admin: {
    label: "Admin",
    dateBg: "bg-violet-900",
    dateTextClass: "text-white",
    badgeBg: "bg-violet-400/[0.12]",
    badgeBorder: "border-violet-400/25",
    badgeText: "text-violet-400",
    Icon: Briefcase,
  },
  marketing: {
    label: "Marketing",
    dateBg: "bg-emerald-900",
    dateTextClass: "text-white",
    badgeBg: "bg-emerald-400/[0.12]",
    badgeBorder: "border-emerald-400/25",
    badgeText: "text-emerald-400",
    Icon: Megaphone,
  },
  edition: {
    label: "Édition",
    dateBg: "bg-cyan-900",
    dateTextClass: "text-white",
    badgeBg: "bg-cyan-400/[0.12]",
    badgeBorder: "border-cyan-400/25",
    badgeText: "text-cyan-400",
    Icon: BookOpen,
  },
  revenus: {
    label: "Revenus",
    dateBg: "bg-orange-900",
    dateTextClass: "text-white",
    badgeBg: "bg-orange-400/[0.12]",
    badgeBorder: "border-orange-400/25",
    badgeText: "text-orange-400",
    Icon: DollarSign,
  },
  other: {
    label: "Autre",
    dateBg:
      "bg-[rgba(245,245,245,0.04)] border-r border-[rgba(245,245,245,0.08)]",
    dateTextClass: "text-[#F5F5F5]/70",
    badgeBg: "bg-white/[0.08]",
    badgeBorder: "border-white/[0.12]",
    badgeText: "text-[#F5F5F5]/55",
    Icon: CalendarDays,
  },
};

function parseDateKey(dateKey: string): { day: string; month: string } {
  const parts = dateKey.split("-");
  if (parts.length !== 3) return { day: "—", month: "—" };
  const [y, m, d] = parts;
  const date = new Date(
    parseInt(y, 10),
    parseInt(m, 10) - 1,
    parseInt(d, 10)
  );
  return {
    day: d,
    month: date
      .toLocaleDateString("fr-FR", { month: "short" })
      .replace(".", ""),
  };
}

const CARD_W = 300;
const CARD_H_EST = 360;
const GAP = 10;

function computePosition(rect: DOMRect): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = rect.right + GAP;
  let top = rect.top;

  // Flip gauche si déborde à droite
  if (left + CARD_W > vw - GAP) {
    left = rect.left - CARD_W - GAP;
  }

  // Si toujours hors écran à gauche → aligner sous l'ancre
  if (left < GAP) {
    left = Math.max(GAP, Math.min(rect.left, vw - CARD_W - GAP));
    top = rect.bottom + GAP;
  }

  // Contraindre verticalement
  top = Math.max(GAP, Math.min(top, vh - CARD_H_EST - GAP));

  return { left, top };
}

export function EventDialog({
  open,
  onClose,
  title,
  subLabel,
  dateKey,
  sector,
  isPast,
  fields = [],
  ctaLabel,
  ctaHref,
  onEdit,
  onDelete,
  anchorRect,
}: EventDialogProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof window === "undefined") return null;

  const cfg = SECTOR_CONFIG[sector];
  const { day, month } = parseDateKey(dateKey);
  const Icon = cfg.Icon;
  const hasCustomActions = !ctaLabel && (onEdit || onDelete);

  const positionStyle: React.CSSProperties = anchorRect
    ? computePosition(anchorRect)
    : { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };

  return createPortal(
    <>
      {/* Click-catcher transparent */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Carte */}
      <div
        ref={cardRef}
        style={positionStyle}
        onClick={(e) => e.stopPropagation()}
        className="fixed z-50 w-[300px] overflow-hidden rounded-2xl border border-[rgba(245,245,245,0.09)] bg-[#141414] shadow-[0_24px_80px_rgba(0,0,0,0.7)]"
      >
        {/* ── Header ───────────────────────────── */}
        <div className="relative flex">
          {/* Bloc date */}
          <div
            className={cn(
              "flex flex-col items-center justify-center px-4 py-5 min-w-[60px] shrink-0",
              cfg.dateBg,
              isPast && "opacity-50"
            )}
          >
            <span
              className={cn(
                "text-[32px] font-thin leading-none tabular-nums",
                cfg.dateTextClass
              )}
            >
              {day}
            </span>
            <span
              className={cn(
                "mt-1 text-[9px] font-bold tracking-[0.14em] uppercase opacity-60",
                cfg.dateTextClass
              )}
            >
              {month}
            </span>
          </div>

          {/* Meta */}
          <div className="flex-1 min-w-0 px-4 py-4 flex flex-col justify-center gap-1.5">
            <span
              className={cn(
                "inline-flex w-fit items-center gap-1.5 rounded-[4px] border px-2 py-0.5",
                "text-[10px] font-bold tracking-[0.07em] uppercase",
                cfg.badgeBg,
                cfg.badgeBorder,
                cfg.badgeText
              )}
            >
              <Icon className="w-3 h-3 shrink-0" />
              {cfg.label}
            </span>
            <p className="text-[14px] font-semibold leading-snug text-[#F5F5F5] pr-5 line-clamp-2">
              {title}
            </p>
            <p className="text-[11px] text-[#F5F5F5]/38">{subLabel}</p>
          </div>

          {/* Bouton fermer */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(245,245,245,0.06)] text-[#F5F5F5]/35 transition-colors hover:bg-[rgba(245,245,245,0.12)] hover:text-[#F5F5F5]"
            aria-label="Fermer"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* ── Champs ───────────────────────────── */}
        {fields.length > 0 && (
          <>
            <div className="h-px bg-[rgba(245,245,245,0.06)]" />
            <div className="px-4 py-1.5">
              {fields.map((f, i) => (
                <div
                  key={i}
                  className="flex gap-3 py-[5px] border-b border-[rgba(245,245,245,0.04)] last:border-0"
                >
                  <span className="min-w-[72px] shrink-0 text-[11px] text-[#F5F5F5]/28">
                    {f.label}
                  </span>
                  <span className="text-[12px] text-[#F5F5F5]/78 min-w-0">
                    {f.value}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Footer ───────────────────────────── */}
        {(hasCustomActions || ctaLabel) && (
          <div className="flex justify-end items-center gap-2 px-4 pb-3 pt-2 border-t border-[rgba(245,245,245,0.06)]">
            {hasCustomActions ? (
              <>
                {onDelete && (
                  <Button variant="destructive" size="sm" onClick={onDelete}>
                    Supprimer
                  </Button>
                )}
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={onEdit}>
                    Modifier
                  </Button>
                )}
              </>
            ) : (
              ctaLabel && ctaHref && (
                <Button
                  size="sm"
                  onClick={() => {
                    onClose();
                    router.push(ctaHref);
                  }}
                >
                  {ctaLabel}
                </Button>
              )
            )}
          </div>
        )}
      </div>
    </>,
    document.body
  );
}
