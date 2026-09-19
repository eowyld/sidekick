"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AlertTriangle,
  ChevronUp,
  Disc3,
  Download,
  Pencil,
  Trash2,
} from "lucide-react";
import { formatDuration } from "@/lib/audio-peaks";
import { toDisplayDate } from "@/lib/date-format";
import type { Album, Track } from "@/lib/sidekick-store";
import { cn, focusRing } from "@/lib/utils";
import {
  albumTotalDurationMs,
  albumTrackVersions,
  albumTracks,
  albumTypeLabel,
  computeAlbumContributors,
} from "@/modules/phono/lib/album";
import {
  RELEASE_STATUS_COLOR,
  releaseStatusLabel,
} from "@/modules/phono/lib/release-status";
import { AlbumPanelTrackRow } from "./AlbumPanelTrackRow";
import { Meta } from "./Meta";

/**
 * Bouton d'action du panneau — même grammaire que les boutons du catalogue
 * (`ATTACH_BUTTON` dans `AudioAttachField`) : pastille discrète à filet fin,
 * qui ne s'allume en néon qu'au survol. Un cran plus généreuse en padding, le
 * panneau ayant la place que n'a pas une ligne de version.
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

interface AlbumPanelProps {
  album: Album;
  /** Tout le catalogue : l'album ne fait que référencer des `trackId`. */
  tracks: Track[];
  onEdit: () => void;
  onDelete: () => void;
  onExportMetadata: () => void;
  onClose: () => void;
}

/**
 * Album déplié sur place, en pleine largeur : récapitulatif puis tracklist
 * écoutable piste par piste.
 *
 * Strictement en **lecture** — c'est ce qui justifie de l'ouvrir au clic sans
 * risque et sans garde contre l'abandon. Toute écriture passe par
 * `AlbumEditPage`, atteignable par « Modifier ».
 */
export function AlbumPanel({
  album,
  tracks,
  onEdit,
  onDelete,
  onExportMetadata,
  onClose,
}: AlbumPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const status = album.status ?? "en_production";
  const upc = (album.upcEan ?? "").trim();
  const releaseDate = toDisplayDate(album.releaseDate);

  /**
   * Les pistes de l'album : une par version retenue, à plat et dans l'ordre.
   * `showVersionLabel` ne s'allume que pour les titres dont plusieurs versions
   * figurent sur la sortie — les seuls cas où le nom de version distingue
   * réellement deux lignes.
   */
  const ownTracks = useMemo(() => albumTracks(album, tracks), [album, tracks]);

  const pieces = useMemo(
    () =>
      ownTracks.flatMap((track) => {
        const versions = albumTrackVersions(album, track);
        return versions.map((version) => ({
          track,
          version,
          showVersionLabel: versions.length > 1,
        }));
      }),
    [album, ownTracks]
  );

  const totalMs = useMemo(
    () => albumTotalDurationMs(album, tracks),
    [album, tracks]
  );
  const contributors = useMemo(
    () => computeAlbumContributors(album, ownTracks),
    [album, ownTracks]
  );

  // Compté en **pistes**, pas en titres : c'est ce que fait entendre la sortie,
  // ligne pour ligne avec la tracklist juste en dessous. Un titre dont deux
  // versions sont retenues compte donc pour deux — le compteur « titres » de la
  // carte repliée, lui, reste sur les titres (voir `albumPieceCount`).
  const pieceLabel = `${pieces.length} piste${pieces.length > 1 ? "s" : ""}`;

  // Le panneau remplace la pochette cliquée : sans ce recentrage, ouvrir un
  // album du bas de la grille laisse son détail hors de l'écran. `nearest` ne
  // bouge rien quand le panneau est déjà visible en entier.
  useEffect(() => {
    panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [album.id]);

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
      className={cn(
        "album-panel-unroll overflow-hidden rounded-xl border border-[rgba(245,245,245,0.14)] bg-[rgba(44,44,46,0.55)] backdrop-blur-xl"
      )}
    >
      <div className="flex gap-5 p-5">
        {/* Pochette — cliquable pour refermer, comme celle qui a ouvert. */}
        <button
          type="button"
          onClick={onClose}
          aria-label={`Replier « ${album.title || "Sans titre"} »`}
          className={cn(
            "h-32 w-32 shrink-0 overflow-hidden rounded-lg",
            focusRing
          )}
        >
          {album.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={album.cover}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[rgba(245,245,245,0.05)] ring-1 ring-inset ring-[rgba(245,245,245,0.06)]">
              <Disc3
                className="h-10 w-10"
                style={{ color: "rgba(245,245,245,0.25)" }}
                aria-hidden
              />
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[17px] font-semibold leading-tight tracking-[-0.01em] text-[#F5F5F5]">
                {album.title || "Sans titre"}
              </h3>
              <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                <span className="font-semibold uppercase tracking-[0.08em] text-[#F5F5F5]/70">
                  {albumTypeLabel(album.type)}
                </span>
                <span className="text-[#F5F5F5]/20" aria-hidden>
                  ·
                </span>
                <span
                  aria-hidden
                  className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
                  style={{
                    background: RELEASE_STATUS_COLOR[status],
                    boxShadow: `0 0 8px ${RELEASE_STATUS_COLOR[status]}55`,
                  }}
                />
                <span className="text-[#F5F5F5]/70">
                  {releaseStatusLabel(status)}
                </span>
                {album.artist ? (
                  <>
                    <span className="text-[#F5F5F5]/20" aria-hidden>
                      ·
                    </span>
                    <span className="truncate text-[#F5F5F5]/55">
                      {album.artist}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            {/*
              Les trois actions à plat, pas dans un menu ⋯ : le panneau a la
              largeur pour les porter, et la carte repliée garde son menu pour
              qui agit sans ouvrir. Un séparateur les détache de « Replier »,
              qui ne fait rien à l'album.
            */}
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" className={PANEL_ACTION} onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5 shrink-0" />
                Modifier
              </button>
              <button
                type="button"
                className={PANEL_ACTION}
                onClick={onExportMetadata}
              >
                <Download className="h-3.5 w-3.5 shrink-0" />
                Exporter les métadonnées
              </button>
              <button
                type="button"
                className={PANEL_ACTION_DANGER}
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                Supprimer
              </button>

              <span
                aria-hidden
                className="mx-1 h-5 w-px bg-[rgba(245,245,245,0.12)]"
              />

              {/* Sans libellé : le chevron vers le haut dit déjà tout, et la
                  seule action qui ne touche pas à l'album est aussi la seule à
                  ne pas porter de mot. */}
              <button
                type="button"
                className={cn(PANEL_ACTION, "px-1.5")}
                onClick={onClose}
                aria-label="Replier"
                title="Replier"
              >
                <ChevronUp className="h-4 w-4 shrink-0" />
              </button>
            </div>
          </div>

          {/* Récap : quatre colonnes de repères, deux rangées. */}
          <div className="mt-5 grid grid-cols-4 gap-x-6 gap-y-4">
            <Meta label="Sortie">
              <span className="text-[12px] tabular-nums text-[#F5F5F5]/70">
                {releaseDate || "—"}
              </span>
            </Meta>
            <Meta label="Pistes">
              <span className="text-[12px] tabular-nums text-[#F5F5F5]/70">
                {pieceLabel}
              </span>
            </Meta>
            <Meta label="Durée">
              <span className="text-[12px] tabular-nums text-[#F5F5F5]/70">
                {totalMs > 0 ? formatDuration(totalMs) : "—"}
              </span>
            </Meta>
            <Meta label="UPC / EAN">
              {upc ? (
                <span className="font-mono text-[12px] tabular-nums text-[#F5F5F5]/70">
                  {upc}
                </span>
              ) : (
                <span
                  className="flex items-center gap-1 text-[12px]"
                  style={{ color: "#F59E0B" }}
                >
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  manquant
                </span>
              )}
            </Meta>

            <Meta label="Label">
              <span className="text-[12px] text-[#F5F5F5]/70">
                {album.label?.trim() || "—"}
              </span>
            </Meta>
            <Meta label="Distribution">
              <span className="text-[12px] text-[#F5F5F5]/70">
                {album.distribution?.trim() || "—"}
              </span>
            </Meta>
            <Meta label="Éditeur">
              <span className="text-[12px] text-[#F5F5F5]/70">
                {album.editor?.trim() || "—"}
              </span>
            </Meta>
            <Meta label="Genre">
              <span className="text-[12px] text-[#F5F5F5]/70">
                {album.genre?.trim() || "—"}
              </span>
            </Meta>
          </div>

          {contributors.length > 0 ? (
            <div className="mt-4">
              <Meta label="Crédits">
                <span className="text-[12px] text-[#F5F5F5]/55">
                  {contributors
                    .map((c) =>
                      c.roles.length > 0
                        ? `${c.name} (${c.roles.join(", ")})`
                        : c.name
                    )
                    .join(" · ")}
                </span>
              </Meta>
            </div>
          ) : null}
        </div>
      </div>

      {/* Tracklist */}
      <div className="border-t border-[rgba(245,245,245,0.1)] px-3 py-2">
        {pieces.length === 0 ? (
          <p className="px-2 py-4 text-[12px] text-[#F5F5F5]/40">
            Aucun titre sur cette sortie. Ajoute-les depuis « Modifier ».
          </p>
        ) : (
          <div className="divide-y divide-[rgba(245,245,245,0.06)]">
            {pieces.map(({ track, version, showVersionLabel }, index) => (
              <AlbumPanelTrackRow
                key={`${track.id}:${version.id}`}
                album={album}
                track={track}
                version={version}
                position={index + 1}
                showVersionLabel={showVersionLabel}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
