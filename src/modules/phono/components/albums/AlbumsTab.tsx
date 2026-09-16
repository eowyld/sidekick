"use client";

import { useMemo, useState } from "react";
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
import type { Album, ReleaseStatus, Track } from "@/lib/sidekick-store";
import { albumTracks } from "@/modules/phono/lib/album";
import { isStatusMoreAdvanced } from "@/modules/phono/lib/release-status";
import { normalizeTrack } from "@/modules/phono/lib/track";
import { sortCatalog } from "@/modules/phono/lib/catalog-sort";
import { CatalogSortMenu } from "../CatalogSortMenu";
import { usePhonoSort } from "../PhonoSortProvider";
import { AlbumCard } from "./AlbumCard";
import { AlbumDialog } from "./AlbumDialog";

interface AlbumsTabProps {
  albums: Album[];
  tracks: Track[];
  setAlbums: (fn: (prev: Album[]) => Album[]) => void;
  setTracks: (fn: (prev: Track[]) => Track[]) => void;
  onExportMetadata: (albumId: string) => void;
}

export function AlbumsTab({
  albums,
  tracks,
  setAlbums,
  setTracks,
  onExportMetadata,
}: AlbumsTabProps) {
  const { sorts } = usePhonoSort();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Album | null>(null);

  // Même fonction de tri que la file du lecteur : parcourir les albums avec les
  // flèches suit l'ordre affiché ici.
  const visible = useMemo(
    () => sortCatalog(albums, sorts.albums),
    [albums, sorts.albums]
  );

  const openCreate = () => {
    setEditingAlbum(null);
    setDialogOpen(true);
  };

  const openEdit = (album: Album) => {
    setEditingAlbum(album);
    setDialogOpen(true);
  };

  const submitAlbum = (album: Album, statusChanged: boolean) => {
    setAlbums((prev) => {
      const exists = prev.some((a) => a.id === album.id);
      return exists
        ? prev.map((a) => (a.id === album.id ? album : a))
        : [album, ...prev];
    });

    // Publier un album fait avancer ses titres — mais jamais reculer. Un titre
    // déjà « Publié » ne redevient pas « En production » si l'album change.
    if (statusChanged) {
      setTracks((prev) =>
        prev.map((t) => {
          if (!(album.trackIds ?? []).includes(t.id)) return t;
          const current = (normalizeTrack(t).status ??
            "en_production") as ReleaseStatus;
          return isStatusMoreAdvanced(album.status, current)
            ? { ...normalizeTrack(t), status: album.status }
            : t;
        })
      );
    }
  };

  const confirmDelete = (album: Album) => {
    setAlbums((prev) => prev.filter((a) => a.id !== album.id));
    if (editingAlbum?.id === album.id) {
      setEditingAlbum(null);
      setDialogOpen(false);
    }
    setPendingDelete(null);
  };

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              trackCount={albumTracks(album, tracks).length}
              onEdit={() => openEdit(album)}
              onDelete={() => setPendingDelete(album)}
              onExportMetadata={() => onExportMetadata(album.id)}
            />
          ))}
        </div>
      )}

      <AlbumDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingAlbum(null);
        }}
        album={editingAlbum}
        allTracks={tracks}
        onSubmit={submitAlbum}
      />

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
