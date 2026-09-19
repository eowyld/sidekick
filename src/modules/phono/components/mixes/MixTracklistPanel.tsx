"use client";

import { FileAudio, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Mix } from "@/lib/sidekick-store";
import { cn, focusRingInset } from "@/lib/utils";
import { timecodeToSeconds } from "@/modules/phono/lib/mix";
import { mixQueueItem } from "@/modules/phono/lib/player-queue";
import { usePhonoPlayer } from "../audio/PhonoPlayerProvider";

/** Secondes en `M:SS` ou `H:MM:SS` — le format des tracklists publiées. */
function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

interface MixTracklistPanelProps {
  mix: Mix;
  /** Rattache le fichier sans quitter le catalogue. */
  onAttachAudio: () => void;
}

/**
 * Tracklist d'un mix déplié au catalogue, en lecture seule.
 *
 * C'est le voyage dans le set : cliquer une ligne lance le mix **à son
 * timecode**, qu'il soit déjà en cours ou à l'arrêt. Un long DJ set devient
 * ainsi parcourable sans faire glisser la tête de lecture à l'aveugle.
 *
 * Éditer la tracklist se fait sur la page du mix — ici, rien ne se saisit.
 */
export function MixTracklistPanel({
  mix,
  onAttachAudio,
}: MixTracklistPanelProps) {
  const { playAt, current, position, isPlaying } = usePhonoPlayer();
  const items = mix.tracklist ?? [];
  const item = mixQueueItem(mix);

  if (items.length === 0) {
    return (
      <div className="mt-3 border-t border-[rgba(245,245,245,0.06)] px-2 pt-3">
        <p className="text-xs text-[#F5F5F5]/40">
          Pas de tracklist. Ajoute-la depuis la page du mix pour pouvoir sauter
          d&apos;un titre à l&apos;autre.
        </p>
      </div>
    );
  }

  /**
   * Ligne en cours d'écoute : la dernière dont le timecode est déjà passé.
   *
   * Surligner suppose que le lecteur joue bien *ce* mix — sinon la position
   * lue appartient à un autre fichier et désignerait une ligne au hasard.
   */
  const playingThis = item !== null && current?.versionId === item.versionId;
  let activeIndex = -1;
  if (playingThis) {
    items.forEach((it, i) => {
      const at = timecodeToSeconds(it.time);
      if (at !== null && at <= position + 0.5) activeIndex = i;
    });
  }

  return (
    <div className="mt-3 border-t border-[rgba(245,245,245,0.06)] pt-2">
      {/*
        Aucune indentation : la colonne des timecodes se cale sous le chevron,
        et le titre joué tombe alors exactement sous le titre du mix — les deux
        colonnes de la ligne repliée se prolongent dans le panneau.
      */}
      <ul>
        {items.map((it, index) => {
          const at = timecodeToSeconds(it.time);
          // Sans fichier ou sans timecode lisible, la ligne reste une ligne :
          // un curseur « main » qui ne mène nulle part est pire que rien.
          const seekable = at !== null && item !== null;
          const active = index === activeIndex;

          const content = (
            <>
              <span
                className={cn(
                  "w-12 shrink-0 text-[11px] tabular-nums",
                  active ? "text-[#F0FF00]" : "text-[#F5F5F5]/40",
                  seekable && !active && "group-hover/line:text-[#F0FF00]"
                )}
              >
                {at !== null ? formatTime(at) : "—"}
              </span>
              {seekable ? (
                <Play
                  aria-hidden
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 fill-current",
                    active && isPlaying
                      ? "text-[#F0FF00]"
                      : "text-[#F0FF00] opacity-0 transition-opacity group-hover/line:opacity-100"
                  )}
                />
              ) : (
                <span aria-hidden className="h-2.5 w-2.5 shrink-0" />
              )}
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[12px]",
                  active ? "text-[#F5F5F5]" : "text-[#F5F5F5]/70"
                )}
              >
                {it.artist || "—"}
                {it.title ? (
                  <span className={active ? "text-[#F5F5F5]/70" : "text-[#F5F5F5]/45"}>
                    {" "}
                    · {it.title}
                  </span>
                ) : null}
              </span>
              {it.label ? (
                <span className="hidden shrink-0 text-[11px] text-[#F5F5F5]/30 sm:block">
                  {it.label}
                </span>
              ) : null}
            </>
          );

          return (
            <li key={it.id}>
              {seekable ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playAt(item, at);
                  }}
                  aria-label={`Écouter ${[it.artist, it.title].filter(Boolean).join(" – ") || "ce titre"} à ${formatTime(at)}`}
                  className={cn(
                    "group/line flex w-full items-center gap-2 rounded px-2 py-1 text-left transition-colors",
                    "hover:bg-[rgba(245,245,245,0.05)]",
                    active && "bg-[rgba(240,255,0,0.06)]",
                    focusRingInset
                  )}
                >
                  {content}
                </button>
              ) : (
                <div className="group/line flex w-full items-center gap-2 px-2 py-1">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {item === null ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 px-2">
          <p className="text-[11px] text-[#F5F5F5]/35">
            Rattache un fichier audio pour naviguer dans le set depuis sa
            tracklist.
          </p>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={(e) => {
              // La ligne entière se replie au clic : sans ça, ouvrir le
              // dialogue refermerait la tracklist au passage.
              e.stopPropagation();
              onAttachAudio();
            }}
          >
            <FileAudio className="mr-1.5 h-3 w-3" />
            Ajouter un fichier audio
          </Button>
        </div>
      ) : null}
    </div>
  );
}
