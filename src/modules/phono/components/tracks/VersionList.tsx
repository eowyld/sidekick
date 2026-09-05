"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Track, TrackVersion } from "@/lib/sidekick-store";
import { VersionRow } from "./VersionRow";

interface VersionListProps {
  track: Track;
  onPatchVersion: (versionId: string, patch: Partial<TrackVersion>) => void;
  onAddVersion: () => void;
  onRemoveVersion: (versionId: string) => void;
  onExportMetadata: (versionId: string) => void;
}

type Confirm =
  | { kind: "detach"; version: TrackVersion }
  | { kind: "delete"; version: TrackVersion }
  | null;

/**
 * Versions d'un titre, dépliées sous sa ligne. Lecture d'abord : les seules
 * saisies possibles sont le renommage et l'ISRC, sur un champ à la fois.
 */
export function VersionList({
  track,
  onPatchVersion,
  onAddVersion,
  onRemoveVersion,
  onExportMetadata,
}: VersionListProps) {
  const [confirm, setConfirm] = useState<Confirm>(null);
  const versions = track.versions ?? [];

  const confirmDetach = () => {
    if (confirm?.kind !== "detach") return;
    onPatchVersion(confirm.version.id, {
      audioPath: undefined,
      audioSource: undefined,
      audioName: undefined,
      durationMs: undefined,
      sizeBytes: undefined,
      peaks: undefined,
    });
    setConfirm(null);
  };

  const confirmDelete = () => {
    if (confirm?.kind !== "delete") return;
    onRemoveVersion(confirm.version.id);
    setConfirm(null);
  };

  return (
    <div className="ml-12 mt-3 space-y-1.5 border-l border-[rgba(245,245,245,0.08)] pl-4">
      {versions.length === 0 ? (
        <p className="text-xs text-[#F5F5F5]/45">
          Aucune version pour l&apos;instant. Ajoute-en une pour y rattacher un
          fichier audio.
        </p>
      ) : (
        versions.map((version) => (
          <VersionRow
            key={version.id}
            track={track}
            version={version}
            onPatchVersion={onPatchVersion}
            onExportMetadata={onExportMetadata}
            onRequestDetach={(v) => setConfirm({ kind: "detach", version: v })}
            onRequestDelete={(v) => setConfirm({ kind: "delete", version: v })}
          />
        ))
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-xs text-[#F5F5F5]/60 hover:text-[#F0FF00]"
        onClick={onAddVersion}
      >
        + Ajouter une version
      </Button>

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <DialogContent className="max-w-md">
          {confirm?.kind === "detach" ? (
            <>
              <DialogHeader>
                <DialogTitle>Détacher l&apos;audio de « {confirm.version.label} » ?</DialogTitle>
                <DialogDescription className="text-sm text-[#F5F5F5]/70">
                  Le fichier reste dans ton Drive. Les liens d&apos;écoute qui
                  l&apos;utilisent déjà continuent de fonctionner.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
                  Annuler
                </Button>
                <Button type="button" variant="destructive" onClick={confirmDetach}>
                  Détacher
                </Button>
              </DialogFooter>
            </>
          ) : confirm?.kind === "delete" ? (
            <>
              <DialogHeader>
                <DialogTitle>Supprimer la version « {confirm.version.label} » ?</DialogTitle>
                <DialogDescription className="text-sm text-[#F5F5F5]/70">
                  {confirm.version.audioPath
                    ? "Cette version et sa référence au fichier audio disparaissent du titre. Le fichier lui-même reste dans ton Drive."
                    : "Cette version disparaît du titre."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
                  Annuler
                </Button>
                <Button type="button" variant="destructive" onClick={confirmDelete}>
                  Supprimer
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
