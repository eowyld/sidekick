"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Disc3, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import type { Album, Track } from "@/lib/sidekick-store";
import { albumTracks } from "@/modules/phono/lib/album";
import { sortCatalog } from "@/modules/phono/lib/catalog-sort";
import { CatalogSortMenu } from "../CatalogSortMenu";
import { usePhonoSort } from "../PhonoSortProvider";
import { AlbumCard } from "./AlbumCard";
import { AlbumPanel } from "./AlbumPanel";
import { useAlbumGridColumns } from "./useAlbumGridColumns";

interface AlbumsTabProps {
  albums: Album[];
  tracks: Track[];
  setAlbums: (fn: (prev: Album[]) => Album[]) => void;
  onExportMetadata: (albumId: string) => void;
}

export function AlbumsTab({
  albums,
  tracks,
  setAlbums,
  onExportMetadata,
}: AlbumsTabProps) {
  const router = useRouter();
  const { sorts } = usePhonoSort();
  const [pendingDelete, setPendingDelete] = useState<Album | null>(null);
  /** Album déplié en pleine largeur. Un seul à la fois, volontairement. */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const columns = useAlbumGridColumns();

  // Même fonction de tri que la file du lecteur : parcourir les albums avec les
  // flèches suit l'ordre affiché ici.
  const visible = useMemo(
    () => sortCatalog(albums, sorts.albums),
    [albums, sorts.albums]
  );

  const openCreate = () => router.push("/phono/catalogue/album/nouveau");
  const openEdit = (album: Album) =>
    router.push(`/phono/catalogue/album/${album.id}`);

  const confirmDelete = (album: Album) => {
    setAlbums((prev) => prev.filter((a) => a.id !== album.id));
    if (expandedId === album.id) setExpandedId(null);
    setPendingDelete(null);
  };

  /**
   * Découpage de la liste autour de l'album déplié.
   *
   * Le panneau s'insère à la **frontière de sa ligne** : les albums des lignes
   * précédentes restent au-dessus, ses voisins de ligne repassent en dessous
   * avec la suite. Sans ce calcul, un panneau en `col-span-full` serait
   * repoussé par la grille à la ligne suivante et laisserait un trou à côté de
   * ses voisins.
   *
   * Un `expandedId` qui ne correspond plus à rien (album supprimé ailleurs)
   * vaut « replié » — pas d'état fantôme à nettoyer.
   */
  const expandedIndex = expandedId
    ? visible.findIndex((a) => a.id === expandedId)
    : -1;
  const expanded = expandedIndex >= 0 ? visible[expandedIndex] : null;
  const rowStart = Math.floor(expandedIndex / columns) * columns;
  const before = expanded ? visible.slice(0, rowStart) : visible;
  const after = expanded
    ? visible.slice(rowStart).filter((a) => a.id !== expanded.id)
    : [];

  const renderGrid = (list: Album[]) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((album) => (
        <AlbumCard
          key={album.id}
          album={album}
          trackCount={albumTracks(album, tracks).length}
          onOpen={() => setExpandedId(album.id)}
          onEdit={() => openEdit(album)}
          onDelete={() => setPendingDelete(album)}
          onExportMetadata={() => onExportMetadata(album.id)}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <CatalogSortMenu scope="albums" />
        <Button type="button" onClick={openCreate} className="btn-glow">
          <Plus className="mr-2 h-4 w-4" />
          Album
        </Button>
      </div>

      {albums.length === 0 ? (
        <EmptyState
          icon={Disc3}
          title="Aucun album ni EP"
          description="Regroupe tes titres en albums ou EP pour organiser ton catalogue et préparer tes sorties."
          action={{ label: "Ajouter un album ou EP", onClick: openCreate }}
        />
      ) : (
        <div className="space-y-4">
          {before.length > 0 ? renderGrid(before) : null}

          {expanded ? (
            <AlbumPanel
              key={expanded.id}
              album={expanded}
              tracks={tracks}
              onEdit={() => openEdit(expanded)}
              onDelete={() => setPendingDelete(expanded)}
              onExportMetadata={() => onExportMetadata(expanded.id)}
              onClose={() => setExpandedId(null)}
            />
          ) : null}

          {after.length > 0 ? renderGrid(after) : null}
        </div>
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Supprimer « {pendingDelete?.title || "Sans titre"} » ?
            </DialogTitle>
            <DialogDescription className="text-sm text-[#F5F5F5]/70">
              L&apos;album est retiré du catalogue. Ses titres, eux, restent
              dans le catalogue — un album ne fait que les référencer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => pendingDelete && confirmDelete(pendingDelete)}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
