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
import type { Track, TrackVersion } from "@/lib/sidekick-store";
import { audioFormatsHint } from "@/modules/phono/lib/audio-limits";
import { handleDetachedAudio } from "@/modules/phono/lib/audio-cleanup";
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
  | { kind: "replace"; version: TrackVersion; mode: "file" | "drive" }
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
  const [deleteFromDrive, setDeleteFromDrive] = useState(false);
  /**
   * Remplacement confirmé, en cours sur une version — une seule à la fois.
   * Séparé du `confirm` ci-dessus : celui-ci ferme dès la confirmation, alors
   * que le remplacement dure jusqu'au choix effectif d'un nouveau fichier.
   * `oldAudioPath`/`deleteFromDrive` sont capturés ici parce que la version en
   * état React aura déjà son nouveau `audioPath` au moment où le remplacement
   * se termine (`onReplacingDone`) — l'ancien chemin serait sinon perdu.
   */
  const [replacing, setReplacing] = useState<
    {
      versionId: string;
      mode: "file" | "drive";
      oldAudioPath?: string;
      deleteFromDrive: boolean;
    } | null
  >(null);
  const versions = track.versions ?? [];
  /**
   * La note n'apparaît qu'avec l'astérisque qui l'appelle, c'est-à-dire avec un
   * bouton « Ajouter un fichier audio » à l'écran. Le remplacement d'un fichier
   * existant n'affiche donc pas d'astérisque (voir `showFormatsMark` dans
   * `VersionRow`) : les deux marques apparaissent et disparaissent ensemble.
   */
  const showAudioHint = versions.some((v) => !v.audioPath);

  const openConfirm = (next: Confirm) => {
    setDeleteFromDrive(false);
    setConfirm(next);
  };

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
    if (confirm.version.audioSource === "upload") {
      void handleDetachedAudio([confirm.version.audioPath], deleteFromDrive);
    }
    setConfirm(null);
  };

  const confirmDelete = () => {
    if (confirm?.kind !== "delete") return;
    onRemoveVersion(confirm.version.id);
    if (confirm.version.audioSource === "upload") {
      void handleDetachedAudio([confirm.version.audioPath], deleteFromDrive);
    }
    setConfirm(null);
  };

  const confirmReplace = () => {
    if (confirm?.kind !== "replace") return;
    setReplacing({
      versionId: confirm.version.id,
      mode: confirm.mode,
      oldAudioPath:
        confirm.version.audioSource === "upload" ? confirm.version.audioPath : undefined,
      deleteFromDrive,
    });
    setConfirm(null);
  };

  // `Confirm`'s three non-null variants all carry `version` — no need to
  // check `kind` here, just that `confirm` isn't null (narrows it for the
  // `.version` access below, which `confirm?.kind === "x" && confirm.version`
  // would NOT do, since equality on an optional chain doesn't narrow `confirm`
  // itself).
  const showDriveCheckbox = confirm !== null && confirm.version.audioSource === "upload";

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
            replacing={
              replacing?.versionId === version.id ? replacing.mode : null
            }
            onPatchVersion={onPatchVersion}
            onExportMetadata={onExportMetadata}
            onRequestDetach={(v) => openConfirm({ kind: "detach", version: v })}
            onRequestDelete={(v) => openConfirm({ kind: "delete", version: v })}
            onRequestReplace={(mode) =>
              openConfirm({ kind: "replace", version, mode })
            }
            onReplacingDone={() => {
              if (replacing?.versionId === version.id && replacing.oldAudioPath) {
                void handleDetachedAudio([replacing.oldAudioPath], replacing.deleteFromDrive);
              }
              setReplacing(null);
            }}
          />
        ))
      )}

      <div className="flex items-end justify-between gap-4 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-[#F5F5F5]/60 hover:text-[#F0FF00]"
          onClick={onAddVersion}
        >
          + Ajouter une version
        </Button>

        {/*
          Note de bas de carte, appelée par l'astérisque du bouton d'ajout.
        */}
        {showAudioHint ? (
          <p className="shrink-0 pb-1 text-right text-[10px] leading-tight text-[#F5F5F5]/30">
            <span aria-hidden className="mr-0.5">
              *
            </span>
            {audioFormatsHint()}
          </p>
        ) : null}
      </div>

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
                  Les liens d&apos;écoute qui l&apos;utilisent déjà continuent
                  de fonctionner.
                </DialogDescription>
              </DialogHeader>
              {showDriveCheckbox ? (
                <div className="flex items-start gap-2 rounded-md border border-[rgba(245,245,245,0.12)] p-3">
                  <Checkbox
                    id="detach-from-drive"
                    checked={deleteFromDrive}
                    onCheckedChange={(checked) => setDeleteFromDrive(checked === true)}
                  />
                  <Label
                    htmlFor="detach-from-drive"
                    className="cursor-pointer text-xs font-normal text-[#F5F5F5]/70"
                  >
                    Supprimer aussi le fichier du Drive. Sans cette case, il
                    est conservé dans Drive → Phono → depuis-catalogue.
                  </Label>
                </div>
              ) : null}
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
                    ? "Cette version et sa référence au fichier audio disparaissent du titre."
                    : "Cette version disparaît du titre."}
                </DialogDescription>
              </DialogHeader>
              {showDriveCheckbox ? (
                <div className="flex items-start gap-2 rounded-md border border-[rgba(245,245,245,0.12)] p-3">
                  <Checkbox
                    id="delete-version-from-drive"
                    checked={deleteFromDrive}
                    onCheckedChange={(checked) => setDeleteFromDrive(checked === true)}
                  />
                  <Label
                    htmlFor="delete-version-from-drive"
                    className="cursor-pointer text-xs font-normal text-[#F5F5F5]/70"
                  >
                    Supprimer aussi le fichier du Drive. Sans cette case, il
                    est conservé dans Drive → Phono → depuis-catalogue.
                  </Label>
                </div>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
                  Annuler
                </Button>
                <Button type="button" variant="destructive" onClick={confirmDelete}>
                  Supprimer
                </Button>
              </DialogFooter>
            </>
          ) : confirm?.kind === "replace" ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Remplacer le fichier de « {confirm.version.label} » ?
                </DialogTitle>
                <DialogDescription className="text-sm text-[#F5F5F5]/70">
                  Le fichier actuel sera détaché de cette version dès que tu en
                  choisiras un nouveau. Les liens d&apos;écoute qui l&apos;utilisent
                  déjà continuent de fonctionner.
                </DialogDescription>
              </DialogHeader>
              {showDriveCheckbox ? (
                <div className="flex items-start gap-2 rounded-md border border-[rgba(245,245,245,0.12)] p-3">
                  <Checkbox
                    id="replace-from-drive"
                    checked={deleteFromDrive}
                    onCheckedChange={(checked) => setDeleteFromDrive(checked === true)}
                  />
                  <Label
                    htmlFor="replace-from-drive"
                    className="cursor-pointer text-xs font-normal text-[#F5F5F5]/70"
                  >
                    Supprimer aussi l&apos;ancien fichier du Drive une fois le
                    nouveau choisi. Sans cette case, il est conservé dans Drive
                    → Phono → depuis-catalogue.
                  </Label>
                </div>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
                  Annuler
                </Button>
                <Button type="button" onClick={confirmReplace}>
                  Continuer
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
