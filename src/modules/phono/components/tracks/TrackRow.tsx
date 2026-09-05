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
import { cn } from "@/lib/utils";
import {
  RELEASE_STATUS_COLOR,
  releaseStatusLabel,
} from "@/modules/phono/lib/release-status";
import { normalizeTrackGuests, versionsWithAudio } from "@/modules/phono/lib/track";
import { usePhonoPlayer } from "../audio/PhonoPlayerProvider";
import { VersionList } from "./VersionList";

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
 * `TrackDialog` (`onEdit`), les micro-éditions par `VersionList`.
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

  const versionCount = `${versions.length} version${versions.length > 1 ? "s" : ""}`;
  const audioCount = `${audioVersions.length} audio`;

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
        "rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-4",
        "transition-colors hover:border-[rgba(245,245,245,0.18)]"
      )}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`${track.title} — ${expanded ? "replier" : "déplier"} les versions`}
        onClick={onToggleExpand}
        onKeyDown={handleKeyDown}
        className="flex cursor-pointer items-start gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#F0FF00]/40"
      >
        <ChevronRight
          aria-hidden
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-[#F5F5F5]/40 transition-transform",
            expanded && "rotate-90"
          )}
        />

        {track.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.cover}
            alt=""
            className="h-10 w-10 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[rgba(245,245,245,0.06)]">
            <Music
              className="h-4 w-4"
              style={{ color: "rgba(245,245,245,0.3)" }}
              aria-hidden
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Ligne 1 — titre + statut */}
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-medium text-[#F5F5F5]">
              {track.title || "Sans titre"}
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

          {/* Ligne 2 — artistes + ISRC */}
          <div className="mt-0.5 flex items-start justify-between gap-3">
            <p className="min-w-0 truncate text-xs text-[#F5F5F5]/45">
              {track.mainArtist || "—"}
              {featuring.length > 0 ? ` · feat. ${featuring.join(", ")}` : ""}
            </p>
            {isrc ? (
              <span className="shrink-0 font-mono text-xs tabular-nums text-[#F5F5F5]/45">
                {isrc}
              </span>
            ) : (
              <span
                className="flex shrink-0 items-center gap-1 text-xs"
                style={{ color: "#F59E0B" }}
              >
                <AlertTriangle className="h-3 w-3" aria-hidden />
                ISRC manquant
              </span>
            )}
          </div>

          {projects.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {projects.map((p) => (
                <a
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-[#F0FF00]/10 text-[#F0FF00]/60 hover:text-[#F0FF00] border border-[#F0FF00]/20 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {p.title}
                </a>
              ))}
            </div>
          ) : null}

          {/* Ligne 3 — date + compteurs + actions */}
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="shrink-0 text-xs tabular-nums text-[#F5F5F5]/45">
              {releaseDate || "—"}
            </span>

            <div className="flex items-center gap-2">
              {firstAudio ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-[#F5F5F5]/50 hover:text-[#F0FF00]"
                  aria-label={`Écouter ${track.title}`}
                  title={`Écouter ${track.title}`}
                  onClick={(e) => {
                    stop(e);
                    play({
                      trackId: track.id,
                      versionId: firstAudio.id,
                      title: track.title,
                      versionLabel: firstAudio.label,
                      coverSrc: track.cover,
                      audioPath: firstAudio.audioPath as string,
                      peaks: firstAudio.peaks,
                      durationMs: firstAudio.durationMs,
                    });
                  }}
                >
                  <Play className="h-3 w-3" />
                </Button>
              ) : null}

              <span className="text-xs text-[#F5F5F5]/45">
                {versionCount} · {audioCount}
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-[#F5F5F5]/40 hover:text-[#F5F5F5]"
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
