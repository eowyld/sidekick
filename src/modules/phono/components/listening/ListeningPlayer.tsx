"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Download, ExternalLink, Headphones, Loader2, Lock, Pause, Play, Volume1, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDuration } from "@/lib/audio-peaks";
import type { ListeningItemSnapshot, PublicListeningLink } from "@/lib/listening-types";
import type { PhonoRole } from "@/lib/sidekick-store";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/modules/phono/lib/track";
import { cancelFade, fadeVolume } from "./audio-fade";
import { Waveform } from "./Waveform";
import { useListeningTracker } from "./useListeningTracker";

interface ListeningPlayerProps {
  link: PublicListeningLink;
  sessionId: string | null;
}

/**
 * Crédits affichés sous un titre en cours de lecture.
 *
 * Un mix ne porte ni ISRC, ni rôle, ni label : la ligne « Crédits » ouvrait
 * pour lui un cadre vide. On construit donc la liste à partir de ce qui existe
 * vraiment, et l'appelant masque le bouton quand elle est vide.
 */
function itemCredits(snapshot: ListeningItemSnapshot): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  if (snapshot.mainArtist) entries.push(["Artiste", snapshot.mainArtist]);
  if (snapshot.isrc) entries.push(["ISRC", snapshot.isrc]);
  // Le rôle est stocké sous sa valeur technique (`ingenieur_mixage`) :
  // le destinataire doit lire « Ingé Mixage ».
  if (snapshot.role) entries.push(["Rôle", roleLabel(snapshot.role as PhonoRole)]);
  if (snapshot.label) entries.push(["Label", snapshot.label]);
  if (snapshot.releaseDate) {
    const date = new Date(snapshot.releaseDate);
    entries.push([
      "Sortie",
      Number.isNaN(date.getTime())
        ? snapshot.releaseDate
        : date.toLocaleDateString("fr-FR"),
    ]);
  }
  if (snapshot.genre) entries.push(["Genre", snapshot.genre]);
  return entries;
}

/** Le visiteur retrouve son niveau d'écoute d'un titre à l'autre et d'une visite à l'autre. */
const VOLUME_STORAGE_KEY = "sidekick:listening:volume";

/** Laisse au navigateur le temps d'enregistrer un fichier avant de lancer le suivant. */
const DOWNLOAD_INTERVAL_MS = 900;

/** Croisement entre deux titres qui s'enchaînent. */
const CROSSFADE_MS = 2500;
/** Fondu d'un changement de titre décidé par l'auditeur. */
const SWITCH_FADE_MS = 260;
/** Fondus de pause et de reprise : évitent le clic sec sur la forme d'onde. */
const PAUSE_FADE_MS = 160;
const RESUME_FADE_MS = 220;

export function ListeningPlayer({ link, sessionId }: ListeningPlayerProps) {
  // Deux lecteurs : l'un joue pendant que l'autre charge le titre suivant.
  // C'est ce qui permet à la fois le démarrage immédiat et le fondu enchaîné.
  const audioA = useRef<HTMLAudioElement | null>(null);
  const audioB = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef<HTMLAudioElement | null>(null);
  const crossfadedRef = useRef(false);
  const volumeRef = useRef(1);
  const mutedRef = useRef(false);
  const lastTimeRef = useRef(0);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  /** Titre demandé dont le son n'est pas encore arrivé : le clic doit se voir. */
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [positionMs, setPositionMs] = useState(0);
  const [openCredits, setOpenCredits] = useState<string | null>(null);
  const [barExpanded, setBarExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Lu à l'initialisation plutôt que dans un effet : le lecteur n'apparaît
  // qu'une fois la lecture lancée, donc jamais dans le HTML rendu côté serveur.
  // `localStorage` peut jeter (navigation privée, stockage bloqué) : la page
  // doit rester lisible sans lui.
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") return 1;
    try {
      const raw = window.localStorage.getItem(VOLUME_STORAGE_KEY);
      if (raw === null) return 1;
      const stored = Number(raw);
      return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : 1;
    } catch {
      return 1;
    }
  });
  const [muted, setMuted] = useState(false);
  const [downloadStep, setDownloadStep] = useState<number | null>(null);
  const [downloadTotal, setDownloadTotal] = useState(0);
  const [downloadOpen, setDownloadOpen] = useState(false);

  const tracker = useListeningTracker({ slug: link.slug, sessionId });

  const current = link.items.find((i) => i.id === currentId) ?? null;

  const downloadHref = useCallback(
    (itemId: string) =>
      `/api/listening/${link.slug}/download/${itemId}${sessionId ? `?session=${sessionId}` : ""}`,
    [link.slug, sessionId]
  );

  // Le niveau choisi est la cible de tous les fondus : on le garde dans une
  // référence pour que les rampes en cours visent la bonne valeur.
  useEffect(() => {
    volumeRef.current = volume;
    mutedRef.current = muted;
    const active = activeRef.current;
    if (!active) return;
    cancelFade(active);
    active.volume = volume;
    active.muted = muted;
  }, [volume, muted]);

  const changeVolume = useCallback((value: number) => {
    setVolume(value);
    if (value > 0) setMuted(false);
    try {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, String(value));
    } catch {
      /* niveau non mémorisé, sans conséquence sur l'écoute */
    }
  }, []);

  /**
   * Téléchargement d'une sélection : une requête par titre, enchaînées.
   * Pas d'archive ZIP côté serveur — il faudrait tenir tout le flux dans une
   * seule fonction Vercel, et un album de WAV dépasse sa durée maximale. Ici
   * chaque fichier est une requête indépendante, exactement comme un clic sur
   * la flèche d'un titre, et chacun reste tracé comme un téléchargement.
   */
  const downloadItems = useCallback(
    async (ids: string[]) => {
      setDownloadTotal(ids.length);
      for (const [index, id] of ids.entries()) {
        setDownloadStep(index + 1);
        const anchor = document.createElement("a");
        anchor.href = downloadHref(id);
        anchor.download = "";
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        if (index < ids.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, DOWNLOAD_INTERVAL_MS));
        }
      }
      setDownloadStep(null);
      setDownloadTotal(0);
    },
    [downloadHref]
  );

  /** Adresse de lecture : le `GET` refait lui-même tous les contrôles d'accès. */
  const audioUrl = useCallback(
    (itemId: string) => `/api/listening/${link.slug}/audio/${itemId}`,
    [link.slug]
  );

  /** Élément qui ne joue pas : celui qui accueille le titre suivant. */
  const idleAudio = useCallback(
    () => (activeRef.current === audioA.current ? audioB.current : audioA.current),
    []
  );

  /** Met un titre en attente dans l'élément libre, prêt à démarrer sans latence. */
  const preload = useCallback(
    (itemId: string | null) => {
      const audio = idleAudio();
      if (!audio || !itemId) return;
      // L'élément libre peut encore porter la fin d'un titre en fondu sortant :
      // le recharger maintenant couperait ce fondu net.
      if (!audio.paused) return;
      const url = audioUrl(itemId);
      if (audio.dataset.itemId === itemId) return;
      audio.dataset.itemId = itemId;
      audio.volume = 0;
      audio.src = url;
      audio.load();
    },
    [audioUrl, idleAudio]
  );

  /**
   * Démarre un titre sur l'élément libre et croise les volumes.
   *
   * Les deux éléments existent pour ça : le suivant est déjà chargé et à zéro
   * pendant que le courant joue, donc le démarrage est immédiat et la
   * transition ne coupe jamais le son.
   */
  /** Charge dans l'élément libre le titre qui suit `itemId`, s'il y en a un. */
  const preloadFollowing = useCallback(
    (itemId: string) => {
      const index = link.items.findIndex((item) => item.id === itemId);
      const following = link.items[index + 1];
      if (following) preload(following.id);
    },
    [link.items, preload]
  );

  /**
   * Démarre un titre sur l'élément libre et croise les volumes.
   *
   * Les deux éléments existent pour ça : le suivant est déjà chargé et à zéro
   * pendant que le courant joue, donc le démarrage est immédiat et la
   * transition ne coupe jamais le son.
   *
   * `waitForIncoming` : dans un enchaînement automatique, le titre sortant ne
   * commence à baisser qu'une fois le suivant réellement audible. Sans cela, un
   * titre suivant encore en chargement laissait un trou de silence à la place
   * du fondu. Un changement décidé par l'auditeur, lui, coupe tout de suite.
   */
  const startItem = useCallback(
    (itemId: string, fadeMs: number, waitForIncoming = false) => {
      const next = idleAudio();
      if (!next) return;
      const previous = activeRef.current;

      setError(null);
      if (next.dataset.itemId !== itemId) {
        next.dataset.itemId = itemId;
        next.src = audioUrl(itemId);
      }
      if (next.currentTime > 0) next.currentTime = 0;
      next.muted = mutedRef.current;
      next.volume = 0;
      cancelFade(next);

      activeRef.current = next;
      crossfadedRef.current = false;
      lastTimeRef.current = 0;
      setPositionMs(0);
      setCurrentId(itemId);
      setPendingId(itemId);

      const releasePrevious = () => {
        if (!previous || previous === next) {
          preloadFollowing(itemId);
          return;
        }
        fadeVolume(previous, 0, fadeMs, () => {
          previous.pause();
          previous.removeAttribute("src");
          delete previous.dataset.itemId;
          // L'élément libéré prend le titre d'après, prêt pour l'enchaînement.
          preloadFollowing(itemId);
        });
      };

      void next
        .play()
        .then(() => {
          setIsPlaying(true);
          setPendingId((pending) => (pending === itemId ? null : pending));
          fadeVolume(next, volumeRef.current, fadeMs);
          tracker.onPlay(itemId);
          if (waitForIncoming) releasePrevious();
          // Premier titre lancé : aucun élément ne se libère, le suivant doit
          // quand même être chargé pour l'enchaînement.
          else if (!previous) preloadFollowing(itemId);
        })
        .catch((reason: unknown) => {
          setPendingId((pending) => (pending === itemId ? null : pending));
          // Un clic sur un autre titre pendant le démarrage interrompt ce
          // `play()` : c'est voulu, pas une panne à signaler.
          const aborted = reason instanceof DOMException && reason.name === "AbortError";
          if (!aborted && activeRef.current === next) setError("Lecture impossible.");
        });

      if (!waitForIncoming && previous) releasePrevious();
    },
    [audioUrl, idleAudio, preloadFollowing, tracker]
  );

  const toggle = useCallback(
    (itemId: string) => {
      const active = activeRef.current;
      if (currentId === itemId && active) {
        if (active.paused) {
          cancelFade(active);
          active.volume = 0;
          void active.play().then(() => fadeVolume(active, volumeRef.current, RESUME_FADE_MS));
          setIsPlaying(true);
        } else {
          fadeVolume(active, 0, PAUSE_FADE_MS, () => active.pause());
          setIsPlaying(false);
          tracker.flush();
        }
        return;
      }
      // Changement de titre à la main : fondu court, le temps que l'oreille
      // suive, sans donner l'impression d'attendre.
      startItem(itemId, SWITCH_FADE_MS);
    },
    [currentId, startItem, tracker]
  );

  useEffect(() => {
    const elements = [audioA.current, audioB.current].filter(
      (audio): audio is HTMLAudioElement => audio !== null
    );
    if (elements.length === 0) return;

    function onTimeUpdate(event: Event) {
      const audio = event.currentTarget as HTMLAudioElement;
      // Le titre sortant continue d'émettre pendant son fondu : seule la
      // position du titre courant compte.
      if (audio !== activeRef.current || !currentId) return;
      const now = audio.currentTime * 1000;
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      setPositionMs(now);
      tracker.onProgress(currentId, now, delta);

      const index = link.items.findIndex((item) => item.id === currentId);
      const next = link.items[index + 1];
      const remainingMs = (audio.duration - audio.currentTime) * 1000;
      if (
        next &&
        !crossfadedRef.current &&
        Number.isFinite(remainingMs) &&
        remainingMs <= CROSSFADE_MS
      ) {
        // Enchaînement : le fondu commence avant la fin, les deux titres se
        // croisent au lieu de laisser un blanc.
        crossfadedRef.current = true;
        tracker.onEnded();
        startItem(next.id, CROSSFADE_MS, true);
      }
    }

    function onEnded(event: Event) {
      const audio = event.currentTarget as HTMLAudioElement;
      if (audio !== activeRef.current) return;
      // Fin atteinte sans croisement (titre plus court que le fondu, ou saut
      // en fin de piste).
      const index = link.items.findIndex((item) => item.id === currentId);
      const next = link.items[index + 1];
      tracker.onEnded();
      if (next) startItem(next.id, SWITCH_FADE_MS);
      else setIsPlaying(false);
    }

    function onError(event: Event) {
      if (event.currentTarget !== activeRef.current) return;
      setError("Ce titre n'est plus disponible.");
    }

    for (const audio of elements) {
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.addEventListener("ended", onEnded);
      audio.addEventListener("error", onError);
    }
    return () => {
      for (const audio of elements) {
        audio.removeEventListener("timeupdate", onTimeUpdate);
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("error", onError);
      }
    };
  }, [currentId, link.items, startItem, tracker]);

  // Premier titre mis en attente dès l'ouverture : le premier clic ne paie plus
  // l'aller-retour réseau, c'était l'essentiel des deux à trois secondes.
  useEffect(() => {
    const first = link.items[0];
    if (first) preload(first.id);
  }, [link.items, preload]);

  function seek(ratio: number) {
    const audio = activeRef.current;
    if (!audio || !current) return;
    // Un saut en arrière doit pouvoir réarmer l'enchaînement de fin de titre.
    crossfadedRef.current = false;
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
      <audio ref={audioA} preload="auto" />
      <audio ref={audioB} preload="auto" />

      <header className="relative mb-8 overflow-hidden rounded-2xl border border-white/[0.08] bg-[rgba(44,44,46,0.42)] p-4 shadow-2xl backdrop-blur sm:grid sm:grid-cols-[220px_1fr] sm:items-end sm:gap-7 sm:p-5">
        {link.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={link.logoUrl}
            alt=""
            className="absolute right-4 top-4 h-14 max-w-[220px] object-contain object-right sm:right-5 sm:top-5 sm:h-16"
          />
        )}
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
          {link.allowDownload && link.items.length > 0 && (
            <div className="mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDownloadOpen(true)}
                disabled={downloadStep !== null}
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                {downloadStep !== null
                  ? `Téléchargement ${downloadStep}/${downloadTotal}…`
                  : "Télécharger"}
              </Button>
            </div>
          )}
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
              const credits = itemCredits(item.snapshot);
              return (
                <li
                  key={item.id}
                  className={`px-4 py-3 transition-colors ${isCurrent ? "bg-[#F0FF00]/[0.04]" : "hover:bg-white/[0.025]"}`}
                  // Le survol précède le clic de quelques centaines de ms :
                  // assez pour que le début du fichier soit déjà en route.
                  onPointerEnter={isCurrent ? undefined : () => preload(item.id)}
                >
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
                      {pendingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isCurrent && isPlaying ? (
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
                      <p className={`flex items-center gap-2 text-sm font-medium ${isCurrent ? "text-[#F0FF00]" : ""}`}>
                        <span className="truncate">{item.snapshot.title}</span>
                        {item.snapshot.versionLabel && <VersionBadge label={item.snapshot.versionLabel} />}
                      </p>
                      {item.snapshot.guestArtists.length > 0 && (
                        <p
                          className="truncate text-xs text-[#F5F5F5]/40"
                        >
                          feat. {item.snapshot.guestArtists.join(", ")}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-xs tabular-nums text-[#F5F5F5]/40"
                    >
                      {formatDuration(item.durationMs)}
                    </span>
                    {link.allowDownload && (
                      <a
                        href={downloadHref(item.id)}
                        aria-label={`Télécharger ${item.snapshot.title}${item.snapshot.versionLabel ? ` (${item.snapshot.versionLabel})` : ""}`}
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
                      {credits.length > 0 && (
                        <>
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
                            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-black/20 p-3 text-xs text-[#F5F5F5]/50">
                              {credits.map(([term, value]) => (
                                <Fragment key={term}>
                                  <dt>{term}</dt>
                                  <dd className="text-[#F5F5F5]/70">{value}</dd>
                                </Fragment>
                              ))}
                            </dl>
                          )}
                        </>
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

      {link.allowDownload && downloadOpen && (
        <DownloadDialog
          open={downloadOpen}
          onOpenChange={setDownloadOpen}
          items={link.items}
          onConfirm={(ids) => {
            setDownloadOpen(false);
            void downloadItems(ids);
          }}
        />
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
              {pendingId === current.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm md:cursor-default"
              onClick={() => setBarExpanded(true)}
            >
              <span className="truncate">{current.snapshot.title}</span>
              {current.snapshot.versionLabel && <VersionBadge label={current.snapshot.versionLabel} />}
            </button>
            <span className="text-xs tabular-nums text-[#F5F5F5]/50">
              {formatDuration(positionMs)} / {formatDuration(current.durationMs)}
            </span>
            <VolumeControl
              volume={volume}
              muted={muted}
              onVolume={changeVolume}
              onToggleMute={() => setMuted((previous) => !previous)}
              className="hidden sm:flex"
            />
          </div>

          {barExpanded && (
            <div className="mx-auto w-full max-w-3xl md:hidden">
              <VolumeControl
                volume={volume}
                muted={muted}
                onVolume={changeVolume}
                onToggleMute={() => setMuted((previous) => !previous)}
                className="mb-4 justify-center"
              />
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

/**
 * Choix des titres à télécharger. Les mixes sont décochés d'entrée : un DJ set
 * d'une heure n'est presque jamais ce qu'on vient chercher, et il pèse le
 * double du reste de la sélection.
 */
function DownloadDialog({
  open,
  onOpenChange,
  items,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: PublicListeningLink["items"];
  onConfirm: (ids: string[]) => void;
}) {
  // Le composant n'est monté qu'à l'ouverture : la sélection repart des mêmes
  // valeurs par défaut à chaque fois, sans effet de remise à zéro.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(items.filter((item) => item.kind !== "mix").map((item) => item.id))
  );

  const allSelected = selected.size === items.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Télécharger</DialogTitle>
          <DialogDescription>Choisis les titres à enregistrer.</DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={() =>
            setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)))
          }
          className="justify-self-start text-xs text-[#F0FF00] hover:underline"
        >
          {allSelected ? "Tout décocher" : "Tout cocher"}
        </button>

        <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
          {items.map((item) => {
            const checked = selected.has(item.id);
            return (
              <li key={item.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03]">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) =>
                      setSelected((previous) => {
                        const next = new Set(previous);
                        if (value === true) next.add(item.id);
                        else next.delete(item.id);
                        return next;
                      })
                    }
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{item.snapshot.title}</span>
                  {item.kind === "mix" && (
                    <span className="shrink-0 rounded-full border border-white/12 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[#F5F5F5]/50">
                      Mix
                    </span>
                  )}
                  {item.snapshot.versionLabel && <VersionBadge label={item.snapshot.versionLabel} />}
                  <span className="shrink-0 text-xs tabular-nums text-[#F5F5F5]/40">
                    {formatDuration(item.durationMs)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            disabled={selected.size === 0}
            onClick={() => onConfirm(items.filter((item) => selected.has(item.id)).map((item) => item.id))}
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            Télécharger {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * La version était un discret liseré gris, masqué sous 640 px. Quand la
 * sélection contient deux mixes du même titre, c'est pourtant la seule chose
 * qui les distingue : elle passe en jaune, et reste visible sur mobile.
 */
function VersionBadge({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-full border border-[#F0FF00]/35 bg-[#F0FF00]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#F0FF00]">
      {label}
    </span>
  );
}

function VolumeControl({
  volume,
  muted,
  onVolume,
  onToggleMute,
  className,
}: {
  volume: number;
  muted: boolean;
  onVolume: (value: number) => void;
  onToggleMute: () => void;
  className?: string;
}) {
  const silent = muted || volume === 0;
  const Icon = silent ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={silent ? "Rétablir le son" : "Couper le son"}
        className="text-[#F5F5F5]/55 transition-colors hover:text-[#F5F5F5]"
      >
        <Icon className="h-4 w-4" />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={silent ? 0 : volume}
        onChange={(event) => onVolume(Number(event.target.value))}
        aria-label="Volume"
        className="h-1 w-24 cursor-pointer accent-[#F0FF00]"
      />
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
