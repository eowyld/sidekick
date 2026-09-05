"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Music } from "lucide-react";
import type { Album, ReleaseStatus, Track } from "@/lib/sidekick-store";
import {
  RELEASE_STATUSES,
  RELEASE_STATUS_COLOR,
} from "@/modules/phono/lib/release-status";
import { versionsWithAudio } from "@/modules/phono/lib/track";
import { formatBytes } from "@/modules/phono/lib/audio-limits";
import { cn } from "@/lib/utils";
import { StorageSummary } from "./audio/StorageSummary";

/**
 * Filtre appliqué au catalogue depuis le bandeau. `none` = aucun filtre.
 * La tâche 13 importe ce type pour piloter la liste des titres.
 */
export type CatalogFilter =
  | { kind: "none" }
  | { kind: "status"; status: ReleaseStatus }
  | { kind: "missing-isrc" }
  | { kind: "missing-audio" };

interface CatalogHeaderProps {
  tracks: Track[];
  albums: Album[];
  filter: CatalogFilter;
  onFilterChange: (filter: CatalogFilter) => void;
}

function filterEq(a: CatalogFilter, b: CatalogFilter): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "status" && b.kind === "status") return a.status === b.status;
  return true;
}

/**
 * Bandeau de tête du catalogue : registre discographique, base des déclarations
 * de droits et des liens d'écoute. Les manques (ISRC, audio) sont des blocages
 * réels pour l'artiste, d'où leur mise en avant. Frère jumeau visuel du pipeline
 * de `LiveOverviewPage`.
 */
export function CatalogHeader({
  tracks,
  albums,
  filter,
  onFilterChange,
}: CatalogHeaderProps) {
  const [storageOpen, setStorageOpen] = useState(false);

  const stats = useMemo(() => {
    const statusData = RELEASE_STATUSES.map((s) => ({
      value: s.value,
      label: s.label,
      count: tracks.filter((t) => (t.status ?? "en_production") === s.value)
        .length,
    }));

    let audioFileCount = 0;
    let audioBytes = 0;
    for (const t of tracks) {
      for (const v of versionsWithAudio(t)) {
        audioFileCount += 1;
        audioBytes += v.sizeBytes ?? 0;
      }
    }

    return {
      total: tracks.length,
      releaseCount: albums.length,
      segments: statusData.filter((s) => s.count > 0),
      missingIsrc: tracks.filter((t) => (t.isrc ?? "").trim() === "").length,
      missingAudio: tracks.filter((t) => versionsWithAudio(t).length === 0)
        .length,
      audioFileCount,
      audioBytes,
    };
  }, [tracks, albums]);

  const applyFilter = (next: CatalogFilter) => {
    onFilterChange(filterEq(filter, next) ? { kind: "none" } : next);
  };

  return (
    <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-[#F5F5F5]">Catalogue</h2>
          <p className="text-xs text-[#F5F5F5]/45">
            Répartition de tes titres par statut
          </p>
        </div>
        <div className="text-right leading-tight">
          <span className="block text-[28px] font-extralight leading-none tabular-nums text-[#F5F5F5]">
            {stats.total}
          </span>
          <span className="text-[11px] text-[#F5F5F5]/45">
            {stats.total > 1 ? "titres" : "titre"} · {stats.releaseCount}{" "}
            {stats.releaseCount > 1 ? "releases" : "release"}
          </span>
        </div>
      </div>

      {stats.segments.length > 0 ? (
        <>
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            {stats.segments.map((s) => {
              const active =
                filter.kind === "status" && filter.status === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${s.label} : ${s.count}`}
                  onClick={() =>
                    applyFilter({ kind: "status", status: s.value })
                  }
                  className={cn(
                    "h-full rounded-full transition-all",
                    active && "ring-1 ring-[#F0FF00]"
                  )}
                  style={{
                    flexGrow: s.count,
                    minWidth: 14,
                    background: RELEASE_STATUS_COLOR[s.value],
                  }}
                />
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {stats.segments.map((s) => {
              const active =
                filter.kind === "status" && filter.status === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    applyFilter({ kind: "status", status: s.value })
                  }
                  className={cn(
                    "group flex items-center gap-2 rounded-md px-1.5 py-1 transition-opacity hover:opacity-80",
                    active && "ring-1 ring-[#F0FF00]"
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: RELEASE_STATUS_COLOR[s.value] }}
                  />
                  <span className="text-sm tabular-nums text-[#F5F5F5]">
                    {s.count}
                  </span>
                  <span className="text-sm text-[#F5F5F5]/55 group-hover:text-[#F5F5F5]/80">
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-sm text-[#F5F5F5]/45">
          Aucun titre dans le catalogue pour l&apos;instant.
        </p>
      )}

      {(stats.missingIsrc > 0 ||
        stats.missingAudio > 0 ||
        stats.audioFileCount > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[rgba(245,245,245,0.08)] pt-4">
          {stats.missingIsrc > 0 && (
            <button
              type="button"
              aria-pressed={filter.kind === "missing-isrc"}
              onClick={() => applyFilter({ kind: "missing-isrc" })}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm transition-opacity hover:opacity-80",
                filter.kind === "missing-isrc" && "ring-1 ring-[#F0FF00]"
              )}
              style={{ color: "#F59E0B" }}
            >
              <AlertTriangle size={12} />
              <span className="tabular-nums">
                {stats.missingIsrc} sans ISRC
              </span>
            </button>
          )}

          {stats.missingAudio > 0 && (
            <button
              type="button"
              aria-pressed={filter.kind === "missing-audio"}
              onClick={() => applyFilter({ kind: "missing-audio" })}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm transition-opacity hover:opacity-80",
                filter.kind === "missing-audio" && "ring-1 ring-[#F0FF00]"
              )}
              style={{ color: "#F59E0B" }}
            >
              <AlertTriangle size={12} />
              <span className="tabular-nums">
                {stats.missingAudio} sans audio
              </span>
            </button>
          )}

          {stats.audioFileCount > 0 && (
            <button
              type="button"
              aria-expanded={storageOpen}
              onClick={() => setStorageOpen((o) => !o)}
              className="ml-auto flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-[#F5F5F5]/70 transition-opacity hover:opacity-80"
            >
              <Music size={12} />
              <span className="tabular-nums">
                {formatBytes(stats.audioBytes)} · {stats.audioFileCount}{" "}
                {stats.audioFileCount > 1 ? "fichiers" : "fichier"}
              </span>
              <ChevronDown
                size={14}
                className={cn(
                  "transition-transform",
                  storageOpen && "rotate-180"
                )}
              />
            </button>
          )}
        </div>
      )}

      {storageOpen && (
        <div className="mt-4 border-t border-[rgba(245,245,245,0.08)] pt-4">
          <StorageSummary tracks={tracks} />
        </div>
      )}
    </div>
  );
}
