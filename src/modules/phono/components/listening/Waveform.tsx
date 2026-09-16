"use client";

import { cn, focusRing } from "@/lib/utils";

interface WaveformProps {
  peaks: number[];
  /** Progression de lecture entre 0 et 1. */
  progress: number;
  /** Appelé avec une position entre 0 et 1 quand le visiteur clique. */
  onSeek: (ratio: number) => void;
  height?: number;
}

/**
 * Rendu SVG des peaks pré-calculés. Aucun décodage audio ici : la forme d'onde
 * est disponible instantanément, avant même que le fichier ne soit chargé.
 */
export function Waveform({ peaks, progress, onSeek, height = 56 }: WaveformProps) {
  const count = peaks.length || 1;
  const played = Math.round(progress * count);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.min(1, Math.max(0, ratio)));
  }

  return (
    <div
      className={cn("w-full cursor-pointer select-none rounded-sm", focusRing)}
      onClick={handleClick}
      role="slider"
      aria-label="Position de lecture"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onSeek(Math.min(1, progress + 0.05));
        if (e.key === "ArrowLeft") onSeek(Math.max(0, progress - 0.05));
      }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${count} 100`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {peaks.map((peak, i) => {
          // Hauteur minimale de 4 : un passage silencieux doit rester visible
          // comme partie du morceau, pas comme un trou dans le tracé.
          const barHeight = Math.max(4, peak * 100);
          return (
            <rect
              key={i}
              x={i}
              y={(100 - barHeight) / 2}
              width={0.7}
              height={barHeight}
              fill={i <= played ? "#F0FF00" : "rgba(245,245,245,0.25)"}
            />
          );
        })}
      </svg>
    </div>
  );
}
