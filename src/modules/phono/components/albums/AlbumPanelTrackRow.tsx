"use client";

import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/audio-peaks";
import type { Album, Track, TrackVersion } from "@/lib/sidekick-store";
import { cn } from "@/lib/utils";
import { albumQueueItem } from "@/modules/phono/lib/player-queue";
import { usePhonoPlayer } from "../audio/PhonoPlayerProvider";
import { Waveform } from "../listening/Waveform";

/**
 * Une piste de la tracklist dépliée : lecture, forme d'onde, durée.
 *
 * Une *piste*, pas un titre — un titre dont l'album retient deux versions
 * occupe deux lignes, comme dans la file du lecteur (voir `albumPieceCount`).
 *
 * En lecture seule, contrairement à `VersionRow` de l'onglet Titres : ni
 * renommage, ni ISRC, ni remplacement de fichier. Tout cela reste sur la page
 * d'édition, accessible depuis l'en-tête du panneau.
 */
export function AlbumPanelTrackRow({
  album,
  track,
  version,
  position,
  showVersionLabel,
}: {
  album: Album;
  track: Track;
  version: TrackVersion;
  /** Rang affiché, 1-indexé. */
  position: number;
  /**
   * Afficher le nom de la version en suffixe du titre. Réservé aux titres dont
   * l'album retient plusieurs versions : ailleurs, « · Original » sur chaque
   * ligne n'apprend rien et charge la liste.
   */
  showVersionLabel: boolean;
}) {
  const { current, isPlaying, position: elapsed, duration, play, toggle, seek } =
    usePhonoPlayer();

  const hasAudio = Boolean(version.audioPath);
  // `audioPath` en plus de l'id, comme dans `VersionRow` : une id de version
  // dupliquée ne doit pas allumer cette ligne pendant qu'un autre fichier joue.
  const isCurrent =
    current?.versionId === version.id && current.audioPath === version.audioPath;
  const playingHere = isCurrent && isPlaying;
  const progress = isCurrent && duration > 0 ? elapsed / duration : 0;

  /**
   * Lance la piste dans le contexte de l'album — « suivant » enchaîne donc sur
   * la piste d'après de cet album. Sur la ligne déjà en cours, bascule plutôt
   * que de relancer depuis zéro : c'est ce qu'on attend d'un bouton qui affiche
   * une pause.
   */
  const handlePlay = () => {
    if (isCurrent) {
      toggle();
      return;
    }
    const item = albumQueueItem(album, track, version);
    if (item) play(item);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-l-2 border-transparent py-2 pl-2.5 pr-1 transition-colors",
        "hover:bg-[rgba(245,245,245,0.03)]",
        isCurrent && "border-[#F0FF00] bg-[rgba(240,255,0,0.04)]"
      )}
    >
      <span
        className="w-5 shrink-0 text-right text-[11px] tabular-nums"
        style={{ color: isCurrent ? "#F0FF00" : "rgba(245,245,245,0.3)" }}
      >
        {position}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-[#F5F5F5]/50 hover:text-[#F0FF00] disabled:opacity-30"
        disabled={!hasAudio}
        aria-label={
          playingHere
            ? `Mettre « ${track.title || "Sans titre"} » en pause`
            : `Écouter « ${track.title || "Sans titre"} »`
        }
        onClick={handlePlay}
      >
        {playingHere ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
      </Button>

      <div className="w-56 shrink-0 truncate">
        <span
          className="text-[13px] font-medium"
          style={{
            color: isCurrent
              ? "#F0FF00"
              : hasAudio
                ? "#F5F5F5"
                : "rgba(245,245,245,0.45)",
          }}
        >
          {track.title || "Sans titre"}
        </span>
        {showVersionLabel ? (
          <span className="ml-2 text-[11px] text-[#F5F5F5]/40">
            {version.label}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        {!hasAudio ? (
          <span className="text-[11px] text-[#F5F5F5]/30">
            Aucun fichier audio
          </span>
        ) : version.peaks && version.peaks.length > 0 ? (
          /*
            Même repli que `VersionRow` : sur une ligne qui n'est pas celle en
            cours, il n'y a pas de position à déplacer — le clic lance la
            lecture et le point visé est ignoré plutôt que mémorisé pour après
            le chargement, un saut différé donnant l'impression d'un démarrage
            raté.
          */
          <div
            title={
              isCurrent
                ? "Cliquer pour se déplacer dans le morceau"
                : `Écouter « ${track.title || "Sans titre"} »`
            }
          >
            <Waveform
              peaks={version.peaks}
              progress={progress}
              onSeek={(ratio) => {
                if (!isCurrent) {
                  const item = albumQueueItem(album, track, version);
                  if (item) play(item);
                  return;
                }
                if (duration > 0) seek(ratio * duration);
              }}
              height={24}
            />
          </div>
        ) : (
          <span className="text-[11px] text-[#F5F5F5]/30">
            Forme d&apos;onde indisponible
          </span>
        )}
      </div>

      <span className="shrink-0 text-[11px] tabular-nums text-[#F5F5F5]/45">
        {version.durationMs ? formatDuration(version.durationMs) : "—"}
      </span>
    </div>
  );
}
