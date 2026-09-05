"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Folder, Loader2, Music, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDriveData } from "@/hooks/useDriveData";
import { formatBytes } from "@/modules/phono/lib/audio-limits";
import { cn } from "@/lib/utils";

/** Extensions considérées comme audio dans le sélecteur. */
const AUDIO_EXTENSIONS = [
  ".wav",
  ".aiff",
  ".aif",
  ".flac",
  ".mp3",
  ".m4a",
  ".aac",
  ".ogg",
];

function isAudioFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export interface DrivePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé avec le fichier choisi dans le Drive. */
  onPick: (file: { path: string; name: string; sizeBytes: number }) => void;
}

/**
 * Sélecteur de fichier audio déjà présent dans le Drive.
 *
 * Aucun octet n'est transféré ici : on ne renvoie qu'une référence (`path`)
 * vers un objet du bucket privé, que la version du titre dénormalise ensuite.
 */
export function DrivePickerDialog({
  open,
  onOpenChange,
  onPick,
}: DrivePickerDialogProps) {
  const { userId, storageContents, isLoadingContents, loadStorageContents } =
    useDriveData();

  // Chemin courant, relatif à la racine de l'utilisateur ("" = racine).
  const [subPath, setSubPath] = useState("");
  const [search, setSearch] = useState("");

  const currentPath = useMemo(
    () => (userId ? [userId, subPath].filter(Boolean).join("/") : null),
    [userId, subPath]
  );

  useEffect(() => {
    if (!open) return;
    if (!currentPath) return;
    void loadStorageContents(currentPath);
  }, [open, currentPath, loadStorageContents]);

  // La navigation repart toujours de la racine : le composant est monté à
  // l'ouverture et démonté à la fermeture, l'état initial suffit.

  const crumbs = useMemo(() => subPath.split("/").filter(Boolean), [subPath]);

  const folders = storageContents?.folders ?? [];

  const audioFiles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (storageContents?.files ?? [])
      .filter((file) => isAudioFileName(file.name))
      .filter((file) => !term || file.name.toLowerCase().includes(term));
  }, [storageContents?.files, search]);

  const enterFolder = useCallback(
    (folderName: string) => {
      setSearch("");
      setSubPath((prev) => [prev, folderName].filter(Boolean).join("/"));
    },
    []
  );

  const goToCrumb = useCallback((index: number) => {
    setSearch("");
    setSubPath((prev) =>
      prev
        .split("/")
        .filter(Boolean)
        .slice(0, index + 1)
        .join("/")
    );
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Choisir dans le Drive</DialogTitle>
          <DialogDescription>
            Sélectionnez un fichier audio déjà stocké dans votre Drive.
          </DialogDescription>
        </DialogHeader>

        {/* Fil d'Ariane */}
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSubPath("");
            }}
            className="rounded px-1 py-0.5 transition-colors hover:underline"
            style={{ color: subPath ? "rgba(245,245,245,0.7)" : "#F0FF00" }}
          >
            Drive
          </button>
          {crumbs.map((crumb, index) => (
            <span key={`${crumb}-${index}`} className="flex items-center gap-1">
              <ChevronRight
                className="h-3 w-3 shrink-0"
                style={{ color: "rgba(245,245,245,0.4)" }}
              />
              <button
                type="button"
                onClick={() => goToCrumb(index)}
                className="rounded px-1 py-0.5 transition-colors hover:underline"
                style={{
                  color:
                    index === crumbs.length - 1
                      ? "#F0FF00"
                      : "rgba(245,245,245,0.7)",
                }}
              >
                {crumb}
              </button>
            </span>
          ))}
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "rgba(245,245,245,0.5)" }}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un fichier…"
            className="pl-8"
          />
        </div>

        <div
          className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-1"
          style={{ borderColor: "rgba(245,245,245,0.12)" }}
        >
          {isLoadingContents ? (
            <div
              className="flex items-center gap-2 px-2 py-6 text-xs"
              style={{ color: "rgba(245,245,245,0.7)" }}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement du dossier…
            </div>
          ) : (
            <>
              {folders.map((folder) => (
                <button
                  key={folder.path}
                  type="button"
                  onClick={() => enterFolder(folder.name)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                    "hover:bg-[rgba(245,245,245,0.06)]"
                  )}
                  style={{ color: "#F5F5F5" }}
                >
                  <Folder
                    className="h-4 w-4 shrink-0"
                    style={{ color: "rgba(245,245,245,0.7)" }}
                  />
                  <span className="truncate">{folder.name}</span>
                  <ChevronRight
                    className="ml-auto h-4 w-4 shrink-0"
                    style={{ color: "rgba(245,245,245,0.4)" }}
                  />
                </button>
              ))}

              {audioFiles.map((file) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => {
                    onPick({
                      path: file.path,
                      name: file.name,
                      sizeBytes: file.sizeBytes,
                    });
                    onOpenChange(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                    "hover:bg-[rgba(245,245,245,0.06)]"
                  )}
                  style={{ color: "#F5F5F5" }}
                >
                  <Music
                    className="h-4 w-4 shrink-0"
                    style={{ color: "#F0FF00" }}
                  />
                  <span className="truncate">{file.name}</span>
                  <span
                    className="ml-auto shrink-0 text-xs"
                    style={{ color: "rgba(245,245,245,0.7)" }}
                  >
                    {formatBytes(file.sizeBytes)}
                  </span>
                </button>
              ))}

              {folders.length === 0 && audioFiles.length === 0 && (
                <p
                  className="px-2 py-6 text-xs"
                  style={{ color: "rgba(245,245,245,0.7)" }}
                >
                  {search.trim()
                    ? "Aucun fichier audio ne correspond à cette recherche."
                    : "Aucun fichier audio dans ce dossier."}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
