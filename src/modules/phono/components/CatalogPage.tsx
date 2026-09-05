"use client";

import { useState } from "react";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useSidekickData } from "@/hooks/useSidekickData";
import { normalizeTrack } from "@/modules/phono/lib/track";
import { normalizeAlbum } from "@/modules/phono/lib/album";
import { AlbumsTab } from "./albums/AlbumsTab";
import { MixesTab } from "./mixes/MixesTab";
import { CatalogHeader, type CatalogFilter } from "./CatalogHeader";
import { PhonoPlayerProvider } from "./audio/PhonoPlayerProvider";
import { AudioPlayerBar } from "./audio/AudioPlayerBar";
import { TracksTab } from "./tracks/TracksTab";
import {
  MetadataExportDialog,
  type MetadataExportTarget,
} from "./metadata/MetadataExportDialog";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { mutate } from "swr";

export function CatalogPage() {
  const {
    tracks: tracksRaw,
    setTracks,
    albums: albumsRaw,
    setAlbums,
    mixes,
    setMixes,
    loading,
    error,
  } = usePhonoData();

  const { data } = useSidekickData();
  const [tab, setTab] = useState<"tracks" | "albums" | "mixes">("tracks");
  const [filter, setFilter] = useState<CatalogFilter>({ kind: "none" });
  const [exportTarget, setExportTarget] = useState<MetadataExportTarget | null>(
    null
  );

  if (loading) return <PageLoader />;
  if (error)
    return (
      <PageError
        title="Impossible de charger ton catalogue"
        description="Vérifie ta connexion ou réessaie dans quelques instants."
        onRetry={() => mutate("user_phono")}
      />
    );

  const tracks = tracksRaw.map(normalizeTrack);
  const albums = albumsRaw.map(normalizeAlbum).sort((a, b) => {
    const order = { album: 0, ep: 1, single: 2 };
    return (order[a.type] ?? 2) - (order[b.type] ?? 2);
  });

  return (
    <PhonoPlayerProvider>
      <div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Catalogue</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Gestion de ton catalogue phono : titres, albums, releases.
        </p>

        <div className="mb-6">
          <CatalogHeader
            tracks={tracks}
            albums={albums}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>

        {/* Onglets */}
        <div className="mb-6 flex gap-1 rounded-lg border border-input bg-muted/30 p-1">
          <button
            type="button"
            onClick={() => setTab("albums")}
            className={
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors " +
              (tab === "albums"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            Albums & EP
          </button>
          <button
            type="button"
            onClick={() => setTab("tracks")}
            className={
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors " +
              (tab === "tracks"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            Tous les titres
          </button>
          <button
            type="button"
            onClick={() => setTab("mixes")}
            className={
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors " +
              (tab === "mixes"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            Mixes
          </button>
        </div>

        {tab === "tracks" && (
          <TracksTab
            tracks={tracks}
            setTracks={setTracks}
            filter={filter}
            onFilterChange={setFilter}
            projects={data.projects?.projects ?? []}
            onExportMetadata={(trackId, versionId) =>
              setExportTarget(
                versionId
                  ? { kind: "version", trackId, versionId }
                  : { kind: "track", trackId }
              )
            }
          />
        )}

        {tab === "albums" && (
          <AlbumsTab
            albums={albums}
            tracks={tracks}
            setAlbums={setAlbums}
            setTracks={setTracks}
            onExportMetadata={(albumId) =>
              setExportTarget({ kind: "album", albumId })
            }
          />
        )}

        {tab === "mixes" && <MixesTab mixes={mixes} setMixes={setMixes} />}

        <MetadataExportDialog
          open={exportTarget !== null}
          onOpenChange={(open) => {
            if (!open) setExportTarget(null);
          }}
          target={exportTarget}
          tracks={tracks}
          albums={albums}
        />

        <AudioPlayerBar />
      </div>
    </PhonoPlayerProvider>
  );
}
