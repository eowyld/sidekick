"use client";

import {
  AlertTriangle,
  Disc3,
  Download,
  MoreHorizontal,
  Pencil,
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

/** Micro-libellé en capitales espacées au-dessus de sa valeur — signature du produit. */
function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/25">
        {label}
      </p>
      <div className="truncate">{children}</div>
    </div>
  );
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
        "card-hover group cursor-pointer rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-3",
        "outline-none transition-colors hover:border-[rgba(245,245,245,0.18)] focus-visible:ring-2 focus-visible:ring-[#F0FF00]/40"
      )}
    >
      {/* La pochette : conteneur `overflow-hidden` pour que seule l'image bouge
          au survol, jamais la carte. */}
      <div className="relative overflow-hidden rounded-lg">
        {album.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={album.cover}
            alt=""
            className="aspect-square w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-[rgba(245,245,245,0.05)] ring-1 ring-inset ring-[rgba(245,245,245,0.06)]">
            <Disc3
              className="h-10 w-10"
              style={{ color: "rgba(245,245,245,0.25)" }}
              aria-hidden
            />
          </div>
        )}

        {/* Type + statut en surimpression, haut gauche — libère la zone de texte. */}
        <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-md bg-[rgba(16,16,16,0.72)] px-2 py-1 backdrop-blur-[2px]">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#F5F5F5]/80">
            {albumTypeLabel(album.type)}
          </span>
          <span
            aria-hidden
            className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
            style={{
              background: RELEASE_STATUS_COLOR[status],
              boxShadow: `0 0 8px ${RELEASE_STATUS_COLOR[status]}55`,
            }}
          />
          <span className="text-[10px] text-[#F5F5F5]/70">
            {releaseStatusLabel(status)}
          </span>
        </div>

        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-[rgba(16,16,16,0.72)] text-[#F5F5F5]/70 backdrop-blur-[2px] hover:text-[#F5F5F5]"
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
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <p className="truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] text-[#F5F5F5]">
          {album.title || "Sans titre"}
        </p>

        <div className="flex items-start gap-4">
          <Meta label="Sortie">
            <span className="text-[11px] tabular-nums text-[#F5F5F5]/55">
              {releaseDate || "—"}
            </span>
          </Meta>
          <Meta label="Titres">
            <span className="text-[11px] tabular-nums text-[#F5F5F5]/55">
              {trackLabel}
            </span>
          </Meta>
        </div>

        <Meta label="UPC / EAN">
          {upc ? (
            <span className="font-mono text-[11px] tabular-nums text-[#F5F5F5]/55">
              {upc}
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
    </div>
  );
}
