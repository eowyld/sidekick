"use client";

import { useEffect, useRef } from "react";
import {
  Music,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatDuration } from "@/lib/audio-peaks";
import { cn, focusRing } from "@/lib/utils";
import { Waveform } from "@/modules/phono/components/listening/Waveform";
import { usePhonoPlayer } from "./PhonoPlayerProvider";

/**
 * Cible de 36 px pour une icône de 16 : en dessous, viser « précédent » sans
 * toucher « lecture » demande de la précision, et rien ne justifie de la
 * demander sur une barre qu'on manipule au fil de l'écoute.
 */
const ICON_BUTTON = cn(
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
  "text-[#F5F5F5]/55 transition-colors hover:text-[#F5F5F5] disabled:opacity-25",
  focusRing
);

/**
 * Barre de lecture persistante, montée dans le layout de l'app.
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
    queue,
    toggle,
    seek,
    setVolume,
    next,
    previous,
  } = usePhonoPlayer();

  /**
   * Niveau à rétablir après une coupure.
   *
   * Remettre le son au maximum, comme le faisait le bouton, transforme un
   * geste anodin en sursaut : on coupe à 30 %, on rétablit, on prend 100 %
   * dans le casque.
   */
  const lastAudibleVolume = useRef(1);
  useEffect(() => {
    if (volume > 0) lastAudibleVolume.current = volume;
  }, [volume]);

  const toggleMute = () =>
    setVolume(volume > 0 ? 0 : lastAudibleVolume.current || 1);

  // Rien d'écoutable dans le catalogue : une barre vide n'apprendrait rien et
  // mangerait de la hauteur sur toutes les pages du site.
  if (!current || queue.length === 0) return null;

  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const alone = queue.length < 2;

  return (
    <div
      className={cn(
        "sticky bottom-0 z-30 -mx-6 mt-6 border-t border-[rgba(245,245,245,0.12)] bg-[rgba(16,16,16,0.92)] px-6 py-3 backdrop-blur-xl",
        "relative",
        isPlaying && "shadow-[0_-1px_20px_rgba(240,255,0,0.12)]"
      )}
    >
      {isPlaying ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F0FF00]/60 to-transparent"
        />
      ) : null}
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

        <div className="w-32 min-w-0 shrink-0 lg:w-48">
          <p className="truncate text-[13px] font-medium text-foreground">
            {current.title}
          </p>
          {/*
            Situer ce qui joue : la même version atteinte par son titre ou par
            un album donne le même son, mais pas le même contexte de parcours —
            « suivant » n'ira pas au même endroit.
          */}
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/55">
            {current.origin === "album" && current.originLabel
              ? `${current.originLabel} · ${current.versionLabel}`
              : current.versionLabel}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={previous}
            disabled={alone}
            aria-label="Morceau précédent"
            className={ICON_BUTTON}
          >
            <SkipBack className="h-4 w-4 fill-current" />
          </button>

          <button
            type="button"
            onClick={toggle}
            aria-label={isPlaying ? "Mettre en pause" : "Lire"}
            style={{ borderRadius: "9999px" }}
            className="btn-glow flex h-9 w-9 shrink-0 items-center justify-center bg-[#F0FF00] text-[#101010] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F0FF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010]"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </button>

          <button
            type="button"
            onClick={next}
            disabled={alone}
            aria-label="Morceau suivant"
            className={ICON_BUTTON}
          >
            <SkipForward className="h-4 w-4 fill-current" />
          </button>
        </div>

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

        <span className="hidden shrink-0 text-[11px] tabular-nums text-[#F5F5F5]/70 sm:inline">
          {formatDuration(position * 1000)} / {formatDuration(duration * 1000)}
        </span>

        {/*
          Volume masqué sous 1024 px : la rangée ne tient pas, et c'est la
          commande dont on se passe le mieux — le clavier et les touches média
          de la machine font le même travail.
        */}
        <div className="hidden shrink-0 items-center gap-1 lg:flex">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={volume > 0 ? "Couper le son" : "Rétablir le son"}
            className={ICON_BUTTON}
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
            className={cn(
              "h-1 w-20 cursor-pointer appearance-none rounded-full bg-[rgba(245,245,245,0.2)] accent-[#F0FF00]",
              focusRing
            )}
          />
        </div>
      </div>
    </div>
  );
}
