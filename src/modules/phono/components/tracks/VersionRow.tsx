"use client";

import { useState } from "react";
import {
  Download,
  HardDrive,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  Tag,
  Trash2,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { formatDuration } from "@/lib/audio-peaks";
import type { Track, TrackVersion } from "@/lib/sidekick-store";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/modules/phono/lib/audio-limits";
import { effectiveIsrc } from "@/modules/phono/lib/track";
import { usePhonoPlayer } from "../audio/PhonoPlayerProvider";
import { VersionAudioField } from "../audio/VersionAudioField";
import { Waveform } from "../listening/Waveform";

const ISRC_INHERITED_TITLE =
  "ISRC hérité du titre : l'ISRC identifie un enregistrement, pas une œuvre. Cette version n'a pas encore le sien.";

/** « master_v3.wav » → « WAV ». Vide si le nom n'a pas d'extension. */
function fileExtension(name: string | undefined): string {
  if (!name) return "";
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return "";
  return name.slice(dot + 1).toUpperCase();
}

/** Champ d'édition d'un seul attribut : Enter valide, Escape annule, blur valide. */
function InlineField({
  value,
  placeholder,
  ariaLabel,
  className,
  onCommit,
  onCancel,
}: {
  value: string;
  placeholder: string;
  ariaLabel: string;
  className?: string;
  onCommit: (next: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <Input
      autoFocus
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={draft}
      className={cn("h-7 px-2 text-xs", className)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft.trim())}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onCommit(draft.trim());
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
    />
  );
}

type EditField = "label" | "isrc" | null;

export function VersionRow({
  track,
  version,
  onPatchVersion,
  onExportMetadata,
  onRequestDetach,
  onRequestDelete,
}: {
  track: Track;
  version: TrackVersion;
  onPatchVersion: (versionId: string, patch: Partial<TrackVersion>) => void;
  onExportMetadata: (versionId: string) => void;
  onRequestDetach: (version: TrackVersion) => void;
  onRequestDelete: (version: TrackVersion) => void;
}) {
  const { current, isPlaying, position, duration, play } = usePhonoPlayer();
  const [editing, setEditing] = useState<EditField>(null);
  /**
   * Réattachement demandé depuis le menu, sur une version qui a déjà un fichier.
   * `"drive"` ouvre directement le sélecteur du Drive, `"file"` laisse le choix :
   * sans cette distinction, les deux entrées du menu seraient indiscernables.
   */
  const [replacing, setReplacing] = useState<"file" | "drive" | null>(null);

  const hasAudio = Boolean(version.audioPath);
  const isCurrent = current?.versionId === version.id;
  const playingHere = isCurrent && isPlaying;
  const progress = isCurrent && duration > 0 ? position / duration : 0;

  const ownIsrc = (version.isrc ?? "").trim();
  const isrc = effectiveIsrc(track, version);
  const ext = fileExtension(version.audioName);

  // Réattachement : `VersionAudioField` n'expose son formulaire que sur une
  // version sans fichier. On lui passe donc la version délestée de sa
  // référence audio — la logique d'upload, de Drive et de peaks reste chez lui.
  const attachTarget: TrackVersion = replacing
    ? {
        ...version,
        audioPath: undefined,
        audioSource: undefined,
        audioName: undefined,
        durationMs: undefined,
        sizeBytes: undefined,
        peaks: undefined,
      }
    : version;

  const commit = (field: Exclude<EditField, null>) => (next: string) => {
    setEditing(null);
    if (field === "label") {
      const label = next || "Sans nom";
      if (label !== version.label) onPatchVersion(version.id, { label });
      return;
    }
    if (next !== ownIsrc) onPatchVersion(version.id, { isrc: next });
  };

  return (
    <div className="flex items-center gap-3 py-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-[#F5F5F5]/50 hover:text-[#F0FF00] disabled:opacity-30"
        disabled={!hasAudio}
        aria-label={playingHere ? "Mettre en pause" : `Écouter ${version.label}`}
        onClick={() => {
          if (!version.audioPath) return;
          play({
            trackId: track.id,
            versionId: version.id,
            title: track.title,
            versionLabel: version.label,
            coverSrc: track.cover,
            audioPath: version.audioPath,
            peaks: version.peaks,
            durationMs: version.durationMs,
          });
        }}
      >
        {playingHere ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </Button>

      {/* Libellé */}
      <div className="w-32 shrink-0">
        {editing === "label" ? (
          <InlineField
            value={version.label}
            placeholder="Nom de la version"
            ariaLabel="Nom de la version"
            onCommit={commit("label")}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <span
            className="block truncate text-xs"
            style={{ color: isCurrent ? "#F0FF00" : "#F5F5F5" }}
            title={version.label}
          >
            {version.label}
          </span>
        )}
      </div>

      {/* Waveform ou attachement */}
      <div className="min-w-0 flex-1">
        {hasAudio && !replacing ? (
          version.peaks && version.peaks.length > 0 ? (
            // Non interactive ici : la recherche se fait dans la barre du bas.
            <div className="pointer-events-none">
              <Waveform peaks={version.peaks} progress={progress} onSeek={() => {}} height={28} />
            </div>
          ) : (
            <span className="text-xs text-[#F5F5F5]/35">Forme d&apos;onde indisponible</span>
          )
        ) : (
          <VersionAudioField
            version={attachTarget}
            autoOpen={replacing === "drive" ? "drive" : undefined}
            onChange={(patch) => {
              setReplacing(null);
              onPatchVersion(version.id, patch);
            }}
          />
        )}
      </div>

      {/* Caractéristiques du fichier */}
      {hasAudio ? (
        <span className="shrink-0 text-xs tabular-nums text-[#F5F5F5]/45">
          {formatDuration(version.durationMs ?? 0)}
          {ext || version.sizeBytes ? " · " : ""}
          {ext}
          {ext && version.sizeBytes ? " " : ""}
          {version.sizeBytes ? formatBytes(version.sizeBytes) : ""}
        </span>
      ) : null}

      {/* ISRC */}
      <div className="w-40 shrink-0 text-right">
        {editing === "isrc" ? (
          <InlineField
            value={ownIsrc}
            placeholder="ISRC de la version"
            ariaLabel="ISRC de la version"
            className="font-mono"
            onCommit={commit("isrc")}
            onCancel={() => setEditing(null)}
          />
        ) : isrc ? (
          <span
            className="font-mono text-xs tabular-nums"
            style={{ color: ownIsrc ? "#F5F5F5" : "rgba(245,245,245,0.35)" }}
            title={ownIsrc ? undefined : ISRC_INHERITED_TITLE}
          >
            {isrc}
          </span>
        ) : (
          <span className="text-xs text-[#F5F5F5]/25">Pas d&apos;ISRC</span>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-[#F5F5F5]/40 hover:text-[#F5F5F5]"
            aria-label={`Actions sur la version ${version.label}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing("label")}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Renommer la version
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditing("isrc")}>
            <Tag className="mr-2 h-3.5 w-3.5" />
            Modifier l&apos;ISRC
          </DropdownMenuItem>
          {hasAudio ? (
            <>
              <DropdownMenuItem onSelect={() => setReplacing("file")}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Remplacer le fichier
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setReplacing("drive")}>
                <HardDrive className="mr-2 h-3.5 w-3.5" />
                Choisir dans le Drive
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuItem onSelect={() => onExportMetadata(version.id)}>
            <Download className="mr-2 h-3.5 w-3.5" />
            Exporter les métadonnées
          </DropdownMenuItem>
          {hasAudio ? (
            <DropdownMenuItem onSelect={() => onRequestDetach(version)}>
              <Unlink className="mr-2 h-3.5 w-3.5" />
              Détacher l&apos;audio
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className="text-red-400"
            onSelect={() => onRequestDelete(version)}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Supprimer la version
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
