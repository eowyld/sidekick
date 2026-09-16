"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Music } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { NoResult } from "@/components/ui/no-result";
import { usePhonoData } from "@/hooks/usePhonoData";
import type { Track, TrackVersion } from "@/lib/sidekick-store";
import {
  defaultVersion,
  newTrackId,
  newVersionId,
  normalizeTrackGuests,
} from "@/modules/phono/lib/track";
import type { CatalogFilter } from "../CatalogHeader";
import { handleDetachedAudio } from "@/modules/phono/lib/audio-cleanup";
import { DeleteTrackDialog } from "./DeleteTrackDialog";
import { TrackRow } from "./TrackRow";
import { TracksToolbar } from "./TracksToolbar";
import { sortCatalog } from "@/modules/phono/lib/catalog-sort";
import { usePhonoSort } from "../PhonoSortProvider";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");
  // Lecture seule ici : sert à prévenir « figure dans N albums » et à retirer
  // le titre des albums à la suppression. Les onglets Albums restent gérés par
  // CatalogPage jusqu'à la phase 2.
  const { albums, setAlbums } = usePhonoData();

  const { sorts } = usePhonoSort();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Track | null>(null);

  const statusValue = filter.kind === "status" ? filter.status : "all";
  const isrcValue = filter.kind === "missing-isrc" ? "missing" : "all";

  const filtersActive = filter.kind !== "none" || search.trim() !== "";

  const resetFilters = () => {
    setSearch("");
    onFilterChange({ kind: "none" });
  };

  const visible = useMemo(() => {
    const q = strip(search.trim());
    const rows = tracks.filter((t) => {
      const status = t.status ?? "en_production";
      if (statusValue !== "all" && status !== statusValue) return false;

      if (isrcValue === "missing" && (t.isrc ?? "").trim() !== "") return false;

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

    // Même tri que la file du lecteur, à la même fonction : « suivant »
    // enchaîne dans l'ordre affiché ici.
    return sortCatalog(rows, sorts.tracks);
  }, [tracks, search, statusValue, isrcValue, sorts.tracks]);

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

  const confirmDelete = (track: Track, deleteFromDrive: boolean) => {
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

    const uploadedPaths = (track.versions ?? [])
      .filter((v) => v.audioSource === "upload")
      .map((v) => v.audioPath);
    void handleDetachedAudio(uploadedPaths, deleteFromDrive);
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
    const suffix = projectIdParam ? `?projectId=${projectIdParam}` : "";
    router.push(`/phono/catalogue/titre/nouveau${suffix}`);
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
              onEdit={() => router.push(`/phono/catalogue/titre/${track.id}`)}
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

      <DeleteTrackDialog
        track={pendingDelete}
        albumCount={pendingAlbumCount}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
