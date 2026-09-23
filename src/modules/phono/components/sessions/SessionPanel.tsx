"use client";

import { useEffect, useRef } from "react";
import {
  ChevronUp,
  Clock3,
  Disc3,
  FileText,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";
import type { StudioSession } from "@/hooks/usePhonoData";
import { cn, focusRing } from "@/lib/utils";
import { Meta } from "../albums/Meta";
import {
  SESSION_STATUS_LABEL,
  formatDuration,
  sessionCost,
  sessionDurationMinutes,
  sessionTypeColor,
  sessionTypeLabel,
  sessionWeekday,
} from "@/modules/phono/lib/session";
import type { SessionThumb } from "./SessionRow";

/**
 * Bouton d'action du panneau — repris tel quel de `AlbumPanel` : pastille
 * discrète à filet fin, qui ne s'allume en néon qu'au survol.
 */
const PANEL_ACTION = cn(
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium",
  "border-[rgba(245,245,245,0.12)] text-[#F5F5F5]/65 transition-colors duration-150",
  "hover:border-[#F0FF00]/40 hover:bg-[#F0FF00]/10 hover:text-[#F0FF00]",
  focusRing
);

/** Même pastille, allumée en rouge : supprimer ne se survole pas en jaune. */
const PANEL_ACTION_DANGER = cn(
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium",
  "border-[rgba(245,245,245,0.12)] text-[#F5F5F5]/65 transition-colors duration-150",
  "hover:border-[#F87171]/40 hover:bg-[#F87171]/10 hover:text-[#F87171]",
  focusRing
);

interface SessionPanelProps {
  session: StudioSession;
  /** Tout le catalogue indexé par id : la session ne fait que référencer. */
  catalog: Map<string, SessionThumb>;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * Session dépliée sur place, en pleine largeur. Strictement en **lecture** —
 * c'est ce qui permet de l'ouvrir au clic sans garde contre l'abandon. Toute
 * écriture passe par `SessionEditPage`, atteignable par « Modifier ».
 *
 * Jumeau de `AlbumPanel` : même animation de déroulé, même fermeture à Échap,
 * même recentrage à l'ouverture, mêmes pastilles d'action.
 */
export function SessionPanel({
  session,
  catalog,
  onEdit,
  onDelete,
  onClose,
}: SessionPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const color = sessionTypeColor(session);
  const duration = formatDuration(sessionDurationMinutes(session));
  const cost = sessionCost(session);
  const cancelled = session.status === "cancelled";

  const resolve = (ids: string[] | undefined) =>
    (ids ?? [])
      .map((id) => catalog.get(id))
      .filter((item): item is SessionThumb => item !== undefined);

  const albums = resolve(session.albumIds);
  const tracks = resolve(session.trackIds);
  const mixes = resolve(session.mixIds);
  const linkedTotal = albums.length + tracks.length + mixes.length;

  // Le panneau remplace la ligne cliquée : sans ce recentrage, ouvrir une
  // session du bas de la liste laisse son détail hors de l'écran. `nearest` ne
  // bouge rien quand le panneau est déjà visible en entier.
  useEffect(() => {
    panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [session.id]);

  // Échap referme — un panneau qui prend la largeur de la page se ferme comme
  // une fenêtre, même s'il n'en est pas une.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="album-panel-unroll relative overflow-hidden rounded-xl border border-[rgba(245,245,245,0.14)] bg-[rgba(44,44,46,0.55)] backdrop-blur-xl"
    >
      {/* Liseré du type, comme sur la ligne repliée : le panneau garde la
          couleur par laquelle on l'a reconnu dans la liste. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: color }}
      />

      <div className="flex items-start gap-5 p-5 pl-6">
        {/* Le bloc de date referme, comme il a ouvert. */}
        <button
          type="button"
          onClick={onClose}
          aria-label={`Replier « ${session.title || "Session sans titre"} »`}
          className={cn(
            "shrink-0 rounded-lg border border-[rgba(245,245,245,0.1)] px-4 py-3 text-center transition-colors hover:border-[rgba(245,245,245,0.2)]",
            focusRing
          )}
        >
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#F5F5F5]/35">
            {sessionWeekday(session) || "—"}
          </p>
          <p className="text-2xl font-semibold leading-tight tabular-nums text-[#F5F5F5]">
            {session.date?.slice(0, 2) || "—"}
          </p>
          <p className="text-[10px] tabular-nums text-[#F5F5F5]/35">
            {session.date?.slice(3) || ""}
          </p>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3
                className={cn(
                  "truncate text-[17px] font-semibold leading-tight tracking-[-0.01em] text-[#F5F5F5]",
                  cancelled && "line-through"
                )}
              >
                {session.title || "Session sans titre"}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                <span
                  aria-hidden
                  className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
                  style={{ background: color, boxShadow: `0 0 8px ${color}55` }}
                />
                <span className="font-semibold uppercase tracking-[0.08em] text-[#F5F5F5]/70">
                  {sessionTypeLabel(session)}
                </span>
                <span className="text-[#F5F5F5]/20" aria-hidden>
                  ·
                </span>
                <span className="text-[#F5F5F5]/70">
                  {SESSION_STATUS_LABEL[session.status] ?? session.status}
                </span>
                {session.presenceEnabled && (
                  <>
                    <span className="text-[#F5F5F5]/20" aria-hidden>
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#F0FF00]/70">
                      <FileText size={11} />
                      Fiche de présence
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={onEdit} className={PANEL_ACTION}>
                <Pencil size={13} />
                Modifier
              </button>
              <button
                type="button"
                onClick={onDelete}
                className={PANEL_ACTION_DANGER}
              >
                <Trash2 size={13} />
                Supprimer
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Replier"
                className={cn(
                  "inline-flex h-[30px] w-[30px] items-center justify-center rounded-md border border-[rgba(245,245,245,0.12)] text-[#F5F5F5]/50 transition-colors hover:text-[#F5F5F5]",
                  focusRing
                )}
              >
                <ChevronUp size={15} />
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Meta label="Créneau">
              <span className="inline-flex items-center gap-1.5 text-[12px] tabular-nums text-[#F5F5F5]/75">
                <Clock3 size={12} className="text-[#F5F5F5]/30" />
                {session.time || "à définir"}
                {session.endTime ? `–${session.endTime}` : ""}
              </span>
            </Meta>
            <Meta label="Durée">
              <span className="text-[12px] tabular-nums text-[#F5F5F5]/75">
                {duration || "—"}
              </span>
            </Meta>
            <Meta label="Studio">
              <span className="inline-flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/75">
                <MapPin size={12} className="text-[#F5F5F5]/30" />
                {session.location || "—"}
              </span>
            </Meta>
            <Meta label="Coût">
              <span
                className={cn(
                  "text-[12px] tabular-nums",
                  cost > 0 ? "text-[#F0FF00]/80" : "text-[#F5F5F5]/75"
                )}
              >
                {cost > 0 ? `${cost.toLocaleString("fr-FR")} €` : "—"}
              </span>
            </Meta>
          </div>

          {session.address && (
            <div className="mt-4">
              <Meta label="Adresse">
                <span className="text-[12px] text-[#F5F5F5]/75">
                  {session.address}
                </span>
              </Meta>
            </div>
          )}
        </div>
      </div>

      {(session.participants.length > 0 ||
        linkedTotal > 0 ||
        (session.note ?? "").trim()) && (
        <div className="border-t border-[rgba(245,245,245,0.08)] px-5 pb-5 pl-6 pt-4">
          <div className="grid gap-5 lg:grid-cols-2">
            {session.participants.length > 0 && (
              <section>
                <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/25">
                  Participants
                </p>
                <ul className="space-y-1.5">
                  {session.participants.map((p) => (
                    <li key={p.id} className="flex items-center gap-2.5">
                      <span
                        aria-hidden
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(245,245,245,0.07)] text-[10px] font-semibold text-[#F5F5F5]/60"
                      >
                        {initials(p.name)}
                      </span>
                      {/* Nom et rôle collés l'un à l'autre : poussé au bord
                          droit, le rôle laissait un trou au milieu de la ligne. */}
                      <span className="shrink-0 truncate text-[13px] text-[#F5F5F5]/85">
                        {p.name || "Sans nom"}
                      </span>
                      <span className="shrink-0 text-[#F5F5F5]/20" aria-hidden>
                        ·
                      </span>
                      <span className="min-w-0 truncate text-[11px] text-[#F5F5F5]/40">
                        {p.instrument ? `${p.role} · ${p.instrument}` : p.role}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {linkedTotal > 0 && (
              <section>
                <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/25">
                  Catalogue lié
                </p>
                <div className="space-y-3">
                  <LinkedGroup label="Albums & EP" items={albums} />
                  <LinkedGroup label="Titres" items={tracks} />
                  <LinkedGroup label="Mixes" items={mixes} />
                </div>
              </section>
            )}
          </div>

          {(session.note ?? "").trim() && (
            <section className="mt-5">
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/25">
                Notes
              </p>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#F5F5F5]/70">
                {session.note}
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

/** Initiales d'un participant, pour la pastille qui tient lieu d'avatar. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function LinkedGroup({
  label,
  items,
}: {
  label: string;
  items: SessionThumb[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[10px] text-[#F5F5F5]/35">{label}</p>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-2 rounded-md border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.02)] py-1 pl-1 pr-2.5"
          >
            {item.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.cover}
                alt=""
                className="h-6 w-6 rounded object-cover"
              />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded bg-[rgba(245,245,245,0.06)]">
                <Disc3 size={11} className="text-[#F5F5F5]/30" aria-hidden />
              </span>
            )}
            <span className="max-w-[16rem] truncate text-[12px] text-[#F5F5F5]/75">
              {item.title || "Sans titre"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
