"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Download, ExternalLink, Headphones, Lock, Pause, Play } from "lucide-react";
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
        // L'adresse n'est demandée qu'au moment du play : aucune piste n'est
        // atteignable depuis le HTML de la page. Elle est sur notre domaine, et
        // chaque octet repasse par le contrôle du lien (expiration, mot de
        // passe, révocation).
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
    <div className="mx-auto max-w-5xl pb-28">
      <audio ref={audioRef} preload="none" />

      <header className="mb-8 overflow-hidden rounded-2xl border border-white/[0.08] bg-[rgba(44,44,46,0.42)] p-4 shadow-2xl backdrop-blur sm:grid sm:grid-cols-[220px_1fr] sm:items-end sm:gap-7 sm:p-5">
        <div className="aspect-square overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_25%_20%,rgba(240,255,0,0.18),transparent_35%),linear-gradient(135deg,#292929,#151515)]">
        {link.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={link.coverUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : <div className="flex h-full items-end p-5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#F0FF00]">Écoute privée</div>}
        </div>
        <div className="min-w-0 pt-5 sm:pt-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#F0FF00]">
            {link.artistName}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{link.title}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-[11px] text-[#F5F5F5]/60"><Lock className="h-3 w-3" /> Écoute privée</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-[11px] text-[#F5F5F5]/60"><Headphones className="h-3 w-3" /> {link.items.length} piste{link.items.length > 1 ? "s" : ""}</span>
            {link.expiresAt && <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-[11px] text-[#F5F5F5]/60"><CalendarDays className="h-3 w-3" /> Jusqu’au {new Date(link.expiresAt).toLocaleDateString("fr-FR")}</span>}
          </div>
          {link.introMessage && (
            <p className="mt-5 max-w-2xl whitespace-pre-line border-l border-[#F0FF00]/40 pl-4 text-sm leading-relaxed text-[#F5F5F5]/65">
              {link.introMessage}
            </p>
          )}
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      {groups.map((group, gi) => (
        <section key={gi} className="mb-4 overflow-hidden rounded-xl border border-white/[0.08] bg-[rgba(44,44,46,0.34)]">
          {group.label && (
            <h2 className="border-b border-white/[0.07] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F5F5F5]/40">
              {group.label}
            </h2>
          )}
          <ul className="divide-y divide-white/[0.07]">
            {group.items.map((item, index) => {
              const isCurrent = item.id === currentId;
              return (
                <li key={item.id} className={`px-4 py-3 transition-colors ${isCurrent ? "bg-[#F0FF00]/[0.04]" : "hover:bg-white/[0.025]"}`}>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Button
                      variant={isCurrent ? "default" : "ghost"}
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
                    <ItemCover cover={item.snapshot.cover} />
                    <span className="w-6 text-xs tabular-nums text-[#F5F5F5]/30">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${isCurrent ? "text-[#F0FF00]" : ""}`}>{item.snapshot.title}</p>
                      {item.snapshot.guestArtists.length > 0 && (
                        <p
                          className="truncate text-xs text-[#F5F5F5]/40"
                        >
                          feat. {item.snapshot.guestArtists.join(", ")}
                        </p>
                      )}
                    </div>
                    {item.snapshot.versionLabel && (
                      <span
                        className="hidden rounded border border-white/10 px-2 py-0.5 text-[10px] text-[#F5F5F5]/45 sm:inline"
                      >
                        {item.snapshot.versionLabel}
                      </span>
                    )}
                    <span
                      className="text-xs tabular-nums text-[#F5F5F5]/40"
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
                          className="h-4 w-4 text-[#F5F5F5]/45 transition-colors hover:text-[#F0FF00]"
                        />
                      </a>
                    )}
                  </div>

                  {isCurrent && (
                    <div className="mt-3 pl-10 sm:pl-12">
                      <Waveform
                        peaks={item.peaks}
                        progress={
                          item.durationMs > 0 ? positionMs / item.durationMs : 0
                        }
                        onSeek={seek}
                      />
                      <button
                        type="button"
                        className="mt-2 flex items-center gap-1 text-xs text-[#F5F5F5]/45 hover:text-[#F5F5F5]"
                        onClick={() =>
                          setOpenCredits(openCredits === item.id ? null : item.id)
                        }
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                        Crédits
                      </button>
                      {openCredits === item.id && (
                        <dl
                          className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-black/20 p-3 text-xs text-[#F5F5F5]/50"
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
        <footer className="mt-10 border-t border-white/[0.08] pt-6">
          <a
            href={link.presskitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#F0FF00] hover:underline"
          >
            Voir le presskit <ExternalLink className="h-3.5 w-3.5" />
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
            background: barExpanded ? "#101010" : "rgba(20,20,20,0.88)",
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

          <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
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
            <span className="text-xs tabular-nums text-[#F5F5F5]/50">
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

function ItemCover({ cover }: { cover?: string }) {
  const visible = cover && /^(https?:|data:|blob:|\/api\/)/.test(cover);
  return (
    <span className="hidden h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.04] sm:flex">
      {visible ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="h-full w-full object-cover" />
      ) : (
        <Headphones className="h-4 w-4 text-[#F5F5F5]/25" />
      )}
    </span>
  );
}
