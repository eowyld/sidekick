"use client";

import { useState } from "react";
import { HardDrive, Music, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { computeAudioPeaks, formatDuration } from "@/lib/audio-peaks";
import { getUserStorageUsed, uploadDriveFileToPath } from "@/lib/drive-db";
import { createClient, getSessionUser } from "@/lib/supabase";
import {
  AUDIO_ACCEPT,
  MAX_AUDIO_BYTES,
  audioUploadError,
} from "@/modules/phono/lib/audio-limits";
import type { AudioAttachment } from "@/lib/sidekick-store";
import type { DriveAudioUsage } from "@/modules/phono/lib/audio-usage";
import { cn, focusRing } from "@/lib/utils";
import { DrivePickerDialog } from "./DrivePickerDialog";

/**
 * Forme des deux entrées d'attachement. Sans bordure, ce n'étaient que deux
 * bouts de texte gris séparés par un point médian : rien n'indiquait qu'on
 * pouvait cliquer, et le survol ne répondait pas.
 */
export const ATTACH_BUTTON = cn(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]",
  "border-[rgba(245,245,245,0.12)] text-[#F5F5F5]/60 transition-colors duration-150",
  "hover:border-[#F0FF00]/40 hover:bg-[#F0FF00]/10 hover:text-[#F0FF00]",
  focusRing
);

interface AudioAttachFieldProps {
  attachment: AudioAttachment;
  onChange: (patch: Partial<AudioAttachment>) => void;
  /**
   * Ouvre d'emblée le sélecteur de fichiers du Drive. Lu une seule fois, au
   * montage : c'est ce qui permet à l'entrée « Choisir dans le Drive » du menu
   * d'une version d'aller droit au but, au lieu de rouvrir un formulaire où
   * l'utilisateur devrait choisir une seconde fois.
   */
  autoOpen?: "drive";
  /**
   * Affiche l'astérisque qui renvoie à la note de formats en pied de carte.
   * Faux pendant un remplacement : la note, elle, n'est affichée que s'il reste
   * une version sans fichier, et un astérisque sans sa note ne renvoie à rien.
   */
  showFormatsMark?: boolean;
  /**
   * Nom donné au fichier téléversé, sans extension (ex. « Artiste - Titre
   * (Radio edit) »). Absent ou vide : le nom du fichier d'origine est gardé.
   * Sans effet sur un fichier rattaché depuis le Drive, qui garde son nom.
   */
  fileBaseName?: string;
  /**
   * Relevé des fichiers déjà rattachés ailleurs dans le catalogue, transmis
   * tel quel au sélecteur du Drive. Opaque ici : ce composant ne connaît que
   * `AudioAttachment` et n'a pas à savoir ce qu'est une version ou un mix.
   */
  usage?: DriveAudioUsage;
  /**
   * Fichier à retirer du relevé. Par défaut celui déjà rattaché. À préciser
   * quand l'appelant présente une pièce jointe vidée de sa référence — c'est
   * le cas d'un remplacement dans `VersionRow`, où le fichier en place n'est
   * plus dans `attachment` mais n'a pas à s'annoncer « déjà relié ».
   */
  excludePath?: string;
}

/** Assemble « Artiste - Titre (Version) » en ignorant les parties vides. */
export function catalogFileBaseName(artist?: string, title?: string, version?: string): string {
  const main = [artist?.trim(), title?.trim()].filter(Boolean).join(" - ");
  const label = version?.trim();
  return label ? `${main} (${label})`.trim() : main;
}

/**
 * Renomme le fichier choisi. Les accents sont retirés : `uploadDriveFileToPath`
 * ne garde que l'ASCII dans les chemins, un « é » y deviendrait un tiret.
 */
function renameFile(file: File, baseName: string | undefined): File {
  const base = baseName?.normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  if (!base) return file;
  const dot = file.name.lastIndexOf(".");
  const ext = dot > 0 ? file.name.slice(dot) : "";
  return new File([file], `${base}${ext}`, { type: file.type, lastModified: file.lastModified });
}

/** Étape en cours, pour distinguer analyse et envoi dans le libellé. */
type Phase =
  | { kind: "idle" }
  | { kind: "analyzing" }
  | { kind: "uploading"; progress: number }
  | { kind: "fetching" };

/**
 * Égaliseur d'attente : quatre barres décalées dans le temps.
 *
 * Le décalage est réparti pour que le motif ne se referme jamais sur lui-même —
 * quatre barres en phase donneraient un clignotement, pas un signal.
 */
function AudioScanner() {
  return (
    <span
      aria-hidden
      className="flex h-3.5 w-4 shrink-0 items-center justify-between"
    >
      {[0, 140, 280, 420].map((delay) => (
        <span
          key={delay}
          className="audio-scan-bar block h-full w-[2px] rounded-full bg-[#F0FF00]"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

/**
 * Rattache un fichier audio à une entité du catalogue.
 *
 * Ne connaît que `AudioAttachment` : il sert donc indifféremment une version de
 * titre et un mix, sans rien savoir de l'un ni de l'autre. La logique d'upload
 * et de calcul des peaks n'existe qu'une fois.
 *
 * Deux chemins d'attachement :
 * - upload d'un fichier local (consomme du quota, soumis aux plafonds) ;
 * - référence à un fichier déjà présent dans le Drive (aucun octet transféré,
 *   donc aucun quota consommé).
 */
export function AudioAttachField({
  attachment,
  onChange,
  autoOpen,
  showFormatsMark = true,
  fileBaseName,
  usage,
  excludePath,
}: AudioAttachFieldProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(autoOpen === "drive");

  const busy = phase.kind !== "idle";

  async function attach(file: File) {
    setError(null);
    setPhase({ kind: "analyzing" });
    try {
      const supabase = createClient();
      const { data: auth } = await getSessionUser(supabase);
      const userId = auth.user?.id;
      if (!userId) throw new Error("Session expirée, reconnectez-vous.");

      // Contrôle des plafonds avant tout décodage : décoder un WAV de 200 Mo
      // pour le refuser ensuite fige le navigateur pour rien.
      const used = await getUserStorageUsed(supabase, userId);
      const limitError = audioUploadError(file.size, used);
      if (limitError) {
        setError(limitError);
        setPhase({ kind: "idle" });
        return;
      }

      const { peaks, durationMs } = await computeAudioPeaks(file);

      setPhase({ kind: "uploading", progress: 0 });
      const upload = (f: File) =>
        uploadDriveFileToPath(supabase, userId, f, "Phono/Catalogue", {
          // Le plafond audio prime sur celui des fichiers Drive génériques :
          // sans lui, `uploadDriveFileToPath` refuserait à 50 Mo un fichier
          // déjà accepté par `audioUploadError`.
          maxBytes: MAX_AUDIO_BYTES,
          onProgress: (progress) =>
            setPhase({
              kind: "uploading",
              progress: Math.max(0, Math.min(100, Math.round(progress))),
            }),
        });

      const named = renameFile(file, fileBaseName);
      let path: string;
      try {
        ({ path } = await upload(named));
      } catch (e) {
        // Nom déjà pris : cas normal d'un remplacement, l'ancien fichier n'est
        // traité qu'une fois le nouveau rattaché. Un seul nouvel essai, avec un
        // suffixe qui ne peut pas entrer en collision une seconde fois.
        const message = e instanceof Error ? e.message : String(e);
        if (!/already exists|duplicate/i.test(message) || named === file) throw e;
        ({ path } = await upload(renameFile(file, `${fileBaseName}-${Date.now()}`)));
      }

      onChange({
        audioPath: path,
        audioSource: "upload",
        audioName: named.name,
        durationMs,
        sizeBytes: file.size,
        peaks,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPhase({ kind: "idle" });
    }
  }

  /**
   * Rattache un fichier déjà stocké dans le Drive.
   *
   * On ne ré-uploade rien : on télécharge le fichier via une URL signée
   * uniquement pour en calculer les peaks et la durée, puis on ne stocke
   * qu'une référence. Le quota de stockage n'est donc pas incrémenté.
   */
  async function attachFromDrive(picked: {
    path: string;
    name: string;
    sizeBytes: number;
  }) {
    setError(null);
    setPhase({ kind: "fetching" });
    try {
      const res = await fetch("/api/phono/signed-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioPath: picked.path }),
      });
      if (!res.ok) {
        throw new Error("Impossible d'accéder à ce fichier du Drive.");
      }
      const { url } = (await res.json()) as { url?: string };
      if (!url) throw new Error("Impossible d'accéder à ce fichier du Drive.");

      const fileRes = await fetch(url);
      if (!fileRes.ok) {
        throw new Error("Le téléchargement du fichier a échoué.");
      }
      const blob = await fileRes.blob();

      setPhase({ kind: "analyzing" });
      const { peaks, durationMs } = await computeAudioPeaks(
        new File([blob], picked.name)
      );

      onChange({
        audioPath: picked.path,
        audioSource: "drive",
        audioName: picked.name,
        durationMs,
        sizeBytes: picked.sizeBytes,
        peaks,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPhase({ kind: "idle" });
    }
  }

  function detach() {
    // On ne retire ici que la référence, jamais le fichier : rien n'est encore
    // enregistré tant que le dialogue n'est pas validé, et un fichier du Drive
    // n'appartient pas au catalogue. Le fichier téléversé devenu orphelin est
    // ramassé après coup par `pruneOrphanAudio`, qui vérifie d'abord qu'aucun
    // lien d'écoute publié ne le sert encore.
    onChange({
      audioPath: undefined,
      audioSource: undefined,
      audioName: undefined,
      durationMs: undefined,
      sizeBytes: undefined,
      peaks: undefined,
    });
  }

  const busyLabel =
    phase.kind === "uploading"
      ? `Envoi… ${phase.progress} %`
      : phase.kind === "fetching"
        ? "Récupération du fichier…"
        : "Analyse de la forme d'onde…";

  return (
    <div className="pl-1">
      <div className="flex items-center gap-2">
        {attachment.audioPath ? (
          <>
            <Music className="h-4 w-4 shrink-0" style={{ color: "#F0FF00" }} />
            <span
              className="truncate text-xs"
              style={{ color: "rgba(245,245,245,0.7)" }}
            >
              {attachment.audioName} · {formatDuration(attachment.durationMs ?? 0)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 shrink-0 px-1"
              onClick={detach}
              aria-label="Retirer le fichier audio"
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : busy ? (
          <span
            aria-live="polite"
            className="inline-flex items-center gap-2 text-[11px] text-[#F5F5F5]/70"
          >
            <AudioScanner />
            {busyLabel}
          </span>
        ) : (
          <>
            {/*
              L'astérisque renvoie à la note en pied de carte : annoncer les
              formats acceptés dans le bouton lui-même l'allongerait sur chaque
              version, alors que la contrainte est la même pour toutes.
            */}
            <label className={cn(ATTACH_BUTTON, "cursor-pointer")}>
              <Upload className="h-3 w-3 shrink-0" />
              Ajouter un fichier audio
              {showFormatsMark ? (
                <span aria-hidden className="opacity-60">
                  *
                </span>
              ) : null}
              <input
                type="file"
                accept={AUDIO_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void attach(file);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              className={ATTACH_BUTTON}
              onClick={() => setPickerOpen(true)}
            >
              <HardDrive className="h-3 w-3 shrink-0" />
              Choisir dans le Drive
            </button>
          </>
        )}
      </div>

      {phase.kind === "uploading" && (
        <Progress
          value={phase.progress}
          className="mt-1 h-0.5 bg-[rgba(245,245,245,0.12)] [&>div]:bg-[#F0FF00]"
        />
      )}

      {error && (
        <p className="mt-1 text-xs" style={{ color: "#ff6b6b" }}>
          {error}
        </p>
      )}

      {/* Monté seulement à l'ouverture : useDriveData charge tout le Drive. */}
      {pickerOpen && (
        <DrivePickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onPick={(file) => void attachFromDrive(file)}
          usage={usage}
          excludePath={excludePath ?? attachment.audioPath}
        />
      )}
    </div>
  );
}
