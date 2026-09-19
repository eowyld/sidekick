"use client";

import {
  ChevronRight,
  Copy,
  FileAudio,
  ListMusic,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Trash2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toDisplayDate } from "@/lib/date-format";
import type { Mix } from "@/lib/sidekick-store";
import { cn, focusRingInset } from "@/lib/utils";
import {
  RELEASE_STATUS_COLOR,
  releaseStatusLabel,
} from "@/modules/phono/lib/release-status";
import { mixFormatLabel, tracklistDuration } from "@/modules/phono/lib/mix";
import { mixQueueItem } from "@/modules/phono/lib/player-queue";
import { usePhonoPlayer } from "../audio/PhonoPlayerProvider";
import { MixTracklistPanel } from "./MixTracklistPanel";

/**
 * Colonne de méta : micro-libellé en capitales espacées au-dessus de sa valeur.
 * Réplique exacte du helper de `TrackRow` — les deux onglets partagent la même
 * grille pour que le regard ne se réaligne pas en passant de l'un à l'autre.
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

interface MixRowProps {
  mix: Mix;
  /** Tracklist dépliée sous la ligne. */
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopyTracklist: () => void;
  /** Ouvre le rattachement du fichier audio, sans quitter le catalogue. */
  onAttachAudio: () => void;
}

/**
 * Ligne de catalogue en **lecture seule** pour l'onglet Mixes.
 *
 * Jumelle de `TrackRow` : cliquer la ligne déplie la tracklist, d'où l'on peut
 * sauter à n'importe quel titre du set ; l'édition passe par la page dédiée
 * (`MixEditPage`), atteinte par le menu `⋯`. Le menu stoppe la propagation pour
 * ne pas déplier la ligne au passage.
 */
export function MixRow({
  mix,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onCopyTracklist,
  onAttachAudio,
}: MixRowProps) {
  const { current, isPlaying, play } = usePhonoPlayer();
  const playingHere = current?.versionId === mix.id && isPlaying;
  const status = mix.status ?? "en_production";
  const count = mix.tracklist?.length ?? 0;
  const duration = tracklistDuration(mix.tracklist ?? []);
  const releaseDate = toDisplayDate(mix.releaseDate);

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
        aria-label={`${mix.title || "Sans titre"} — ${expanded ? "replier" : "déplier"} la tracklist`}
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
          Comme sur `TrackRow`, la pochette porte la lecture : survoler révèle
          le bouton par-dessus. Absent tant qu'aucun fichier n'est rattaché.
        */}
        <div className="relative h-12 w-12 shrink-0">
          {mix.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mix.cover}
              alt=""
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[rgba(245,245,245,0.05)] ring-1 ring-inset ring-[rgba(245,245,245,0.06)]">
              <ListMusic
                className="h-4 w-4"
                style={{ color: "rgba(245,245,245,0.25)" }}
                aria-hidden
              />
            </div>
          )}

          {mix.audioPath ? (
            <button
              type="button"
              aria-label={`Écouter ${mix.title || "ce mix"}`}
              title={`Écouter ${mix.title || "ce mix"}`}
              onClick={(e) => {
                stop(e);
                const item = mixQueueItem(mix);
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
              {playingHere ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
            </button>
          ) : null}
        </div>

        {/* Colonne principale — titre puis artistes */}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] text-[#F5F5F5]">
            <span className="truncate">{mix.title || "Sans titre"}</span>
            {mix.isVideo && (
              <span
                className="inline-flex shrink-0"
                title="Captation vidéo"
                aria-label="Captation vidéo"
              >
                <Video className="h-3.5 w-3.5 text-[#F5F5F5]/40" aria-hidden />
              </span>
            )}
          </p>
          <p className="mt-1 truncate text-[12px] leading-tight text-[#F5F5F5]/45">
            {mix.artists || "—"}
          </p>
        </div>

        {/* Colonnes de droite à largeur fixe, calées sur celles de `TrackRow`. */}
        <div className="hidden w-[112px] shrink-0 md:block">
          <Meta label="Format">
            <span className="text-[11px] text-[#F5F5F5]/60">
              {mixFormatLabel(mix.format)}
            </span>
          </Meta>
        </div>

        <div className="hidden w-[92px] shrink-0 lg:block">
          <Meta label="Publication">
            <span className="text-[11px] tabular-nums text-[#F5F5F5]/60">
              {releaseDate || "—"}
            </span>
          </Meta>
        </div>

        {/*
          La durée est celle du dernier timecode de la tracklist, pas celle du
          fichier : c'est la seule qui existe tant qu'aucun audio n'est
          rattaché. Déplier la ligne rend chaque timecode cliquable.
        */}
        <div className="hidden w-[110px] shrink-0 sm:block">
          <Meta label="Tracklist">
            <span
              className={cn(
                "text-[11px] tabular-nums transition-colors",
                count > 0
                  ? "text-[#F5F5F5]/60 group-hover/row:text-[#F0FF00]"
                  : "text-[#F5F5F5]/60"
              )}
            >
              {count}
              <span className="text-[#F5F5F5]/30">
                {" "}
                titre{count > 1 ? "s" : ""}
                {duration ? ` · ${duration}` : ""}
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
              aria-label={`Actions sur ${mix.title || "ce mix"}`}
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
            <DropdownMenuItem onSelect={onAttachAudio}>
              <FileAudio className="mr-2 h-3.5 w-3.5" />
              {mix.audioPath ? "Remplacer le fichier audio" : "Ajouter un fichier audio"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onCopyTracklist}>
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copier la tracklist
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded ? (
        <MixTracklistPanel mix={mix} onAttachAudio={onAttachAudio} />
      ) : null}
    </div>
  );
}
