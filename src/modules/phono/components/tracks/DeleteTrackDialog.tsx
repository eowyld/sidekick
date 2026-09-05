"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Track } from "@/lib/sidekick-store";

interface DeleteTrackDialogProps {
  track: Track | null;
  albumCount: number;
  onConfirm: (track: Track) => void;
  onCancel: () => void;
}

export function DeleteTrackDialog({
  track,
  albumCount,
  onConfirm,
  onCancel,
}: DeleteTrackDialogProps) {
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
            Le titre et ses versions sont retirés du catalogue. Les fichiers
            audio restent dans ton Drive.
            {albumCount > 0
              ? ` Ce titre figure dans ${albumCount} album${
                  albumCount > 1 ? "s" : ""
                } et en sera retiré.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => track && onConfirm(track)}
          >
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
