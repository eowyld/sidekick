"use client";

import {
  AlertTriangle,
  ChevronRight,
  Copy,
  Download,
  MoreHorizontal,
  Music,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toDisplayDate } from "@/lib/date-format";
import type { Track, TrackVersion } from "@/lib/sidekick-store";
import { cn, focusRingInset } from "@/lib/utils";
import {
  RELEASE_STATUS_COLOR,
  releaseStatusLabel,
} from "@/modules/phono/lib/release-status";
import { normalizeTrackGuests, versionsWithAudio } from "@/modules/phono/lib/track";
import { trackQueueItem } from "@/modules/phono/lib/player-queue";
import { usePhonoPlayer } from "../audio/PhonoPlayerProvider";
import { VersionList } from "./VersionList";

/**
 * Colonne de méta : micro-libellé en capitales espacées au-dessus de sa valeur.
 *
 * C'est la convention des pages abouties du produit — Contacts et Revenus
 * titrent leurs colonnes en `10px/0.1em` à 35 % d'opacité. Elle donne à la ligne
 * une grille lisible, là où trois `justify-between` empilés ne produisaient
 * qu'un bord droit irrégulier.
 */
function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/25">
        {label}
      </p>
      <div className="truncate">{children}</div>
    </div>
  );
}

interface TrackRowProps {
  track: Track;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExportMetadata: (versionId?: string) => void;
  onPatchVersion: (versionId: string, patch: Partial<TrackVersion>) => void;
  onAddVersion: () => void;
  onRemoveVersion: (versionId: string) => void;
  /** Projets auxquels ce titre est rattaché. Vide = aucun badge. */
  projects?: Array<{ id: string; title: string }>;
}

/**
 * Ligne de catalogue en **lecture seule**.
 *
 * Le module Phono séparait mal lire et éditer : déplier un titre ouvrait une
 * vingtaine d'inputs, et le catalogue n'avait donc aucune représentation
 * lisible. Cette ligne ne contient aucun champ de saisie — l'édition passe par
 * la page dédiée `TrackEditPage` (`onEdit`), les micro-éditions par `VersionList`.
 */
export function TrackRow({
  track,
  expanded,
  onToggleExpand,
  onEdit,
  onDuplicate,
  onDelete,
  onExportMetadata,
  onPatchVersion,
  onAddVersion,
  onRemoveVersion,
  projects = [],
}: TrackRowProps) {
  const { play } = usePhonoPlayer();

  const status = track.status ?? "en_production";
  const versions = track.versions ?? [];
  const audioVersions = versionsWithAudio(track);
  const firstAudio = audioVersions[0];

  const featuring = normalizeTrackGuests(track.guestArtists)
    .filter((g) => g.role === "Artiste secondaire")
    .map((g) => g.name);

  const isrc = (track.isrc ?? "").trim();
  const releaseDate = toDisplayDate(track.releaseDate);

  /** Empêche un clic sur une action de déplier la ligne au passage. */
  const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggleExpand();
    }
  };

  return (
    <div
      className={cn(
        "card-hover group/row rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)]",
        "px-4 py-3 hover:border-[rgba(245,245,245,0.18)]",
        expanded && "border-[rgba(245,245,245,0.18)]"
      )}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`${track.title} — ${expanded ? "replier" : "déplier"} les versions`}
        onClick={onToggleExpand}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex cursor-pointer items-center gap-3.5 rounded-lg outline-none",
          focusRingInset
        )}
      >
        <ChevronRight
          aria-hidden
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[#F5F5F5]/25 transition-transform duration-200",
            "group-hover/row:text-[#F5F5F5]/50",
            expanded && "rotate-90 text-[#F5F5F5]/50"
          )}
        />

        {/*
          La pochette porte la lecture : survoler révèle le bouton par-dessus.
          C'est le geste attendu partout ailleurs en musique, et ça libère la
          ligne d'une icône permanente de plus.
        */}
        <div className="relative h-12 w-12 shrink-0">
          {track.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track.cover}
              alt=""
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[rgba(245,245,245,0.05)] ring-1 ring-inset ring-[rgba(245,245,245,0.06)]">
              <Music
                className="h-4 w-4"
                style={{ color: "rgba(245,245,245,0.25)" }}
                aria-hidden
              />
            </div>
          )}

          {firstAudio ? (
            <button
              type="button"
              aria-label={`Écouter ${track.title}`}
              title={`Écouter ${track.title}`}
              onClick={(e) => {
                stop(e);
                const item = trackQueueItem(track, firstAudio);
                if (item) play(item);
              }}
              className={cn(
                "absolute inset-0 flex items-center justify-center rounded-lg",
                "bg-[rgba(16,16,16,0.72)] text-[#F0FF00] backdrop-blur-[2px]",
                "opacity-0 transition-opacity duration-150",
                "group-hover/row:opacity-100 focus-visible:opacity-100",
                focusRingInset
              )}
            >
              <Play className="h-4 w-4 fill-current" />
            </button>
          ) : null}
        </div>

        {/* Colonne principale — titre puis interprètes */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] text-[#F5F5F5]">
            {track.title || "Sans titre"}
          </p>
          <p className="mt-1 truncate text-[12px] leading-tight text-[#F5F5F5]/45">
            {track.mainArtist || "—"}
            {featuring.length > 0 ? (
              <span className="text-[#F5F5F5]/30">
                {" "}
                · feat. {featuring.join(", ")}
              </span>
            ) : null}
          </p>

          {projects.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {projects.map((p) => (
                <a
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="rounded border border-[#F0FF00]/20 bg-[#F0FF00]/10 px-1.5 py-0.5 text-[10px] text-[#F0FF00]/60 transition-colors hover:text-[#F0FF00]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {p.title}
                </a>
              ))}
            </div>
          ) : null}
        </div>

        {/*
          Colonnes de droite à largeur fixe. Sans elles, trois `justify-between`
          empilés donnaient un bord droit en dents de scie et rien ne s'alignait
          d'une ligne à l'autre — c'est ce qui faisait « liste bricolée ».
        */}
        <div className="hidden w-[132px] shrink-0 md:block">
          <Meta label="ISRC">
            {isrc ? (
              <span className="font-mono text-[11px] tabular-nums text-[#F5F5F5]/60">
                {isrc}
              </span>
            ) : (
              <span
                className="flex items-center gap-1 text-[11px]"
                style={{ color: "#F59E0B" }}
              >
                <AlertTriangle className="h-3 w-3" aria-hidden />
                manquant
              </span>
            )}
          </Meta>
        </div>

        <div className="hidden w-[92px] shrink-0 lg:block">
          <Meta label="Sortie">
            <span className="text-[11px] tabular-nums text-[#F5F5F5]/60">
              {releaseDate || "—"}
            </span>
          </Meta>
        </div>

        <div className="hidden w-[86px] shrink-0 sm:block">
          <Meta label="Versions">
            <span className="text-[11px] tabular-nums text-[#F5F5F5]/60">
              {versions.length}
              <span className="text-[#F5F5F5]/30">
                {" · "}
                {audioVersions.length} audio
              </span>
            </span>
          </Meta>
        </div>

        <div className="w-[104px] shrink-0">
          <Meta label="Statut">
            <span className="flex items-center gap-1.5 text-[11px] text-[#F5F5F5]/70">
              <span
                aria-hidden
                className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
                style={{
                  background: RELEASE_STATUS_COLOR[status],
                  boxShadow: `0 0 8px ${RELEASE_STATUS_COLOR[status]}55`,
                }}
              />
              {releaseStatusLabel(status)}
            </span>
          </Meta>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-[#F5F5F5]/30 transition-colors hover:text-[#F5F5F5]"
              aria-label={`Actions sur ${track.title}`}
              onClick={stop}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={stop}>
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Éditer
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onExportMetadata()}>
              <Download className="mr-2 h-3.5 w-3.5" />
              Exporter les métadonnées
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDuplicate}>
              <Copy className="mr-2 h-3.5 w-3.5" />
              Dupliquer
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded ? (
        <VersionList
          track={track}
          onPatchVersion={onPatchVersion}
          onAddVersion={onAddVersion}
          onRemoveVersion={onRemoveVersion}
          onExportMetadata={onExportMetadata}
        />
      ) : null}
    </div>
  );
}
