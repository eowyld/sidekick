"use client";

import {
  forwardRef,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import {
  Download,
  HardDrive,
  MoreHorizontal,
  Pause,
  Play,
  RefreshCw,
  Tag,
  Trash2,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { formatDuration } from "@/lib/audio-peaks";
import type { Track, TrackVersion } from "@/lib/sidekick-store";
import { cn, focusRing } from "@/lib/utils";
import { formatBytes } from "@/modules/phono/lib/audio-limits";
import { effectiveIsrc } from "@/modules/phono/lib/track";
import { trackQueueItem } from "@/modules/phono/lib/player-queue";
import { usePhonoPlayer } from "../audio/PhonoPlayerProvider";
import { ATTACH_BUTTON, AudioAttachField, catalogFileBaseName } from "../audio/AudioAttachField";
import type { DriveAudioUsage } from "@/modules/phono/lib/audio-usage";
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
const InlineField = forwardRef<
  HTMLInputElement,
  {
    value: string;
    placeholder: string;
    ariaLabel: string;
    className?: string;
    /**
     * `bare` : pas de boîte visible (bordure/fond transparents, juste un
     * liseré au focus) et mêmes dimensions que le texte affiché — même
     * principe que l'édition des tags dans l'export de métadonnées, pour
     * qu'ouvrir le champ ne redimensionne pas la ligne.
     */
    variant?: "boxed" | "bare";
    onCommit: (next: string) => void;
    onCancel: () => void;
  }
>(function InlineField(
  { value, placeholder, ariaLabel, className, variant = "boxed", onCommit, onCancel },
  ref
) {
  const [draft, setDraft] = useState(value);
  const commonProps = {
    ref,
    autoFocus: true,
    "aria-label": ariaLabel,
    placeholder,
    value: draft,
    onChange: (e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value),
    onBlur: () => onCommit(draft.trim()),
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onCommit(draft.trim());
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
  };

  if (variant === "bare") {
    return (
      <input
        {...commonProps}
        className={cn(
          "w-full min-w-0 border-b border-transparent bg-transparent text-right outline-none placeholder:text-[#F5F5F5]/25 focus:border-[#F0FF00]/40",
          className
        )}
      />
    );
  }

  return <Input {...commonProps} className={cn("h-7 px-2 text-xs", className)} />;
});

type EditField = "label" | "isrc" | null;

export function VersionRow({
  track,
  version,
  replacing,
  onPatchVersion,
  onExportMetadata,
  onRequestDetach,
  onRequestDelete,
  onRequestReplace,
  onReplacingDone,
  selected,
  onToggleSelected,
  showExport = true,
  audioUsage,
}: {
  track: Track;
  version: TrackVersion;
  /** Remplacement en cours, confirmé par le dialogue tenu par `VersionList`. */
  replacing: "file" | "drive" | null;
  onPatchVersion: (versionId: string, patch: Partial<TrackVersion>) => void;
  onExportMetadata: (versionId: string) => void;
  onRequestDetach: (version: TrackVersion) => void;
  onRequestDelete: (version: TrackVersion) => void;
  onRequestReplace: (mode: "file" | "drive") => void;
  onReplacingDone: () => void;
  /**
   * Version retenue sur la sortie en cours d'édition. `undefined` = on n'est
   * pas dans un contexte de sélection (catalogue, page titre) et aucune case
   * n'est rendue.
   */
  selected?: boolean;
  onToggleSelected?: (selected: boolean) => void;
  /**
   * L'export de métadonnées vit dans le catalogue, sur un titre déjà
   * enregistré : les pages d'édition le masquent plutôt que d'afficher un
   * bouton sans effet.
   */
  showExport?: boolean;
  /**
   * Relevé des fichiers déjà rattachés ailleurs dans le catalogue, construit
   * une fois par `VersionList` et passé au sélecteur du Drive.
   */
  audioUsage?: DriveAudioUsage;
}) {
  const { current, isPlaying, position, duration, play, seek } =
    usePhonoPlayer();
  const [editing, setEditing] = useState<EditField>(null);
  const isrcFieldRef = useRef<HTMLInputElement>(null);

  const hasAudio = Boolean(version.audioPath);
  // Le fichier reste techniquement rattaché tant qu'aucun nouveau n'est
  // choisi, mais la ligne est visuellement en train de le remplacer — durée,
  // taille et export ne doivent pas laisser croire qu'on peut encore agir
  // sur l'ancien fichier depuis cet état transitoire.
  const showsCurrentAudio = hasAudio && !replacing;
  // `audioPath` en plus de l'id, pour la même raison que dans le lecteur : une
  // id de version dupliquée ne doit pas allumer cette ligne ni y afficher une
  // pause pendant qu'un autre fichier joue.
  const isCurrent =
    current?.versionId === version.id && current.audioPath === version.audioPath;
  const playingHere = isCurrent && isPlaying;
  const progress = isCurrent && duration > 0 ? position / duration : 0;

  const ownIsrc = (version.isrc ?? "").trim();
  const isrc = effectiveIsrc(track, version);
  const ext = fileExtension(version.audioName);

  // Réattachement : `AudioAttachField` n'expose son formulaire que sur une
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

  /** Lance cette version dans le lecteur global. Sans effet si elle n'a pas de fichier. */
  const startPlayback = () => {
    const item = trackQueueItem(track, version);
    if (item) play(item);
  };

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
    <div
      className={cn(
        "flex items-center gap-3 border-l-2 border-transparent py-1 pl-2 transition-colors",
        isCurrent && "border-[#F0FF00]"
      )}
    >
      {selected !== undefined ? (
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onToggleSelected?.(checked === true)}
          aria-label={`Inclure « ${version.label} » sur cette sortie`}
          title={
            selected
              ? `« ${version.label} » est sur la sortie`
              : `Ajouter « ${version.label} » à la sortie`
          }
          className="shrink-0"
        />
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-[#F5F5F5]/50 hover:text-[#F0FF00] disabled:opacity-30"
        disabled={!hasAudio}
        aria-label={playingHere ? "Mettre en pause" : `Écouter ${version.label}`}
        onClick={startPlayback}
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
          /*
            Le libellé est lui-même le champ : renommer une version est l'édition
            la plus courante du catalogue, la faire passer par un menu déroulant
            coûtait deux clics pour changer un mot.
          */
          <button
            type="button"
            onClick={() => setEditing("label")}
            title={`${version.label} — cliquer pour renommer`}
            className={cn(
              "block w-full truncate rounded px-1 py-0.5 text-left text-[12px] font-medium",
              "transition-colors hover:bg-[rgba(245,245,245,0.06)]",
              focusRing
            )}
            style={{ color: isCurrent ? "#F0FF00" : "#F5F5F5" }}
          >
            {version.label}
          </button>
        )}
      </div>

      {/* Waveform ou attachement */}
      <div className="min-w-0 flex-1">
        {showsCurrentAudio ? (
          version.peaks && version.peaks.length > 0 ? (
            /*
              Cliquer dans la forme d'onde déplace la lecture. Sur une version
              qui n'est pas celle en cours, il n'y a pas encore de position à
              déplacer : le clic la lance, et le point visé est ignoré plutôt
              que mémorisé pour après le chargement — un saut différé donnerait
              l'impression d'un démarrage raté.
            */
            <div
              title={
                isCurrent
                  ? "Cliquer pour se déplacer dans le morceau"
                  : `Écouter ${version.label}`
              }
            >
              <Waveform
                peaks={version.peaks}
                progress={progress}
                onSeek={(ratio) => {
                  if (!isCurrent) {
                    startPlayback();
                    return;
                  }
                  if (duration > 0) seek(ratio * duration);
                }}
                height={28}
              />
            </div>
          ) : (
            <span className="text-[11px] text-[#F5F5F5]/35">Forme d&apos;onde indisponible</span>
          )
        ) : (
          <AudioAttachField
            attachment={attachTarget}
            autoOpen={replacing === "drive" ? "drive" : undefined}
            showFormatsMark={!replacing}
            fileBaseName={catalogFileBaseName(track.mainArtist, track.title, version.label)}
            usage={audioUsage}
            excludePath={version.audioPath}
            onChange={(patch) => {
              onReplacingDone();
              onPatchVersion(version.id, patch);
            }}
          />
        )}
      </div>

      {/* Caractéristiques du fichier */}
      {showsCurrentAudio ? (
        <span className="shrink-0 text-[11px] tabular-nums text-[#F5F5F5]/45">
          {formatDuration(version.durationMs ?? 0)}
          {ext || version.sizeBytes ? " · " : ""}
          {ext}
          {ext && version.sizeBytes ? " " : ""}
          {version.sizeBytes ? formatBytes(version.sizeBytes) : ""}
        </span>
      ) : null}

      {/*
        Accès direct : l'export de métadonnées est l'action la plus utile une
        fois un fichier attaché, autant l'exposer ici plutôt que la cacher dans
        le menu ⋮ — même module visuel que « Ajouter un fichier audio ». Caché
        pendant un remplacement : le fichier qu'il exporterait est sur le
        point d'être remplacé, pas celui affiché à l'écran.
      */}
      {showsCurrentAudio && showExport ? (
        <button
          type="button"
          className={cn(ATTACH_BUTTON, "shrink-0")}
          onClick={() => onExportMetadata(version.id)}
          aria-label={`Exporter les métadonnées de ${version.label}`}
        >
          <Download className="h-3 w-3 shrink-0" />
          Exporter les métadonnées
        </button>
      ) : null}

      {/*
        ISRC : largeur calée sur les 12 caractères d'un ISRC (police mono),
        pas sur un champ d'édition surdimensionné — cette colonne fixe est
        celle qui grignote le plus l'espace laissé à la waveform.
      */}
      <div className="w-28 shrink-0 text-right">
        {editing === "isrc" ? (
          <InlineField
            ref={isrcFieldRef}
            value={ownIsrc}
            placeholder="ISRC de la version"
            ariaLabel="ISRC de la version"
            variant="bare"
            className="font-mono text-[11px] tabular-nums"
            onCommit={commit("isrc")}
            onCancel={() => setEditing(null)}
          />
        ) : isrc ? (
          <span
            className="font-mono text-[11px] tabular-nums"
            style={{ color: ownIsrc ? "#F5F5F5" : "rgba(245,245,245,0.35)" }}
            title={ownIsrc ? undefined : ISRC_INHERITED_TITLE}
          >
            {isrc}
          </span>
        ) : (
          <span className="text-[11px] text-[#F5F5F5]/25">Pas d&apos;ISRC</span>
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
        <DropdownMenuContent
          align="end"
          // Radix reprend le focus vers le bouton ⋮ à la fermeture du menu —
          // le champ ISRC se monte bien avec `autoFocus`, mais Radix le lui
          // reprend juste après (le curseur ne clignote jamais). On empêche
          // cette reprise et on refocus nous-mêmes le champ, au bon moment.
          onCloseAutoFocus={(e) => {
            if (editing === "isrc") {
              e.preventDefault();
              isrcFieldRef.current?.focus();
            }
          }}
        >
          {/* Pas d'entrée « Renommer » : le libellé s'édite au clic. */}
          <DropdownMenuItem onSelect={() => setEditing("isrc")}>
            <Tag className="mr-2 h-3.5 w-3.5" />
            Modifier l&apos;ISRC
          </DropdownMenuItem>
          {hasAudio ? (
            <>
              <DropdownMenuItem onSelect={() => onRequestReplace("file")}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Remplacer le fichier
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onRequestReplace("drive")}>
                <HardDrive className="mr-2 h-3.5 w-3.5" />
                Choisir dans le Drive
              </DropdownMenuItem>
            </>
          ) : null}
          {!hasAudio && showExport ? (
            <DropdownMenuItem onSelect={() => onExportMetadata(version.id)}>
              <Download className="mr-2 h-3.5 w-3.5" />
              Exporter les métadonnées
            </DropdownMenuItem>
          ) : null}
          {hasAudio ? (
            <DropdownMenuItem onSelect={() => onRequestDetach(version)}>
              <Unlink className="mr-2 h-3.5 w-3.5" />
              Détacher l&apos;audio
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            variant="destructive"
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
