"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronUp, Disc3, Mic2, Pencil, Trash2 } from "lucide-react";
import type { Work } from "@/lib/sidekick-store";
import { cn, focusRing } from "@/lib/utils";
import { Meta } from "@/modules/phono/components/albums/Meta";
import { dateFR } from "@/modules/live/lib/live-model";
import { rightsShares } from "../lib/rights-shares";
import type { WorkLife } from "../lib/work-life";
import { isReleased } from "../lib/work-life";
import { STEP_META, type LifecycleStep } from "../lib/work-lifecycle";
import { StatusSwitch } from "./work/StatusSwitch";
import { RightsCharts } from "./work/RightsCharts";

/** Pastilles d'action, reprises de `SessionPanel` : filet fin, néon au survol seulement. */
const PANEL_ACTION = cn(
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium",
  "border-[rgba(245,245,245,0.12)] text-[#F5F5F5]/65 transition-colors duration-150",
  "hover:border-[#F0FF00]/40 hover:bg-[#F0FF00]/10 hover:text-[#F0FF00]",
  focusRing,
);
const PANEL_ACTION_DANGER = cn(
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium",
  "border-[rgba(245,245,245,0.12)] text-[#F5F5F5]/65 transition-colors duration-150",
  "hover:border-[#F87171]/40 hover:bg-[#F87171]/10 hover:text-[#F87171]",
  focusRing,
);

const SECTION_LABEL = "mb-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/25";

/**
 * Œuvre dépliée sur place dans la liste des œuvres. Jumeau de `SessionPanel` (Phono) :
 * même déroulé, même fermeture à Échap, même recentrage, et strictement en
 * lecture. Toute écriture passe par la fiche, atteignable par « Modifier ».
 */
export function WorkPanel({
  work,
  step,
  life,
  today,
  onClose,
  onDelete,
  onStatusChange,
}: {
  work: Work;
  step: LifecycleStep;
  life: WorkLife;
  today: string;
  onClose: () => void;
  onDelete: () => void;
  onStatusChange: (next: Work["status"]) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const shares = rightsShares(work);
  const color = STEP_META[step].color;

  // Le panneau remplace la ligne cliquée : sans ce recentrage, ouvrir une
  // œuvre du bas de la liste laisse son détail hors de l'écran.
  useEffect(() => {
    panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [work.id]);

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
      {/* Liseré de l'étape : le panneau garde la couleur de sa pastille dans la liste. */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color }} />

      <div className="p-5 pl-6">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={onClose}
              aria-label={`Replier « ${work.title || "Sans titre"} »`}
              className={cn("block max-w-full rounded-md text-left", focusRing)}
            >
              <h3 className="truncate text-[17px] font-semibold leading-tight tracking-[-0.01em] text-[#F5F5F5]">
                {work.title || "Sans titre"}
              </h3>
            </button>
            <div className="mt-2.5">
              <StatusSwitch status={work.status} onChange={onStatusChange} size="sm" />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href={`/edition/${work.id}`} className={PANEL_ACTION}>
              <Pencil size={13} />
              Modifier
            </Link>
            <button type="button" onClick={onDelete} className={PANEL_ACTION_DANGER}>
              <Trash2 size={13} />
              Supprimer
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Replier"
              className={cn(
                "inline-flex h-[30px] w-[30px] items-center justify-center rounded-md border border-[rgba(245,245,245,0.12)] text-[#F5F5F5]/50 transition-colors hover:text-[#F5F5F5]",
                focusRing,
              )}
            >
              <ChevronUp size={15} />
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="ISWC">
            <span className="text-[12px] tabular-nums text-[#F5F5F5]/75">{work.iswc || "—"}</span>
          </Meta>
          <Meta label="Durée">
            <span className="text-[12px] tabular-nums text-[#F5F5F5]/75">{work.duration || "—"}</span>
          </Meta>
          <Meta label="Genre">
            <span className="text-[12px] text-[#F5F5F5]/75">{work.genre || "—"}</span>
          </Meta>
          <Meta label="Première exploitation">
            <span className="text-[12px] tabular-nums text-[#F5F5F5]/75">
              {work.firstExploitationDate ? new Date(work.firstExploitationDate).toLocaleDateString("fr-FR") : "—"}
            </span>
          </Meta>
        </div>
      </div>

      <div className="border-t border-[rgba(245,245,245,0.08)] px-5 pb-5 pl-6 pt-4">
        <section>
          <p className={SECTION_LABEL}>Ayants droit et répartition</p>
          {shares.length === 0 ? (
            <p className="text-[12px] text-[#F5F5F5]/40">Aucun ayant droit renseigné.</p>
          ) : (
            <RightsCharts shares={shares} compact />
          )}
        </section>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <section>
            <p className={SECTION_LABEL}>Titres liés</p>
            {life.tracks.length === 0 ? (
              <p className="text-[12px] text-[#F5F5F5]/40">Aucun titre Phono relié.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {life.tracks.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/phono/catalogue/titre/${t.id}`}
                      className="flex items-center gap-2 rounded-md border border-[rgba(245,245,245,0.08)] bg-[rgba(245,245,245,0.02)] py-1 pl-1.5 pr-2.5 hover:border-[rgba(245,245,245,0.2)]"
                    >
                      <Disc3 size={12} className="text-[#F5F5F5]/30" aria-hidden />
                      <span className="max-w-[16rem] truncate text-[12px] text-[#F5F5F5]/75">{t.title || "Sans titre"}</span>
                      <span className={cn("text-[10px]", isReleased(t, today) ? "text-emerald-400/80" : "text-[#F5F5F5]/35")}>
                        {isReleased(t, today) ? "sorti" : "à venir"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {life.releasedUndeclared && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-300">
                <AlertTriangle size={12} />
                Sortie mais pas déclarée à la SACEM
              </p>
            )}
          </section>

          <section>
            <p className={SECTION_LABEL}>Concerts</p>
            {life.performances.length === 0 ? (
              <p className="text-[12px] text-[#F5F5F5]/40">Jouée dans aucune setlist de concert passé.</p>
            ) : (
              <>
                <p className="flex items-center gap-1.5 text-[12px] text-[#F5F5F5]/75">
                  <Mic2 size={12} className="text-[#F5F5F5]/30" />
                  Jouée {life.performances.length} fois, dernière fois le {dateFR(life.performances[0].date)}
                  {life.performances[0].city ? ` à ${life.performances[0].city}` : ""}
                </p>
                {life.undeclaredPrograms.length > 0 && (
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-300">
                    <AlertTriangle size={12} />
                    {life.undeclaredPrograms.length} programme{life.undeclaredPrograms.length > 1 ? "s" : ""} à déclarer
                  </p>
                )}
              </>
            )}
          </section>
        </div>

        {work.notes.trim() && (
          <section className="mt-5">
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/25">Notes</p>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#F5F5F5]/70">{work.notes}</p>
          </section>
        )}
      </div>
    </div>
  );
}
