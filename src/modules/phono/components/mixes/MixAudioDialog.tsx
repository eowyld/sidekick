"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

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
import type { AudioAttachment, Mix } from "@/lib/sidekick-store";
import { audioFormatsHint } from "@/modules/phono/lib/audio-limits";
import { handleDetachedAudio } from "@/modules/phono/lib/audio-cleanup";
import { useDriveAudioUsage } from "@/modules/phono/lib/audio-usage";
import {
  clampTracklistToDuration,
  itemsBeyondDuration,
  lastPlayableSecond,
} from "@/modules/phono/lib/mix";
import { AudioAttachField, catalogFileBaseName } from "../audio/AudioAttachField";

interface MixAudioDialogProps {
  /** `null` = fermé. Toujours l'exemplaire à jour du catalogue, jamais une copie. */
  mix: Mix | null;
  onOpenChange: (open: boolean) => void;
  /** Écrit sur le mix, tout de suite : il n'y a pas de brouillon ici. */
  onPatch: (patch: Partial<Mix>) => void;
}

/**
 * Rattacher, remplacer ou détacher le fichier d'un mix **depuis le catalogue**.
 *
 * Même geste que sur une version de titre, où le fichier se change sans ouvrir
 * la page d'édition : déposer un enregistrement est une action de tous les
 * jours, ouvrir un formulaire complet pour ça est une étape de trop.
 *
 * Les écritures partent immédiatement, sans « Enregistrer » : le fichier
 * appartient au mix, et l'écrire tout de suite supprime la fenêtre pendant
 * laquelle `pruneOrphanAudio` pourrait le prendre pour un reliquat.
 */
export function MixAudioDialog({ mix, onOpenChange, onPatch }: MixAudioDialogProps) {
  const usage = useDriveAudioUsage();
  /**
   * Remplacement en cours : le champ repart vide pour choisir le nouveau
   * fichier, l'ancien restant rattaché jusqu'à ce qu'il arrive. Sans cet état,
   * « remplacer » obligeait à détacher d'abord — donc à répondre à la question
   * « supprimer aussi du Drive ? » avant même de savoir par quoi remplacer.
   */
  const [replacing, setReplacing] = useState(false);
  const [pendingDetach, setPendingDetach] = useState<{
    path: string;
    patch: Partial<AudioAttachment>;
  } | null>(null);
  const [deleteFromDrive, setDeleteFromDrive] = useState(false);

  const attachment: AudioAttachment = {
    audioPath: mix?.audioPath,
    audioSource: mix?.audioSource,
    audioName: mix?.audioName,
    durationMs: mix?.durationMs,
    sizeBytes: mix?.sizeBytes,
    peaks: mix?.peaks,
  };

  // Un fichier plus court que la tracklist déjà saisie laisse des timecodes
  // dans le vide : même signalement et même rattrapage que sur la page du mix.
  const maxSeconds = lastPlayableSecond(mix?.durationMs);
  const beyond = itemsBeyondDuration(mix?.tracklist ?? [], maxSeconds);
  const limit =
    maxSeconds === null
      ? ""
      : `${Math.floor(maxSeconds / 60)}:${String(maxSeconds % 60).padStart(2, "0")}`;

  const handleChange = (patch: Partial<AudioAttachment>) => {
    if (!mix) return;
    const clearing = Boolean(mix.audioPath) && patch.audioPath === undefined;
    if (clearing && mix.audioSource === "upload" && mix.audioPath) {
      setDeleteFromDrive(false);
      setPendingDetach({ path: mix.audioPath, patch });
      return;
    }
    onPatch(patch);
  };

  const close = (open: boolean) => {
    if (!open) setReplacing(false);
    onOpenChange(open);
  };

  const attached = Boolean(mix?.audioPath);

  return (
    <>
      <Dialog open={mix !== null && pendingDetach === null} onOpenChange={close}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Fichier audio — {mix?.title || "Sans titre"}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#F5F5F5]/70">
              Le fichier est rattaché au mix dès qu&apos;il est déposé, sans
              passer par la page d&apos;édition.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-1">
            {attached && !replacing ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReplacing(true)}
                >
                  Remplacer par un autre fichier
                </Button>
              </div>
            ) : null}
            <AudioAttachField
              // En remplacement, le champ repart de zéro : il propose de
              // téléverser ou de piocher dans le Drive, et le fichier choisi
              // prend la place de l'ancien d'un seul geste.
              attachment={replacing ? {} : attachment}
              onChange={(patch) => {
                setReplacing(false);
                handleChange(patch);
              }}
              showFormatsMark={false}
              fileBaseName={catalogFileBaseName(mix?.artists, mix?.title)}
              usage={usage}
              excludePath={mix?.audioPath}
            />
            <p className="text-[10px] leading-tight text-[#F5F5F5]/30">
              {audioFormatsHint()}.
            </p>
          </div>

          {beyond.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2">
              <p className="flex items-center gap-2 text-xs text-[#F59E0B]">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {beyond.length} timecode{beyond.length > 1 ? "s" : ""} de la
                tracklist dépasse{beyond.length > 1 ? "nt" : ""} la fin de ce
                fichier ({limit}).
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onPatch({
                    tracklist: clampTracklistToDuration(
                      mix?.tracklist ?? [],
                      maxSeconds
                    ),
                  })
                }
              >
                Ramener à {limit}
              </Button>
            </div>
          )}

          <DialogFooter>
            {replacing ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setReplacing(false)}
              >
                Garder le fichier actuel
              </Button>
            ) : null}
            <Button type="button" onClick={() => close(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDetach !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDetach(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Détacher l&apos;audio de ce mix ?</DialogTitle>
            <DialogDescription className="text-sm text-[#F5F5F5]/70">
              Le fichier ne sera plus rattaché à ce mix.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 rounded-md border border-[rgba(245,245,245,0.12)] p-3">
            <Checkbox
              id="mix-catalog-detach-from-drive"
              checked={deleteFromDrive}
              onCheckedChange={(checked) => setDeleteFromDrive(checked === true)}
            />
            <Label
              htmlFor="mix-catalog-detach-from-drive"
              className="cursor-pointer text-xs font-normal text-[#F5F5F5]/70"
            >
              Supprimer aussi le fichier du Drive. Sans cette case, il reste
              dans Drive → Phono → Catalogue.
            </Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDetach(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!pendingDetach) return;
                onPatch(pendingDetach.patch);
                void handleDetachedAudio([pendingDetach.path], deleteFromDrive);
                setPendingDetach(null);
              }}
            >
              Détacher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
