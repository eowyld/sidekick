"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useSidekickData } from "@/hooks/useSidekickData";
import { pruneOrphanAudio } from "@/modules/phono/lib/audio-gc";
import { migratePhonoAudioFolder } from "@/lib/migrate-phono-audio-folder";
import { normalizeTrack } from "@/modules/phono/lib/track";
import { normalizeAlbum } from "@/modules/phono/lib/album";
import { AlbumsTab } from "./albums/AlbumsTab";
import { MixesTab } from "./mixes/MixesTab";
import { CatalogHeader, type CatalogFilter } from "./CatalogHeader";
import { TracksTab } from "./tracks/TracksTab";
import {
  MetadataExportDialog,
  type MetadataExportTarget,
} from "./metadata/MetadataExportDialog";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { cn, focusRing } from "@/lib/utils";
import { mutate } from "swr";

type TabKey = "tracks" | "albums" | "mixes";

const TABS: { key: TabKey; label: string }[] = [
  { key: "tracks", label: "Titres" },
  { key: "albums", label: "Albums & EP" },
  { key: "mixes", label: "Mixes" },
];

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
  const [tab, setTab] = useState<TabKey>("tracks");
  const [filter, setFilter] = useState<CatalogFilter>({ kind: "none" });
  const [exportTarget, setExportTarget] = useState<MetadataExportTarget | null>(
    null
  );

  /**
   * Nettoyage des fichiers audio orphelins.
   *
   * Le nombre de références sert de déclencheur : il baisse dès qu'un fichier
   * est détaché, qu'une version, un titre ou un mix est supprimé — c'est-à-dire
   * exactement dans les cas qui peuvent laisser un fichier derrière eux. Un
   * passage a aussi lieu à l'arrivée sur le catalogue, pour rattraper ce qu'un
   * onglet fermé trop tôt aurait laissé. Voir `pruneOrphanAudio`.
   */
  const audioRefCount = useMemo(
    () =>
      tracksRaw.reduce(
        (n, t) => n + (t.versions ?? []).filter((v) => v.audioPath).length,
        0
      ) + mixes.filter((m) => m.audioPath).length,
    [tracksRaw, mixes]
  );
  const previousAudioRefCount = useRef<number | null>(null);
  // Gate le GC ci-dessous tant que la migration de dossier n'a pas fini : si
  // pruneOrphanAudio tournait en parallèle, il pourrait voir un fichier tout
  // juste déplacé vers Phono/Catalogue comme non référencé (la ligne DB
  // pointant encore vers phono/audio) et le supprimer avant que la migration
  // ait rattrapé la référence. Voir migrate-phono-audio-folder.ts.
  const [migrationSettled, setMigrationSettled] = useState(false);

  useEffect(() => {
    void migratePhonoAudioFolder().finally(() => setMigrationSettled(true));
  }, []);

  useEffect(() => {
    if (loading || !migrationSettled) return;
    const previous = previousAudioRefCount.current;
    previousAudioRefCount.current = audioRefCount;
    if (previous === null || audioRefCount < previous) void pruneOrphanAudio();
  }, [loading, migrationSettled, audioRefCount]);

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
  // Plus de regroupement album / EP / single ici : l'ordre d'affichage est
  // désormais celui de `CatalogSortMenu`, dans `AlbumsTab`, pour que la file du
  // lecteur puisse le reproduire depuis n'importe quelle page.
  const albums = albumsRaw.map(normalizeAlbum);

  // Le lecteur (`PhonoPlayerProvider` + `AudioPlayerBar`) est monté dans
  // `app/(app)/layout.tsx` : il doit survivre à la navigation.
  return (
    <div>
      {/*
        En-tête au format des pages abouties du produit — Tâches, Contacts,
        Calendrier posent toutes un eyebrow de module en capitales espacées
        au-dessus d'un titre court et gras. L'ancien `text-2xl font-semibold`
        suivait les pages non refondues.
      */}
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/40">
        Phono
      </p>
      <h1 className="text-xl font-bold tracking-tight text-[#F5F5F5]">
        Catalogue
      </h1>

      <div className="mt-6">
        <CatalogHeader
          tracks={tracks}
          albums={albums}
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>

      {/*
        Onglets au format du sélecteur de vue du Calendrier : bordure fine,
        capitales espacées, actif en jaune translucide. Le compteur évite
        d'ouvrir un onglet pour découvrir qu'il est vide.
      */}
      <div className="mb-5 mt-6 flex flex-wrap items-center gap-2">
        {TABS.map(({ key, label }) => {
          const count =
            key === "tracks"
              ? tracks.length
              : key === "albums"
                ? albums.length
                : mixes.length;
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={active}
              className={cn(
                "rounded border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.06em] transition-colors",
                focusRing,
                active
                  ? "border-[#F0FF00]/50 bg-[#F0FF00]/10 text-[#F0FF00]"
                  : "border-[rgba(245,245,245,0.1)] text-[#F5F5F5]/45 hover:text-[#F5F5F5]/70"
              )}
            >
              {label}
              <span
                className={cn(
                  "ml-2 tabular-nums",
                  active ? "text-[#F0FF00]/60" : "text-[#F5F5F5]/30"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
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
    </div>
  );
}
