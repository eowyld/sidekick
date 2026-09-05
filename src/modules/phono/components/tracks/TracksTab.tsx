"use client";

import { useMemo, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { useSearchParams } from "next/navigation";
import { Music } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { NoResult } from "@/components/ui/no-result";
import { toIsoDatePickerValue } from "@/lib/date-format";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useSidekickData } from "@/hooks/useSidekickData";
import type { Track, TrackVersion } from "@/lib/sidekick-store";
import { RELEASE_STATUSES } from "@/modules/phono/lib/release-status";
import {
  defaultVersion,
  newTrackId,
  newVersionId,
  normalizeTrackGuests,
  versionsWithAudio,
} from "@/modules/phono/lib/track";
import type { CatalogFilter } from "../CatalogHeader";
import { DeleteTrackDialog } from "./DeleteTrackDialog";
import { TrackDialog } from "./TrackDialog";
import { TrackRow } from "./TrackRow";
import { TracksToolbar } from "./TracksToolbar";
import {
  effectiveFilterValues,
  type AudioExtra,
  type IsrcExtra,
  type SortKey,
} from "./track-filters";

interface TracksTabProps {
  tracks: Track[];
  setTracks: (fn: (prev: Track[]) => Track[]) => void;
  filter: CatalogFilter;
  onFilterChange: (filter: CatalogFilter) => void;
  /** Projets de l'utilisateur, pour les badges de ligne. */
  projects: Array<{ id: string; title: string; linkedTracks: string[] }>;
  /** Ouvre le dialog d'export de métadonnées. Implémenté en phase 4. */
  onExportMetadata: (trackId: string, versionId?: string) => void;
}

const strip = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function TracksTab({
  tracks,
  setTracks,
  filter,
  onFilterChange,
  projects,
  onExportMetadata,
}: TracksTabProps) {
  const posthog = usePostHog();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  const { setData } = useSidekickData();
  // Lecture seule ici : sert à prévenir « figure dans N albums » et à retirer
  // le titre des albums à la suppression. Les onglets Albums restent gérés par
  // CatalogPage jusqu'à la phase 2.
  const { albums, setAlbums } = usePhonoData();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [audioExtra, setAudioExtra] = useState<AudioExtra>("all");
  const [isrcExtra, setIsrcExtra] = useState<IsrcExtra>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Track | null>(null);

  const {
    status: statusValue,
    audio: audioValue,
    isrc: isrcValue,
  } = effectiveFilterValues(filter, audioExtra, isrcExtra);

  const filtersActive =
    filter.kind !== "none" ||
    audioExtra !== "all" ||
    isrcExtra !== "all" ||
    search.trim() !== "";

  const resetFilters = () => {
    setSearch("");
    setAudioExtra("all");
    setIsrcExtra("all");
    onFilterChange({ kind: "none" });
  };

  const visible = useMemo(() => {
    const q = strip(search.trim());
    const rows = tracks.filter((t) => {
      const status = t.status ?? "en_production";
      if (statusValue !== "all" && status !== statusValue) return false;

      const hasAudio = versionsWithAudio(t).length > 0;
      if (audioValue === "with" && !hasAudio) return false;
      if (audioValue === "without" && hasAudio) return false;

      const hasIsrc = (t.isrc ?? "").trim() !== "";
      if (isrcValue === "present" && !hasIsrc) return false;
      if (isrcValue === "missing" && hasIsrc) return false;

      if (q) {
        const guests = normalizeTrackGuests(t.guestArtists)
          .map((g) => g.name)
          .join(" ");
        const isrcs = [
          t.isrc ?? "",
          ...(t.versions ?? []).map((v) => v.isrc ?? ""),
        ].join(" ");
        const haystack = strip([t.title, t.mainArtist, guests, isrcs].join(" "));
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const rank = (t: Track) =>
      RELEASE_STATUSES.findIndex((s) => s.value === (t.status ?? "en_production"));

    const sorted = [...rows];
    if (sort === "title-asc") {
      sorted.sort((a, b) => (a.title || "").localeCompare(b.title || "", "fr"));
    } else if (sort === "status") {
      sorted.sort((a, b) => rank(a) - rank(b));
    } else if (sort === "date-desc") {
      // Défaut : date de sortie décroissante, titres sans date en fin de liste.
      sorted.sort((a, b) => {
        const da = toIsoDatePickerValue(a.releaseDate || "");
        const db = toIsoDatePickerValue(b.releaseDate || "");
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db.localeCompare(da);
      });
    }
    // "recent" : on garde l'ordre d'arrivée (hook = created_at décroissant).
    return sorted;
  }, [tracks, search, statusValue, audioValue, isrcValue, sort]);

  // ─── Mutations (toujours via setTracks, jamais d'écriture Supabase directe) ──

  const duplicate = (track: Track) => {
    setTracks((prev) => [
      {
        ...track,
        id: newTrackId(),
        title: `${track.title} (copie)`,
        isrc: "",
        versions: (track.versions ?? []).map((v) => ({
          id: newVersionId(),
          label: v.label,
        })),
      },
      ...prev,
    ]);
  };

  const confirmDelete = (track: Track) => {
    setTracks((prev) => prev.filter((t) => t.id !== track.id));
    // Retire le titre des albums qui le référencent (« il en sera retiré »).
    const inAlbums = albums.filter((a) => (a.trackIds ?? []).includes(track.id));
    if (inAlbums.length > 0) {
      setAlbums((prev) =>
        prev.map((a) =>
          (a.trackIds ?? []).includes(track.id)
            ? { ...a, trackIds: a.trackIds.filter((id) => id !== track.id) }
            : a
        )
      );
    }
    if (expandedId === track.id) setExpandedId(null);
    setPendingDelete(null);
  };

  const patchVersion = (
    trackId: string,
    versionId: string,
    patch: Partial<TrackVersion>
  ) => {
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? {
              ...t,
              versions: (t.versions ?? []).map((v) =>
                v.id === versionId ? { ...v, ...patch } : v
              ),
            }
          : t
      )
    );
  };

  const addVersion = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id !== trackId) return t;
        const versions = t.versions ?? [];
        if (versions.length === 0) return { ...t, versions: [defaultVersion()] };
        const taken = new Set(versions.map((v) => v.label.toLowerCase()));
        let n = 2;
        while (taken.has(`version ${n}`)) n += 1;
        return { ...t, versions: [...versions, defaultVersion(`Version ${n}`)] };
      })
    );
  };

  const removeVersion = (trackId: string, versionId: string) => {
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? { ...t, versions: (t.versions ?? []).filter((v) => v.id !== versionId) }
          : t
      )
    );
  };

  const openCreate = () => {
    setEditingTrack(null);
    setDialogOpen(true);
  };

  const handleSubmit = (next: Track) => {
    const isEdit = tracks.some((t) => t.id === next.id);
    setTracks((prev) =>
      isEdit ? prev.map((t) => (t.id === next.id ? next : t)) : [next, ...prev]
    );
    if (isEdit) return;

    posthog?.capture("item_created", { module: "phono" });
    if (projectIdParam) {
      setData((prev) => ({
        ...prev,
        projects: {
          projects: prev.projects.projects.map((p) =>
            p.id === projectIdParam
              ? {
                  ...p,
                  linkedTracks: [...new Set([...p.linkedTracks, next.id])],
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        },
      }));
    }
  };

  const pendingAlbumCount = pendingDelete
    ? albums.filter((a) => (a.trackIds ?? []).includes(pendingDelete.id)).length
    : 0;

  return (
    <div className="space-y-4">
      <TracksToolbar
        filter={filter}
        onFilterChange={onFilterChange}
        search={search}
        onSearch={setSearch}
        sort={sort}
        onSort={setSort}
        audioExtra={audioExtra}
        setAudioExtra={setAudioExtra}
        isrcExtra={isrcExtra}
        setIsrcExtra={setIsrcExtra}
        onCreate={openCreate}
      />

      {tracks.length === 0 ? (
        <EmptyState
          icon={Music}
          title="Aucun titre dans ton catalogue"
          description="Recense tous tes titres : masters, versions instrumentales, remixes, featurings. Tu pourras ensuite les rattacher à un album ou EP."
          action={{ label: "Ajouter un titre", onClick: openCreate }}
        />
      ) : visible.length === 0 ? (
        <NoResult
          query={search.trim() || undefined}
          hasFilters={filtersActive}
          onReset={resetFilters}
        />
      ) : (
        <div className="space-y-2">
          {visible.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              expanded={expandedId === track.id}
              onToggleExpand={() =>
                setExpandedId((cur) => (cur === track.id ? null : track.id))
              }
              onEdit={() => {
                setEditingTrack(track);
                setDialogOpen(true);
              }}
              onDuplicate={() => duplicate(track)}
              onDelete={() => setPendingDelete(track)}
              onExportMetadata={(versionId) => onExportMetadata(track.id, versionId)}
              onPatchVersion={(versionId, patch) =>
                patchVersion(track.id, versionId, patch)
              }
              onAddVersion={() => addVersion(track.id)}
              onRemoveVersion={(versionId) => removeVersion(track.id, versionId)}
              projects={projects
                .filter((p) => p.linkedTracks.includes(track.id))
                .map((p) => ({ id: p.id, title: p.title }))}
            />
          ))}
        </div>
      )}

      <TrackDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTrack(null);
        }}
        track={editingTrack}
        onSubmit={handleSubmit}
      />

      <DeleteTrackDialog
        track={pendingDelete}
        albumCount={pendingAlbumCount}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
