"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Track } from "@/lib/sidekick-store";
import type { StorageFileEntry } from "@/lib/drive-db";
import { useDriveData } from "@/hooks/useDriveData";
import {
  STORAGE_QUOTA_BYTES,
  formatBytes,
} from "@/modules/phono/lib/audio-limits";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface StorageSummaryProps {
  tracks: Track[];
}

interface AudioRow {
  trackTitle: string;
  versionLabel: string;
  fileName: string;
  sizeBytes: number;
  source: "upload" | "drive" | undefined;
  path: string;
}

/**
 * Détail du stockage audio référencé : total rapporté au quota, tableau des
 * fichiers triés par poids, et fichiers orphelins présents dans le bucket mais
 * qu'aucune version ne référence.
 *
 * Le chemin Storage est composé exactement comme dans `DrivePickerDialog` :
 * `[userId, "phono", "audio"].join("/")`.
 */
export function StorageSummary({ tracks }: StorageSummaryProps) {
  const {
    userId,
    storageContents,
    isLoadingContents,
    loadStorageContents,
    deleteStorageFileAtPath,
  } = useDriveData();

  const storagePath = useMemo(
    () => (userId ? [userId, "phono", "audio"].join("/") : null),
    [userId]
  );

  const attempted = useRef(false);

  useEffect(() => {
    if (!storagePath) return;
    attempted.current = true;
    void loadStorageContents(storagePath);
  }, [storagePath, loadStorageContents]);

  const [pendingDelete, setPendingDelete] = useState<StorageFileEntry | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const audioRows = useMemo<AudioRow[]>(() => {
    const rows: AudioRow[] = [];
    for (const t of tracks) {
      for (const v of t.versions ?? []) {
        if (!v.audioPath) continue;
        rows.push({
          trackTitle: t.title.trim() || "Sans titre",
          versionLabel: v.label.trim() || "—",
          fileName:
            v.audioName?.trim() ||
            v.audioPath.split("/").pop() ||
            v.audioPath,
          sizeBytes: v.sizeBytes ?? 0,
          source: v.audioSource,
          path: v.audioPath,
        });
      }
    }
    return rows.sort((a, b) => b.sizeBytes - a.sizeBytes);
  }, [tracks]);

  const referencedPaths = useMemo(
    () => new Set(audioRows.map((r) => r.path)),
    [audioRows]
  );

  const totalReferenced = useMemo(
    () => audioRows.reduce((sum, r) => sum + r.sizeBytes, 0),
    [audioRows]
  );

  const pct =
    STORAGE_QUOTA_BYTES > 0
      ? Math.min(100, (totalReferenced / STORAGE_QUOTA_BYTES) * 100)
      : 0;
  const over80 = pct > 80;

  const orphans = useMemo(() => {
    const files = storageContents?.files ?? [];
    return files
      .filter((f) => !referencedPaths.has(f.path))
      .sort((a, b) => b.sizeBytes - a.sizeBytes);
  }, [storageContents, referencedPaths]);

  const listingState: "loading" | "error" | "ready" =
    isLoadingContents || !attempted.current
      ? "loading"
      : storageContents === null
        ? "error"
        : "ready";

  const closeDialog = () => {
    setPendingDelete(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteStorageFileAtPath(pendingDelete.path);
      setPendingDelete(null);
      if (storagePath) await loadStorageContents(storagePath);
    } catch {
      setDeleteError("La suppression a échoué. Réessaie dans un instant.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Total référencé ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-[#F5F5F5]/70">Stockage audio référencé</span>
          <span className="tabular-nums text-[#F5F5F5]/70">
            {formatBytes(totalReferenced)} / {formatBytes(STORAGE_QUOTA_BYTES)}
          </span>
        </div>
        <Progress
          value={pct}
          className={cn(over80 && "[&>*]:bg-[#F59E0B]")}
        />
      </div>

      {/* ─── Tableau des fichiers ────────────────────────────────────── */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-[#F5F5F5]/70">
          Fichiers référencés
        </h4>
        {audioRows.length === 0 ? (
          <p className="text-sm text-[#F5F5F5]/45">
            Aucun fichier audio rattaché à un titre.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#F5F5F5]/45">
                  <th className="pb-2 pr-3 font-normal">Titre</th>
                  <th className="pb-2 pr-3 font-normal">Version</th>
                  <th className="pb-2 pr-3 font-normal">Fichier</th>
                  <th className="pb-2 pl-3 text-right font-normal">Taille</th>
                  <th className="pb-2 pl-3 font-normal">Source</th>
                </tr>
              </thead>
              <tbody>
                {audioRows.map((r, i) => (
                  <tr
                    key={`${r.path}-${i}`}
                    className="border-t border-[rgba(245,245,245,0.06)]"
                  >
                    <td className="py-1.5 pr-3 text-[#F5F5F5]">
                      {r.trackTitle}
                    </td>
                    <td className="py-1.5 pr-3 text-[#F5F5F5]/70">
                      {r.versionLabel}
                    </td>
                    <td className="py-1.5 pr-3 text-[#F5F5F5]/70">
                      {r.fileName}
                    </td>
                    <td className="py-1.5 pl-3 text-right tabular-nums text-[#F5F5F5]">
                      {formatBytes(r.sizeBytes)}
                    </td>
                    <td className="py-1.5 pl-3 text-[#F5F5F5]/70">
                      {r.source === "drive" ? "Drive" : "Upload"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Fichiers non rattachés (orphelins) ──────────────────────── */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-[#F5F5F5]/70">
          Fichiers non rattachés
        </h4>

        {listingState === "loading" && (
          <p className="text-sm text-[#F5F5F5]/70">
            Analyse du stockage en cours…
          </p>
        )}

        {listingState === "error" && (
          <p className="text-sm" style={{ color: "#ff6b6b" }}>
            Impossible de lister les fichiers du stockage.
          </p>
        )}

        {listingState === "ready" && orphans.length === 0 && (
          <p className="text-sm text-[#F5F5F5]/45">
            Aucun fichier non rattaché.
          </p>
        )}

        {listingState === "ready" && orphans.length > 0 && (
          <ul className="text-sm">
            {orphans.map((f) => (
              <li
                key={f.path}
                className="flex items-center gap-3 border-t border-[rgba(245,245,245,0.06)] py-1.5"
              >
                <span className="flex-1 truncate text-[#F5F5F5]/80">
                  {f.name}
                </span>
                <span className="shrink-0 tabular-nums text-[#F5F5F5]/60">
                  {formatBytes(f.sizeBytes)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setDeleteError(null);
                    setPendingDelete(f);
                  }}
                  className="shrink-0 text-[#F5F5F5]/50 hover:text-[#ff6b6b]"
                  aria-label={`Supprimer ${f.name}`}
                >
                  <Trash2 size={14} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer ce fichier ?</DialogTitle>
            <DialogDescription>
              {pendingDelete?.name} sera définitivement supprimé du stockage.
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm" style={{ color: "#ff6b6b" }}>
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={closeDialog}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
