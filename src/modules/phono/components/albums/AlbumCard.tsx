"use client";

import {
  AlertTriangle,
  Disc3,
  Download,
  MoreHorizontal,
  Pencil,
  Trash2,
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
import type { Album } from "@/lib/sidekick-store";
import { cn } from "@/lib/utils";
import { albumTypeLabel } from "@/modules/phono/lib/album";
import {
  RELEASE_STATUS_COLOR,
  releaseStatusLabel,
} from "@/modules/phono/lib/release-status";

interface AlbumCardProps {
  album: Album;
  trackCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onExportMetadata: () => void;
}

/**
 * Carte de release en **lecture seule** pour la grille de l'onglet Albums.
 *
 * Toute la carte est cliquable et ouvre l'édition (`onEdit`) ; les actions du
 * menu `⋯` stoppent la propagation pour ne pas déclencher l'édition au passage.
 */
export function AlbumCard({
  album,
  trackCount,
  onEdit,
  onDelete,
  onExportMetadata,
}: AlbumCardProps) {
  const status = album.status ?? "en_production";
  const upc = (album.upcEan ?? "").trim();
  const releaseDate = toDisplayDate(album.releaseDate);
  const trackLabel = `${trackCount} titre${trackCount > 1 ? "s" : ""}`;

  /** Empêche un clic sur une action d'ouvrir l'édition au passage. */
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
      aria-label={`${album.title || "Sans titre"} — éditer`}
      onClick={onEdit}
      onKeyDown={handleKeyDown}
      className={cn(
        "group cursor-pointer rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-3",
        "outline-none transition-colors hover:border-[rgba(245,245,245,0.18)] focus-visible:ring-2 focus-visible:ring-[#F0FF00]/40"
      )}
    >
      <div className="relative">
        {album.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={album.cover}
            alt=""
            className="aspect-square w-full rounded-lg object-cover"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-[rgba(245,245,245,0.06)]">
            <Disc3
              className="h-10 w-10"
              style={{ color: "rgba(245,245,245,0.3)" }}
              aria-hidden
            />
          </div>
        )}

        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-[rgba(16,16,16,0.7)] text-[#F5F5F5]/70 backdrop-blur hover:text-[#F5F5F5]"
                aria-label={`Actions sur ${album.title || "l'album"}`}
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
              <DropdownMenuItem onSelect={onExportMetadata}>
                <Download className="mr-2 h-3.5 w-3.5" />
                Exporter les métadonnées
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-400" onSelect={onDelete}>
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <p className="truncate text-sm font-medium text-[#F5F5F5]">
          {album.title || "Sans titre"}
        </p>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[#F5F5F5]/70">
          <Badge variant="outline">{albumTypeLabel(album.type)}</Badge>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: RELEASE_STATUS_COLOR[status] }}
            />
            {releaseStatusLabel(status)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-[#F5F5F5]/45">
          <span className="tabular-nums">{releaseDate || "—"}</span>
          <span>{trackLabel}</span>
        </div>

        {upc ? (
          <p className="font-mono text-xs tabular-nums text-[#F5F5F5]/45">{upc}</p>
        ) : (
          <p
            className="flex items-center gap-1 text-xs"
            style={{ color: "#F59E0B" }}
          >
            <AlertTriangle className="h-3 w-3" aria-hidden />
            UPC manquant
          </p>
        )}
      </div>
    </div>
  );
}
