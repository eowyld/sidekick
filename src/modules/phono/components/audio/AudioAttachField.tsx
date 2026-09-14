"use client";

import { useState } from "react";
import { HardDrive, Music, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { computeAudioPeaks, formatDuration } from "@/lib/audio-peaks";
import { getUserStorageUsed, uploadDriveFileToPath } from "@/lib/drive-db";
import { createClient } from "@/lib/supabase";
import { MAX_AUDIO_BYTES, audioUploadError } from "@/modules/phono/lib/audio-limits";
import type { TrackVersion } from "@/lib/sidekick-store";
import { DrivePickerDialog } from "./DrivePickerDialog";

interface VersionAudioFieldProps {
  version: TrackVersion;
  onChange: (patch: Partial<TrackVersion>) => void;
  /**
   * Ouvre d'emblée le sélecteur de fichiers du Drive. Lu une seule fois, au
   * montage : c'est ce qui permet à l'entrée « Choisir dans le Drive » du menu
   * d'une version d'aller droit au but, au lieu de rouvrir un formulaire où
   * l'utilisateur devrait choisir une seconde fois.
   */
  autoOpen?: "drive";
}

/** Étape en cours, pour distinguer analyse et envoi dans le libellé. */
type Phase =
  | { kind: "idle" }
  | { kind: "analyzing" }
  | { kind: "uploading"; progress: number }
  | { kind: "fetching" };

/**
 * Rattache un fichier audio à une version de titre.
 *
 * Composant partagé par le formulaire de création et l'édition inline du
 * catalogue : la logique d'upload et de calcul des peaks n'existe qu'une fois.
 *
 * Deux chemins d'attachement :
 * - upload d'un fichier local (consomme du quota, soumis aux plafonds) ;
 * - référence à un fichier déjà présent dans le Drive (aucun octet transféré,
 *   donc aucun quota consommé).
 */
export function VersionAudioField({
  version,
  onChange,
  autoOpen,
}: VersionAudioFieldProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(autoOpen === "drive");

  const busy = phase.kind !== "idle";

  async function attach(file: File) {
    setError(null);
    setPhase({ kind: "analyzing" });
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
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
      const { path } = await uploadDriveFileToPath(
        supabase,
        userId,
        file,
        "phono/audio",
        {
          // Le plafond audio prime sur celui des fichiers Drive génériques :
          // sans lui, `uploadDriveFileToPath` refuserait à 50 Mo un fichier
          // déjà accepté par `audioUploadError`.
          maxBytes: MAX_AUDIO_BYTES,
          onProgress: (progress) =>
            setPhase({
              kind: "uploading",
              progress: Math.max(0, Math.min(100, Math.round(progress))),
            }),
        }
      );

      onChange({
        audioPath: path,
        audioSource: "upload",
        audioName: file.name,
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
    // On retire seulement la référence : le fichier reste dans le Drive, où
    // l'artiste le supprimera s'il le souhaite. Le supprimer ici casserait les
    // liens d'écoute qui l'ont déjà dénormalisé.
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
        : "Analyse du fichier…";

  return (
    <div className="pl-1">
      <div className="flex items-center gap-2">
        {version.audioPath ? (
          <>
            <Music className="h-4 w-4 shrink-0" style={{ color: "#F0FF00" }} />
            <span
              className="truncate text-xs"
              style={{ color: "rgba(245,245,245,0.7)" }}
            >
              {version.audioName} · {formatDuration(version.durationMs ?? 0)}
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
            className="inline-flex items-center gap-1.5 text-xs"
            style={{ color: "rgba(245,245,245,0.7)" }}
          >
            <Upload className="h-3 w-3" />
            {busyLabel}
          </span>
        ) : (
          <>
            <label
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs"
              style={{ color: "rgba(245,245,245,0.7)" }}
            >
              <Upload className="h-3 w-3" />
              Ajouter un fichier audio
              <input
                type="file"
                accept="audio/*,.wav,.aiff,.aif,.flac"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void attach(file);
                  e.target.value = "";
                }}
              />
            </label>
            <span style={{ color: "rgba(245,245,245,0.3)" }}>·</span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs"
              style={{ color: "rgba(245,245,245,0.7)" }}
              onClick={() => setPickerOpen(true)}
            >
              <HardDrive className="h-3 w-3" />
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
        />
      )}
    </div>
  );
}
