"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Download, Lock, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/audio-peaks";
import type { PublicListeningLink } from "@/lib/listening-types";
import { Waveform } from "./Waveform";
import { useListeningTracker } from "./useListeningTracker";

interface ListeningPlayerProps {
  link: PublicListeningLink;
  sessionId: string | null;
}

export function ListeningPlayer({ link, sessionId }: ListeningPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastTimeRef = useRef(0);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [openCredits, setOpenCredits] = useState<string | null>(null);
  const [barExpanded, setBarExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tracker = useListeningTracker({ slug: link.slug, sessionId });

  const current = link.items.find((i) => i.id === currentId) ?? null;

  const playItem = useCallback(
    async (itemId: string) => {
      setError(null);
      const audio = audioRef.current;
      if (!audio) return;
      try {
        // L'URL n'est demandée qu'au moment du play, et n'est valable que
        // quelques minutes : elle n'apparaît jamais dans le HTML de la page.
        const res = await fetch(`/api/listening/${link.slug}/audio/${itemId}`, {
          method: "POST",
        });
        if (!res.ok) {
          setError("Ce titre n'est plus disponible.");
          return;
        }
        const { url } = (await res.json()) as { url: string };
        audio.src = url;
        lastTimeRef.current = 0;
        setPositionMs(0);
        setCurrentId(itemId);
        await audio.play();
        setIsPlaying(true);
        tracker.onPlay(itemId);
      } catch {
        setError("Lecture impossible.");
      }
    },
    [link.slug, tracker]
  );

  const toggle = useCallback(
    (itemId: string) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (currentId === itemId) {
        if (audio.paused) {
          void audio.play();
          setIsPlaying(true);
        } else {
          audio.pause();
          setIsPlaying(false);
          tracker.flush();
        }
        return;
      }
      void playItem(itemId);
    },
    [currentId, playItem, tracker]
  );

  // Lecture continue : le pro enchaîne la sélection sans intervenir.
  const playNext = useCallback(() => {
    if (!currentId) return;
    const index = link.items.findIndex((i) => i.id === currentId);
    const next = link.items[index + 1];
    tracker.onEnded();
    if (next) void playItem(next.id);
    else setIsPlaying(false);
  }, [currentId, link.items, playItem, tracker]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function onTimeUpdate() {
      if (!audio || !currentId) return;
      const now = audio.currentTime * 1000;
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      setPositionMs(now);
      tracker.onProgress(currentId, now, delta);
    }

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", playNext);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", playNext);
    };
  }, [currentId, playNext, tracker]);

  function seek(ratio: number) {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.currentTime = (ratio * current.durationMs) / 1000;
    lastTimeRef.current = audio.currentTime * 1000;
  }

  // Les items d'un même projet se suivent : on regroupe sans réordonner.
  const groups: Array<{ label: string | null; items: typeof link.items }> = [];
  for (const item of link.items) {
    const label = item.groupLabel ?? null;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  return (
    <div className="pb-28">
      <audio ref={audioRef} preload="none" />

      <header className="mb-8 flex items-start gap-4">
        {link.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={link.coverUrl}
            alt=""
            className="h-24 w-24 rounded-lg object-cover"
          />
        )}
        <div className="min-w-0">
          <p
            className="text-sm uppercase tracking-wide"
            style={{ color: "rgba(245,245,245,0.7)" }}
          >
            {link.artistName}
          </p>
          <h1 className="text-2xl font-medium">{link.title}</h1>
          <p
            className="mt-1 flex items-center gap-1.5 text-xs"
            style={{ color: "rgba(245,245,245,0.7)" }}
          >
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>Écoute privée</strong> — titres non publiés, merci de ne pas
              rediffuser ce lien.
            </span>
          </p>
          {link.expiresAt && (
            <p className="mt-1 text-xs" style={{ color: "rgba(245,245,245,0.7)" }}>
              Ce lien expire le{" "}
              {new Date(link.expiresAt).toLocaleDateString("fr-FR")}.
            </p>
          )}
          {link.introMessage && (
            <p
              className="mt-3 whitespace-pre-line text-sm"
              style={{ color: "rgba(245,245,245,0.7)" }}
            >
              {link.introMessage}
            </p>
          )}
        </div>
      </header>

      {error && (
        <p className="mb-4 text-sm" style={{ color: "#ff6b6b" }}>
          {error}
        </p>
      )}

      {groups.map((group, gi) => (
        <section key={gi} className="mb-6">
          {group.label && (
            <h2
              className="mb-2 text-sm uppercase tracking-wide"
              style={{ color: "rgba(245,245,245,0.7)" }}
            >
              {group.label}
            </h2>
          )}
          <ul className="divide-y" style={{ borderColor: "rgba(245,245,245,0.12)" }}>
            {group.items.map((item, index) => {
              const isCurrent = item.id === currentId;
              return (
                <li key={item.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggle(item.id)}
                      aria-label={
                        isCurrent && isPlaying
                          ? "Pause"
                          : `Lire ${item.snapshot.title}`
                      }
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <span
                      className="w-6 text-sm tabular-nums"
                      style={{ color: "rgba(245,245,245,0.7)" }}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{item.snapshot.title}</p>
                      {item.snapshot.guestArtists.length > 0 && (
                        <p
                          className="truncate text-xs"
                          style={{ color: "rgba(245,245,245,0.7)" }}
                        >
                          feat. {item.snapshot.guestArtists.join(", ")}
                        </p>
                      )}
                    </div>
                    {item.snapshot.versionLabel && (
                      <span
                        className="hidden rounded px-2 py-0.5 text-xs sm:inline"
                        style={{
                          border: "1px solid rgba(245,245,245,0.12)",
                          color: "rgba(245,245,245,0.7)",
                        }}
                      >
                        {item.snapshot.versionLabel}
                      </span>
                    )}
                    <span
                      className="text-sm tabular-nums"
                      style={{ color: "rgba(245,245,245,0.7)" }}
                    >
                      {formatDuration(item.durationMs)}
                    </span>
                    {link.allowDownload && (
                      <a
                        href={`/api/listening/${link.slug}/download/${item.id}${
                          sessionId ? `?session=${sessionId}` : ""
                        }`}
                        aria-label={`Télécharger ${item.snapshot.title}`}
                      >
                        <Download
                          className="h-4 w-4"
                          style={{ color: "rgba(245,245,245,0.7)" }}
                        />
                      </a>
                    )}
                  </div>

                  {isCurrent && (
                    <div className="mt-3 pl-12">
                      <Waveform
                        peaks={item.peaks}
                        progress={
                          item.durationMs > 0 ? positionMs / item.durationMs : 0
                        }
                        onSeek={seek}
                      />
                      <button
                        type="button"
                        className="mt-2 flex items-center gap-1 text-xs"
                        style={{ color: "rgba(245,245,245,0.7)" }}
                        onClick={() =>
                          setOpenCredits(openCredits === item.id ? null : item.id)
                        }
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                        Crédits
                      </button>
                      {openCredits === item.id && (
                        <dl
                          className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs"
                          style={{ color: "rgba(245,245,245,0.7)" }}
                        >
                          {item.snapshot.isrc && (
                            <>
                              <dt>ISRC</dt>
                              <dd>{item.snapshot.isrc}</dd>
                            </>
                          )}
                          {item.snapshot.role && (
                            <>
                              <dt>Rôle</dt>
                              <dd>{item.snapshot.role}</dd>
                            </>
                          )}
                          {item.snapshot.label && (
                            <>
                              <dt>Label</dt>
                              <dd>{item.snapshot.label}</dd>
                            </>
                          )}
                          {item.snapshot.releaseDate && (
                            <>
                              <dt>Sortie</dt>
                              <dd>{item.snapshot.releaseDate}</dd>
                            </>
                          )}
                          {item.snapshot.genre && (
                            <>
                              <dt>Genre</dt>
                              <dd>{item.snapshot.genre}</dd>
                            </>
                          )}
                        </dl>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {link.presskitUrl && (
        <footer
          className="mt-10 border-t pt-6"
          style={{ borderColor: "rgba(245,245,245,0.12)" }}
        >
          <a
            href={link.presskitUrl}
            className="text-sm underline"
            style={{ color: "#F0FF00" }}
          >
            Voir le presskit
          </a>
        </footer>
      )}

      {current && (
        <div
          className={
            barExpanded
              ? "fixed inset-0 z-50 flex flex-col justify-center gap-6 p-6 backdrop-blur-xl md:inset-x-0 md:inset-y-auto md:bottom-0 md:block md:border-t md:p-3"
              : "fixed inset-x-0 bottom-0 border-t p-3 backdrop-blur-xl"
          }
          style={{
            borderColor: "rgba(245,245,245,0.12)",
            background: barExpanded ? "#101010" : "rgba(44,44,46,0.72)",
          }}
        >
          {barExpanded && (
            <button
              type="button"
              className="absolute right-4 top-4 md:hidden"
              onClick={() => setBarExpanded(false)}
              aria-label="Réduire le lecteur"
            >
              <ChevronDown className="h-6 w-6" />
            </button>
          )}

          <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => toggle(current.id)}>
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left text-sm md:cursor-default"
              onClick={() => setBarExpanded(true)}
            >
              {current.snapshot.title}
            </button>
            <span
              className="text-sm tabular-nums"
              style={{ color: "rgba(245,245,245,0.7)" }}
            >
              {formatDuration(positionMs)} / {formatDuration(current.durationMs)}
            </span>
          </div>

          {barExpanded && (
            <div className="mx-auto w-full max-w-3xl md:hidden">
              <Waveform
                peaks={current.peaks}
                progress={
                  current.durationMs > 0 ? positionMs / current.durationMs : 0
                }
                onSeek={seek}
                height={96}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
