"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Track } from "@/lib/sidekick-store";

interface DeleteTrackDialogProps {
  track: Track | null;
  albumCount: number;
  onConfirm: (track: Track, deleteFromDrive: boolean) => void;
  onCancel: () => void;
}

export function DeleteTrackDialog({
  track,
  albumCount,
  onConfirm,
  onCancel,
}: DeleteTrackDialogProps) {
  const [deleteFromDrive, setDeleteFromDrive] = useState(false);

  // Repart de zéro à chaque nouvelle piste proposée à la suppression : la case
  // ne doit jamais hériter du choix fait pour une suppression précédente.
  const session = track?.id ?? null;
  const [lastSession, setLastSession] = useState(session);
  if (lastSession !== session) {
    setLastSession(session);
    setDeleteFromDrive(false);
  }

  const hasUploadedAudio = (track?.versions ?? []).some(
    (v) => v.audioPath && v.audioSource === "upload"
  );

  return (
    <Dialog
      open={track !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Supprimer « {track?.title || "Sans titre"} » ?
          </DialogTitle>
          <DialogDescription className="text-sm text-[#F5F5F5]/70">
            Le titre et ses versions sont retirés du catalogue.
            {albumCount > 0
              ? ` Ce titre figure dans ${albumCount} album${
                  albumCount > 1 ? "s" : ""
                } et en sera retiré.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {hasUploadedAudio ? (
          <div className="flex items-start gap-2 rounded-md border border-[rgba(245,245,245,0.12)] p-3">
            <Checkbox
              id="delete-track-from-drive"
              checked={deleteFromDrive}
              onCheckedChange={(checked) => setDeleteFromDrive(checked === true)}
            />
            <Label
              htmlFor="delete-track-from-drive"
              className="cursor-pointer text-xs font-normal text-[#F5F5F5]/70"
            >
              Supprimer aussi le ou les fichiers du Drive. Sans cette case, ils
              restent dans Drive → Phono → Catalogue.
            </Label>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => track && onConfirm(track, deleteFromDrive)}
          >
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
