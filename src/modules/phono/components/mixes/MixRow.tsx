"use client";

import {
  Copy,
  ListMusic,
  MoreHorizontal,
  Pencil,
  Trash2,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toDisplayDate } from "@/lib/date-format";
import type { Mix } from "@/lib/sidekick-store";
import { cn } from "@/lib/utils";
import {
  RELEASE_STATUS_COLOR,
  releaseStatusLabel,
} from "@/modules/phono/lib/release-status";
import { mixFormatLabel, tracklistDuration } from "@/modules/phono/lib/mix";

interface MixRowProps {
  mix: Mix;
  onEdit: () => void;
  onDelete: () => void;
  onCopyTracklist: () => void;
}

/**
 * Ligne de catalogue en **lecture seule** pour l'onglet Mixes. Jumelle de
 * `TrackRow` / `AlbumCard` : toute la ligne ouvre l'édition, le menu `⋯` stoppe
 * la propagation pour ne pas la déclencher au passage.
 */
export function MixRow({ mix, onEdit, onDelete, onCopyTracklist }: MixRowProps) {
  const status = mix.status ?? "en_production";
  const count = mix.tracklist?.length ?? 0;
  const duration = tracklistDuration(mix.tracklist ?? []);
  const releaseDate = toDisplayDate(mix.releaseDate);

  const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onEdit();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${mix.title || "Sans titre"} — éditer`}
      onClick={onEdit}
      onKeyDown={handleKeyDown}
      className={cn(
        "rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-4",
        "cursor-pointer outline-none transition-colors hover:border-[rgba(245,245,245,0.18)] focus-visible:ring-2 focus-visible:ring-[#F0FF00]/40"
      )}
    >
      <div className="flex items-start gap-3">
        {mix.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mix.cover}
            alt=""
            className="h-10 w-10 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[rgba(245,245,245,0.06)]">
            <ListMusic
              className="h-4 w-4"
              style={{ color: "rgba(245,245,245,0.3)" }}
              aria-hidden
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Ligne 1 — titre + format + vidéo + date */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="min-w-0 truncate text-sm font-medium text-[#F5F5F5]">
                {mix.title || "Sans titre"}
              </p>
              <Badge variant="outline">{mixFormatLabel(mix.format)}</Badge>
              {mix.isVideo && (
                <span
                  className="inline-flex shrink-0"
                  title="Captation vidéo"
                  aria-label="Captation vidéo"
                >
                  <Video className="h-3 w-3 text-[#F5F5F5]/50" aria-hidden />
                </span>
              )}
            </div>
            <span className="shrink-0 text-xs tabular-nums text-[#F5F5F5]/45">
              {releaseDate || "—"}
            </span>
          </div>

          {/* Ligne 2 — artistes + statut */}
          <div className="mt-0.5 flex items-start justify-between gap-3">
            <p className="min-w-0 truncate text-xs text-[#F5F5F5]/45">
              {mix.artists || "—"}
            </p>
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-[#F5F5F5]/70">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: RELEASE_STATUS_COLOR[status] }}
              />
              {releaseStatusLabel(status)}
            </span>
          </div>

          {/* Ligne 3 — compteurs + actions */}
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="text-xs text-[#F5F5F5]/45">
              {count} titre{count > 1 ? "s" : ""}
              {duration ? ` · ${duration}` : ""}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-[#F5F5F5]/40 hover:text-[#F5F5F5]"
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
                <DropdownMenuItem onSelect={onCopyTracklist}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copier la tracklist
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-400" onSelect={onDelete}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
