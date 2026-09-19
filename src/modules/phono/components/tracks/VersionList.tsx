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
import { cn } from "@/lib/utils";
import { audioFormatsHint } from "@/modules/phono/lib/audio-limits";
import { handleDetachedAudio } from "@/modules/phono/lib/audio-cleanup";
import { useDriveAudioUsage } from "@/modules/phono/lib/audio-usage";
import { VersionRow } from "./VersionRow";

interface VersionListProps {
  track: Track;
  onPatchVersion: (versionId: string, patch: Partial<TrackVersion>) => void;
  onAddVersion: () => void;
  onRemoveVersion: (versionId: string) => void;
  onExportMetadata: (versionId: string) => void;
  /**
   * Versions telles qu'enregistrées en base, avant les modifications en
   * cours dans le formulaire. Absent depuis le catalogue (`TrackRow`) : là,
   * chaque version affichée est déjà enregistrée, il n'y a pas de brouillon à
   * distinguer. Fourni depuis la page de création/édition (`TrackEditForm`,
   * via `TrackEditPage`) : sert à repérer les versions dont le fichier actuel
   * n'existe encore nulle part côté serveur. Détacher ou supprimer l'une
   * d'elles n'a rien à confirmer ni à proposer de garder dans le Drive — rien
   * n'a encore été enregistré, il n'y a qu'un fichier fraîchement uploadé à
   * jeter.
   */
  savedVersions?: TrackVersion[];
  /**
   * Versions retenues sur la sortie en cours d'édition. `undefined` = pas de
   * contexte de sélection (catalogue, page titre) : aucune case n'est rendue.
   */
  selectedVersionIds?: string[];
  onToggleVersion?: (versionId: string, selected: boolean) => void;
  /** Masque l'export de métadonnées, qui vit dans le catalogue. */
  showExport?: boolean;
  /**
   * Retrait du décrochement à gauche (`ml-12` + filet). Utile là où la liste
   * est déjà dans un bloc dédié et n'a rien à quoi se rattacher visuellement.
   */
  flush?: boolean;
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
  savedVersions,
  selectedVersionIds,
  onToggleVersion,
  showExport = true,
  flush = false,
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
   * `track` prime sur sa version en base : sur la page d'édition, les versions
   * du brouillon ne sont pas encore enregistrées, et c'est entre elles que le
   * même fichier risque le plus d'être rattaché deux fois.
   */
  const audioUsage = useDriveAudioUsage(track);
  /**
   * La note n'apparaît qu'avec l'astérisque qui l'appelle, c'est-à-dire avec un
   * bouton « Ajouter un fichier audio » à l'écran. Le remplacement d'un fichier
   * existant n'affiche donc pas d'astérisque (voir `showFormatsMark` dans
   * `VersionRow`) : les deux marques apparaissent et disparaissent ensemble.
   */
  const showAudioHint = versions.some((v) => !v.audioPath);

  /**
   * Une version dont le fichier actuel n'a jamais été enregistré : elle ne
   * figure pas dans `savedVersions`, ou y figure avec un autre `audioPath`
   * (remplacement en cours de saisie). Sans `savedVersions` (catalogue), tout
   * est toujours considéré enregistré.
   */
  const isUnsaved = (version: TrackVersion): boolean => {
    if (!savedVersions) return false;
    const saved = savedVersions.find((v) => v.id === version.id);
    return !saved || saved.audioPath !== version.audioPath;
  };

  const openConfirm = (next: Confirm) => {
    setDeleteFromDrive(false);
    setConfirm(next);
  };

  const doDetach = (version: TrackVersion, deleteFromDriveNow: boolean) => {
    onPatchVersion(version.id, {
      audioPath: undefined,
      audioSource: undefined,
      audioName: undefined,
      durationMs: undefined,
      sizeBytes: undefined,
      peaks: undefined,
    });
    if (version.audioSource === "upload") {
      void handleDetachedAudio([version.audioPath], deleteFromDriveNow);
    }
  };

  const doDelete = (version: TrackVersion, deleteFromDriveNow: boolean) => {
    onRemoveVersion(version.id);
    if (version.audioSource === "upload") {
      void handleDetachedAudio([version.audioPath], deleteFromDriveNow);
    }
  };

  const confirmDetach = () => {
    if (confirm?.kind !== "detach") return;
    doDetach(confirm.version, deleteFromDrive);
    setConfirm(null);
  };

  const confirmDelete = () => {
    if (confirm?.kind !== "delete") return;
    doDelete(confirm.version, deleteFromDrive);
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
    <div
      className={cn(
        "space-y-1.5",
        flush
          ? ""
          : "ml-12 mt-3 border-l border-[rgba(245,245,245,0.08)] pl-4"
      )}
    >
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
            selected={
              selectedVersionIds
                ? selectedVersionIds.includes(version.id)
                : undefined
            }
            onToggleSelected={(next) => onToggleVersion?.(version.id, next)}
            showExport={showExport}
            audioUsage={audioUsage}
            onPatchVersion={onPatchVersion}
            onExportMetadata={onExportMetadata}
            onRequestDetach={(v) =>
              isUnsaved(v) ? doDetach(v, true) : openConfirm({ kind: "detach", version: v })
            }
            onRequestDelete={(v) =>
              isUnsaved(v) ? doDelete(v, true) : openConfirm({ kind: "delete", version: v })
            }
            onRequestReplace={(mode) => {
              if (isUnsaved(version)) {
                // Remplacement direct, sans confirmation : l'ancien fichier
                // (déjà non enregistré) est supprimé du Drive dès que le
                // nouveau est choisi.
                setReplacing({
                  versionId: version.id,
                  mode,
                  oldAudioPath:
                    version.audioSource === "upload" ? version.audioPath : undefined,
                  deleteFromDrive: true,
                });
                return;
              }
              openConfirm({ kind: "replace", version, mode });
            }}
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
                    reste dans Drive → Phono → Catalogue.
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
                    reste dans Drive → Phono → Catalogue.
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
                    nouveau choisi. Sans cette case, il reste dans Drive
                    → Phono → Catalogue.
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
