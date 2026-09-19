"use client";

import { Clock3, Disc3, MapPin, Users } from "lucide-react";
import type { StudioSession } from "@/hooks/usePhonoData";
import { cn, focusRing } from "@/lib/utils";
import {
  SESSION_STATUS_LABEL,
  formatDuration,
  sessionCost,
  sessionDurationMinutes,
  sessionTypeColor,
  sessionTypeLabel,
  sessionWeekday,
} from "@/modules/phono/lib/session";

/** Élément de catalogue rattaché à la session, réduit à ce qui s'affiche. */
export interface SessionThumb {
  id: string;
  title: string;
  cover?: string;
}

interface SessionRowProps {
  session: StudioSession;
  /** Pochettes des albums, titres et mixes liés, déjà résolues par la page. */
  thumbs: SessionThumb[];
  onOpen: () => void;
}

const MAX_THUMBS = 3;

/**
 * Une session dans la timeline. Trois zones : le bloc de date à gauche (jour
 * de la semaine et quantième, la façon dont on situe un événement), l'identité
 * au centre, et à droite ce que la session laisse derrière elle — les éléments
 * de catalogue enregistrés et le coût. Une session annulée est atténuée et
 * barrée plutôt que masquée : elle reste un trou dans le planning.
 */
export function SessionRow({ session, thumbs, onOpen }: SessionRowProps) {
  const color = sessionTypeColor(session);
  const cost = sessionCost(session);
  const duration = formatDuration(sessionDurationMinutes(session));
  const cancelled = session.status === "cancelled";
  const extraThumbs = thumbs.length - MAX_THUMBS;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${session.title || "Session sans titre"} — voir le détail`}
      className={cn(
        "group relative grid w-full grid-cols-[64px_minmax(0,1fr)] items-center gap-4 overflow-hidden rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.42)] py-3 pl-5 pr-4 text-left transition-colors hover:border-[rgba(245,245,245,0.18)] hover:bg-[rgba(44,44,46,0.66)] sm:grid-cols-[64px_minmax(0,1fr)_auto]",
        cancelled && "opacity-55",
        focusRing
      )}
    >
      {/* Liseré du type, sur toute la hauteur : donne à la liste sa lecture en
          colonnes de couleur quand plusieurs sessions se suivent. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: color }}
      />

      <div className="border-r border-[rgba(245,245,245,0.08)] pr-4 text-center">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#F5F5F5]/35">
          {sessionWeekday(session) || "—"}
        </p>
        <p className="text-xl font-semibold leading-tight tabular-nums text-[#F5F5F5]">
          {session.date?.slice(0, 2) || "—"}
        </p>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "truncate text-sm font-semibold text-[#F5F5F5]",
              cancelled && "line-through"
            )}
          >
            {session.title || "Session sans titre"}
          </p>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px]"
            style={{ background: `${color}1f`, color }}
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: color, boxShadow: `0 0 6px ${color}88` }}
            />
            {sessionTypeLabel(session)}
          </span>
          {session.status !== "planned" && (
            <span className="rounded-full bg-[rgba(245,245,245,0.06)] px-2 py-0.5 text-[10px] text-[#F5F5F5]/50">
              {SESSION_STATUS_LABEL[session.status] ?? session.status}
            </span>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#F5F5F5]/40">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock3 size={12} />
            {session.time || "Heure à définir"}
            {session.endTime ? `–${session.endTime}` : ""}
            {duration ? ` · ${duration}` : ""}
          </span>
          {session.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} />
              {session.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users size={12} />
            {session.participants.length} participant
            {session.participants.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="hidden items-center gap-4 sm:flex">
        {thumbs.length > 0 && (
          <div className="flex items-center -space-x-2">
            {thumbs.slice(0, MAX_THUMBS).map((thumb) =>
              thumb.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={thumb.id}
                  src={thumb.cover}
                  alt=""
                  title={thumb.title}
                  className="h-8 w-8 rounded-md object-cover ring-2 ring-[#151517]"
                />
              ) : (
                <span
                  key={thumb.id}
                  title={thumb.title}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-[rgba(245,245,245,0.07)] ring-2 ring-[#151517]"
                >
                  <Disc3 size={13} className="text-[#F5F5F5]/30" aria-hidden />
                </span>
              )
            )}
            {extraThumbs > 0 && (
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[rgba(245,245,245,0.07)] text-[10px] tabular-nums text-[#F5F5F5]/55 ring-2 ring-[#151517]">
                +{extraThumbs}
              </span>
            )}
          </div>
        )}

        {cost > 0 && (
          <p className="w-20 text-right text-xs tabular-nums text-[#F0FF00]/70">
            {cost.toLocaleString("fr-FR")} €
          </p>
        )}
      </div>
    </button>
  );
}
