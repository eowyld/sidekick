"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSignedAudioUrl } from "./useSignedAudioUrl";

export interface PlayerTrackRef {
  trackId: string;
  versionId: string;
  /** Affiché dans la barre. */
  title: string;
  versionLabel: string;
  coverSrc?: string;
  audioPath: string;
  /** ~400 valeurs entre 0 et 1, déjà stockées avec la version. */
  peaks?: number[];
  durationMs?: number;
}

export interface PhonoPlayerContextValue {
  current: PlayerTrackRef | null;
  isPlaying: boolean;
  /** Secondes écoulées. */
  position: number;
  /** Secondes. Reprend `durationMs` avant chargement, puis la vraie durée. */
  duration: number;
  volume: number;
  error: string | null;
  play: (ref: PlayerTrackRef) => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  stop: () => void;
}

const VOLUME_KEY = "phono-player-volume";

const PhonoPlayerContext = createContext<PhonoPlayerContextValue | null>(null);

export function usePhonoPlayer(): PhonoPlayerContextValue {
  const ctx = useContext(PhonoPlayerContext);
  if (!ctx) {
    throw new Error(
      "usePhonoPlayer doit être utilisé à l'intérieur d'un <PhonoPlayerProvider>."
    );
  }
  return ctx;
}

export function PhonoPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [current, setCurrent] = useState<PlayerTrackRef | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [volume, setStoredVolume] = useLocalStorage<number>(VOLUME_KEY, 1);
  const { getSignedUrl, invalidate } = useSignedAudioUrl();

  // Un seul élément audio pour tout le catalogue : lancer une version en
  // arrête forcément une autre, sans coordination entre composants.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentRef = useRef<PlayerTrackRef | null>(null);
  const volumeRef = useRef(volume);
  /** L'URL en cours de lecture venait-elle du cache ? Conditionne la reprise. */
  const fromCacheRef = useRef(false);
  /** Borne la reprise après expiration à un seul essai. */
  const retriedRef = useRef(false);
  /** Suspend la remontée de `position` pendant une recherche. */
  const isSeekingRef = useRef(false);
  /** Invalide les chargements concurrents (double clic, changement de titre). */
  const loadTokenRef = useRef(0);
  const loadRef = useRef<(ref: PlayerTrackRef, isRetry: boolean) => void>(
    () => {}
  );

  useEffect(() => {
    volumeRef.current = volume;
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = volumeRef.current;

    audio.addEventListener("timeupdate", () => {
      if (!isSeekingRef.current) setPosition(audio.currentTime);
    });
    audio.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    });
    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("playing", () => {
      // Lecture effective : le prochain incident aura de nouveau droit à une
      // reprise.
      retriedRef.current = false;
      setIsPlaying(true);
    });
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setPosition(0);
    });
    audio.addEventListener("seeking", () => {
      isSeekingRef.current = true;
    });
    audio.addEventListener("seeked", () => {
      isSeekingRef.current = false;
      setPosition(audio.currentTime);
    });
    audio.addEventListener("error", () => {
      const ref = currentRef.current;
      // Une URL signée sortie du cache a pu expirer en cours de route : on la
      // purge et on resigne, une seule fois — sinon l'échec boucle.
      if (ref && fromCacheRef.current && !retriedRef.current) {
        retriedRef.current = true;
        invalidate(ref.audioPath);
        loadRef.current(ref, true);
        return;
      }
      setIsPlaying(false);
      setError("Lecture impossible : fichier introuvable.");
    });

    audioRef.current = audio;
    return audio;
  }, [invalidate]);

  const loadAndPlay = useCallback(
    async (ref: PlayerTrackRef, isRetry: boolean) => {
      const audio = ensureAudio();
      const token = ++loadTokenRef.current;
      // Une reprise ne doit pas rouvrir le droit à une nouvelle reprise.
      if (!isRetry) retriedRef.current = false;
      setError(null);
      try {
        // L'entrée fautive a déjà été purgée : la reprise resigne forcément.
        const { url, fromCache } = await getSignedUrl(ref.audioPath);
        if (token !== loadTokenRef.current) return;
        fromCacheRef.current = fromCache;
        audio.src = url;
        audio.currentTime = 0;
        await audio.play();
      } catch (err) {
        // Un chargement plus récent a pris la main : son échec ne nous
        // concerne pas (le `play()` interrompu rejette systématiquement).
        if (token !== loadTokenRef.current) return;
        setIsPlaying(false);
        setError(
          err instanceof Error ? err.message : "Lecture impossible pour le moment."
        );
      }
    },
    [ensureAudio, getSignedUrl]
  );

  useEffect(() => {
    loadRef.current = (ref, isRetry) => void loadAndPlay(ref, isRetry);
  }, [loadAndPlay]);

  const toggle = useCallback(() => {
    const ref = currentRef.current;
    if (!ref) return;
    const audio = audioRef.current;
    if (!audio || !audio.src) {
      void loadAndPlay(ref, false);
      return;
    }
    if (audio.paused) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [loadAndPlay]);

  const play = useCallback(
    (ref: PlayerTrackRef) => {
      if (currentRef.current?.versionId === ref.versionId) {
        toggle();
        return;
      }
      currentRef.current = ref;
      setCurrent(ref);
      setPosition(0);
      // Durée connue avant chargement : la waveform ne saute pas au premier
      // `loadedmetadata`.
      setDuration(ref.durationMs ? ref.durationMs / 1000 : 0);
      void loadAndPlay(ref, false);
    },
    [loadAndPlay, toggle]
  );

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    const target = Math.max(0, seconds);
    audio.currentTime = target;
    setPosition(target);
  }, []);

  const setVolume = useCallback(
    (v: number) => {
      const clamped = Math.min(1, Math.max(0, v));
      volumeRef.current = clamped;
      if (audioRef.current) audioRef.current.volume = clamped;
      setStoredVolume(clamped);
    },
    [setStoredVolume]
  );

  const stop = useCallback(() => {
    loadTokenRef.current++;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    currentRef.current = null;
    setCurrent(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  const value = useMemo<PhonoPlayerContextValue>(
    () => ({
      current,
      isPlaying,
      position,
      duration,
      volume,
      error,
      play,
      toggle,
      seek,
      setVolume,
      stop,
    }),
    [
      current,
      isPlaying,
      position,
      duration,
      volume,
      error,
      play,
      toggle,
      seek,
      setVolume,
      stop,
    ]
  );

  return (
    <PhonoPlayerContext.Provider value={value}>
      {children}
    </PhonoPlayerContext.Provider>
  );
}
