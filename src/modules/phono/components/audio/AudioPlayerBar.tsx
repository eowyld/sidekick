"use client";

import { Music, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatDuration } from "@/lib/audio-peaks";
import { Waveform } from "@/modules/phono/components/listening/Waveform";
import { usePhonoPlayer } from "./PhonoPlayerProvider";

/**
 * Barre de lecture persistante du catalogue.
 *
 * `sticky` et non `fixed` : l'état replié de la sidebar est local au composant
 * `Sidebar` et n'est pas remonté dans le layout. Collée en bas du `<main>`,
 * la barre suit la largeur du contenu sans rien savoir de la navigation.
 */
export function AudioPlayerBar() {
  const {
    current,
    isPlaying,
    position,
    duration,
    volume,
    error,
    toggle,
    seek,
    setVolume,
    stop,
  } = usePhonoPlayer();

  if (!current) return null;

  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <div className="sticky bottom-0 z-30 -mx-6 mt-6 border-t border-[rgba(245,245,245,0.12)] bg-[rgba(16,16,16,0.92)] px-6 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        {current.coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.coverSrc}
            alt=""
            className="h-10 w-10 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[rgba(245,245,245,0.06)]">
            <Music className="h-4 w-4" style={{ color: "rgba(245,245,245,0.3)" }} />
          </div>
        )}

        <div className="min-w-0 w-48 shrink-0">
          <p className="truncate text-sm font-medium text-foreground">
            {current.title}
          </p>
          <p className="truncate text-xs text-[rgba(245,245,245,0.7)]">
            {current.versionLabel}
          </p>
        </div>

        <button
          type="button"
          onClick={toggle}
          aria-label={isPlaying ? "Mettre en pause" : "Lire"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0FF00] text-[#101010] transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F0FF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010]"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          {error ? (
            <p className="text-xs" style={{ color: "#ff6b6b" }} role="status">
              {error}
            </p>
          ) : current.peaks && current.peaks.length > 0 ? (
            <Waveform
              peaks={current.peaks}
              progress={progress}
              onSeek={(ratio) => seek(ratio * duration)}
              height={36}
            />
          ) : (
            <Progress value={progress * 100} aria-label="Progression de lecture" />
          )}
        </div>

        <span className="shrink-0 text-xs tabular-nums text-[rgba(245,245,245,0.7)]">
          {formatDuration(position * 1000)} / {formatDuration(duration * 1000)}
        </span>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setVolume(volume > 0 ? 0 : 1)}
            aria-label={volume > 0 ? "Couper le son" : "Rétablir le son"}
            className="text-[rgba(245,245,245,0.7)] transition-colors hover:text-foreground"
          >
            {volume > 0 ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
            className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-[rgba(245,245,245,0.2)] accent-[#F0FF00]"
          />
        </div>

        <button
          type="button"
          onClick={stop}
          aria-label="Fermer le lecteur"
          className="shrink-0 text-[rgba(245,245,245,0.7)] transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
