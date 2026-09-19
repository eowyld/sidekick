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
import { usePhonoData } from "@/hooks/usePhonoData";
import {
  buildPlayerQueue,
  defaultQueueItem,
  type PlayerQueueItem,
} from "@/modules/phono/lib/player-queue";
import { usePhonoSort } from "../PhonoSortProvider";
import { useSignedAudioUrl } from "./useSignedAudioUrl";

export type PlayerTrackRef = PlayerQueueItem;

export interface PhonoPlayerContextValue {
  current: PlayerTrackRef | null;
  isPlaying: boolean;
  /** Secondes écoulées. */
  position: number;
  /** Secondes. Reprend `durationMs` avant chargement, puis la vraie durée. */
  duration: number;
  volume: number;
  error: string | null;
  /** File complète du catalogue, dans l'ordre affiché. */
  queue: PlayerQueueItem[];
  /** Rang de l'entrée en cours dans la file, `-1` si elle n'y est plus. */
  index: number;
  play: (ref: PlayerTrackRef) => void;
  /**
   * Lance une entrée **à un point donné**, en secondes. Sert aux tracklists de
   * mix : cliquer un timecode fait entendre ce titre, que le mix soit déjà en
   * cours ou pas encore chargé.
   */
  playAt: (ref: PlayerTrackRef, seconds: number) => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
}

const VOLUME_KEY = "phono-player-volume";
/** Clé de la dernière entrée écoutée, restaurée à la reconnexion. */
const LAST_ITEM_KEY = "phono-player-last-item";

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

  // Le lecteur construit sa file lui-même. Elle ne peut pas venir de la page
  // Catalogue : le lecteur est monté dans le layout et doit fonctionner depuis
  // n'importe quelle page du site.
  const { tracks, albums, mixes, loading } = usePhonoData();
  const { sorts } = usePhonoSort();

  const queue = useMemo(
    () => buildPlayerQueue(tracks, albums, mixes, sorts),
    [tracks, albums, mixes, sorts]
  );

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
  /**
   * Point d'entrée demandé avant que le fichier soit là, en secondes.
   *
   * Poser `currentTime` sur un élément qui n'a pas encore sa durée est perdu
   * par le navigateur : la demande attend ici et part à `loadedmetadata`. C'est
   * ce qui fait qu'un timecode cliqué sur un mix à l'arrêt tombe juste.
   */
  const pendingSeekRef = useRef<number | null>(null);
  /** Invalide les chargements concurrents (double clic, changement de titre). */
  const loadTokenRef = useRef(0);
  /**
   * Un chargement est en cours : l'élément porte encore le fichier précédent,
   * la source demandée n'est pas encore posée dessus.
   *
   * Signer une URL prend un aller-retour réseau complet la première fois qu'un
   * fichier est joué — typiquement une version qu'on vient de rattacher depuis
   * le Drive. Pendant cette fenêtre, `current` désigne déjà la nouvelle
   * version : sans ce drapeau, `toggle()` croyait piloter la lecture demandée
   * alors qu'il mettait en pause, ou relançait, le morceau d'avant.
   */
  const pendingLoadRef = useRef(false);
  /**
   * Clé de la dernière entrée confirmée présente dans `queue`.
   *
   * Distingue « vient de disparaître de la file » (vraie suppression, à
   * couper) de « n'y a jamais figuré » (aperçu d'un brouillon non enregistré
   * depuis la page de création — sa clé porte l'id `__draft__`, absent de la
   * file tant que le titre n'est pas sauvegardé). Sans cette distinction,
   * l'effet ci-dessous coupait le lecteur juste après l'avoir lancé sur un
   * fichier tout juste attaché mais pas encore enregistré.
   */
  const presentSinceRef = useRef<string | null>(null);
  const loadRef = useRef<(ref: PlayerTrackRef, isRetry: boolean) => void>(
    () => {}
  );
  /**
   * Avance dans la file, appelé depuis l'écouteur `ended`.
   *
   * L'élément `Audio` n'est créé qu'une fois : ses écouteurs capturent les
   * fermetures du premier rendu et ne verraient jamais la file à jour. Passer
   * par une ref est ce qui leur donne accès à l'état courant.
   */
  const stepRef = useRef<(delta: number) => void>(() => {});

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
      const pending = pendingSeekRef.current;
      if (pending === null) return;
      pendingSeekRef.current = null;
      // Un timecode au-delà de la fin du fichier (tracklist plus longue que
      // l'enregistrement) rendrait la lecture muette : on s'arrête au bord.
      const target = Number.isFinite(audio.duration)
        ? Math.min(pending, Math.max(0, audio.duration - 1))
        : pending;
      audio.currentTime = target;
      setPosition(target);
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
      // Enchaînement automatique : c'est ce qui rend « écouter tout l'album »
      // vrai sans que l'artiste ait à relancer chaque titre.
      stepRef.current(1);
    });
    audio.addEventListener("seeking", () => {
      isSeekingRef.current = true;
    });
    audio.addEventListener("seeked", () => {
      isSeekingRef.current = false;
      setPosition(audio.currentTime);
    });
    audio.addEventListener("error", () => {
      // `stop()` retire la source et rappelle `load()` : l'élément émet alors
      // une erreur qui ne dit rien de la lecture. Sans ce garde, arrêter le
      // lecteur affichait « fichier introuvable » juste après.
      if (!audio.src || !currentRef.current) return;
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
      // Le morceau déjà chargé s'arrête au geste, pas à l'arrivée de l'URL
      // signée : celle-ci peut demander un aller-retour réseau complet, et le
      // laisser tourner pendant ce temps donnait à entendre l'ancien fichier
      // alors que l'écran annonçait déjà le nouveau.
      pendingLoadRef.current = true;
      if (!audio.paused) audio.pause();
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
        // `play()` rejette en `AbortError` dès que la lecture est interrompue
        // avant d'avoir commencé : pause pendant que l'URL signée arrivait,
        // nouvelle source posée sur le même élément. C'est un geste de
        // l'artiste, pas une panne — le jeton ne l'attrape pas, puisqu'une
        // pause n'ouvre aucun chargement concurrent. Sans ce cas, le message
        // natif du navigateur (« The play() request was interrupted by a call
        // to pause() ») finissait affiché tel quel dans la barre du lecteur.
        if (err instanceof DOMException && err.name === "AbortError") return;
        setIsPlaying(false);
        setError(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Le navigateur a bloqué la lecture : relance-la depuis la barre."
            : "Lecture impossible pour le moment."
        );
      } finally {
        // Seul le chargement encore en tête relâche le drapeau : un chargement
        // dépassé qui se termine ne doit pas rouvrir `toggle()` sur l'élément
        // pendant que le suivant attend encore son URL.
        if (token === loadTokenRef.current) pendingLoadRef.current = false;
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
    // Chargement en cours : l'élément porte encore le fichier précédent, agir
    // dessus mettrait en pause ou relancerait le mauvais morceau. La lecture
    // demandée démarrera d'elle-même dès que son URL sera là.
    if (pendingLoadRef.current) return;
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

  /** Lance une entrée, sans jamais interpréter le geste comme une pause. */
  const start = useCallback(
    (ref: PlayerTrackRef, startAt?: number) => {
      currentRef.current = ref;
      setCurrent(ref);
      // La demande d'entrée en cours de morceau est posée avant le chargement :
      // `loadedmetadata` la reprendra dès que le fichier aura sa durée.
      pendingSeekRef.current =
        startAt !== undefined && startAt > 0 ? startAt : null;
      setPosition(startAt ?? 0);
      // Durée connue avant chargement : la waveform ne saute pas au premier
      // `loadedmetadata`.
      setDuration(ref.durationMs ? ref.durationMs / 1000 : 0);
      try {
        window.localStorage.setItem(LAST_ITEM_KEY, ref.key);
      } catch {
        // Navigation privée ou stockage plein : la reprise à la reconnexion
        // est un confort, son échec ne doit pas empêcher d'écouter.
      }
      void loadAndPlay(ref, false);
    },
    [loadAndPlay]
  );

  const play = useCallback(
    (ref: PlayerTrackRef) => {
      // Rejouer la version déjà en cours vaut pause/reprise. Le test porte sur
      // `versionId` et non sur `key` : la même version atteinte par son titre
      // ou par son album reste le même enregistrement pour l'oreille.
      //
      // `audioPath` tranche les cas où l'id ne suffit pas : deux entrées qui
      // pointent des fichiers différents ne sont pas le même enregistrement,
      // quoi que dise leur id. Des versions ont pu être enregistrées avec une
      // id dupliquée (cf. `emptyForm` dans `TrackEditPage`) ; sans ce garde,
      // lancer l'une d'elles mettait l'autre en pause au lieu de la jouer.
      const playing = currentRef.current;
      if (
        playing?.versionId === ref.versionId &&
        playing.audioPath === ref.audioPath
      ) {
        toggle();
        return;
      }
      start(ref);
    },
    [start, toggle]
  );

  /**
   * Lance une entrée à un point donné.
   *
   * Si c'est déjà l'entrée en cours, on ne recharge rien : on se déplace dans le
   * fichier et on relance s'il était en pause. Cliquer trois timecodes d'affilée
   * dans une tracklist ne redemande donc pas trois fois la même URL signée.
   */
  const playAt = useCallback(
    (ref: PlayerTrackRef, seconds: number) => {
      const target = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
      const playing = currentRef.current;
      const audio = audioRef.current;
      const same =
        playing?.versionId === ref.versionId &&
        playing.audioPath === ref.audioPath;
      if (same && audio?.src && !pendingLoadRef.current) {
        // Même garde qu'au chargement : un timecode hérité d'une tracklist plus
        // longue que le fichier laisserait l'élément au bout, donc muet.
        const bounded = Number.isFinite(audio.duration)
          ? Math.min(target, Math.max(0, audio.duration - 1))
          : target;
        audio.currentTime = bounded;
        setPosition(bounded);
        if (audio.paused) void audio.play().catch(() => {});
        return;
      }
      start(ref, target);
    },
    [start]
  );

  const index = useMemo(
    () => (current ? queue.findIndex((q) => q.key === current.key) : -1),
    [queue, current]
  );

  const step = useCallback(
    (delta: number) => {
      if (queue.length === 0) return;
      const from = currentRef.current
        ? queue.findIndex((q) => q.key === currentRef.current!.key)
        : -1;
      // Entrée sortie de la file entre-temps — tri changé, fichier détaché,
      // titre supprimé : on repart d'un bout plutôt que de ne rien faire.
      const target =
        from === -1
          ? delta > 0
            ? 0
            : queue.length - 1
          : (from + delta + queue.length) % queue.length;
      start(queue[target]);
    },
    [queue, start]
  );

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => step(-1), [step]);

  const seek = useCallback((seconds: number) => {
    if (!Number.isFinite(seconds)) return;
    const target = Math.max(0, seconds);
    // Fichier pas encore posé sur l'élément : la demande attend son chargement,
    // sinon elle irait se perdre sur le morceau précédent.
    if (pendingLoadRef.current) {
      pendingSeekRef.current = target;
      setPosition(target);
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
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
    // Le chargement en cours vient d'être invalidé par le jeton : son `finally`
    // ne relâchera donc pas le drapeau, c'est à l'arrêt de le faire. Sans ça,
    // couper le lecteur pendant un chargement laissait `toggle()` muet.
    pendingLoadRef.current = false;
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

  /**
   * Reprise à la reconnexion.
   *
   * Ajustement d'état en cours de rendu, et non dans un effet : le dépôt
   * interdit `useEffect(() => setState(…))`, et l'entrée doit de toute façon
   * être posée avant la première peinture pour que la barre ne clignote pas
   * d'un état vide à l'état restauré.
   *
   * Aucune lecture n'est déclenchée : les navigateurs la refuseraient sans
   * geste de l'utilisateur, et démarrer du son tout seul à l'ouverture d'une
   * page serait de toute façon hostile. La barre s'affiche en pause, prête.
   */
  const [restored, setRestored] = useState(false);
  if (!restored && !loading && queue.length > 0) {
    setRestored(true);
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(LAST_ITEM_KEY);
    } catch {
      saved = null;
    }
    const item =
      (saved ? queue.find((q) => q.key === saved) : undefined) ??
      defaultQueueItem(queue, tracks);
    if (item) {
      setCurrent(item);
      setDuration(item.durationMs ? item.durationMs / 1000 : 0);
    }
  }

  // `currentRef` double `current` pour les lectures synchrones : les écouteurs
  // de l'élément `Audio`, créés une seule fois, ne verraient jamais l'état à
  // jour. `start` l'écrit déjà depuis son gestionnaire d'événement ; cet effet
  // couvre le seul chemin qui ne passe pas par lui, la reprise ci-dessus.
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  /**
   * Coupe le lecteur quand l'entrée en cours disparaît de la file.
   *
   * Supprimer une version, un titre ou un mix — ou en détacher l'audio —
   * retire son entrée de `queue`, mais l'élément `Audio` continue de jouer le
   * flux déjà chargé : le navigateur ne sait rien de ce qui vient de se
   * passer côté catalogue. Sans ce garde, détacher ou supprimer le fichier
   * d'un titre en cours d'écoute le laissait tourner indéfiniment sur
   * l'ancien fichier, potentiellement jusqu'à sa suppression réelle du bucket.
   *
   * Un changement d'`audioPath` sur la même entrée (remplacement de fichier)
   * ne déclenche rien ici : la clé reste la même, l'entrée reste dans la
   * file. Rejouer manuellement rechargera le nouveau fichier.
   *
   * Passe par un effet, pas par l'ajustement en rendu utilisé pour la reprise
   * ci-dessus : `stop()` lit `audioRef`, et React interdit d'accéder à un ref
   * pendant le rendu. `stop()` vide `current`, ce qui invalide la condition
   * dès le rendu suivant l'effet — pas de garde supplémentaire nécessaire.
   *
   * Ne coupe que si l'entrée a déjà été vue dans la file au moins une fois
   * (voir `presentSinceRef`) : un brouillon jamais enregistré n'y a jamais
   * figuré, ce n'est pas une disparition.
   */
  useEffect(() => {
    if (loading || !current) return;
    if (queue.some((q) => q.key === current.key)) {
      presentSinceRef.current = current.key;
      return;
    }
    if (presentSinceRef.current === current.key) stop();
  }, [queue, current, loading, stop]);

  const value = useMemo<PhonoPlayerContextValue>(
    () => ({
      current,
      isPlaying,
      position,
      duration,
      volume,
      error,
      queue,
      index,
      play,
      playAt,
      toggle,
      seek,
      setVolume,
      stop,
      next,
      previous,
    }),
    [
      current,
      isPlaying,
      position,
      duration,
      volume,
      error,
      queue,
      index,
      play,
      playAt,
      toggle,
      seek,
      setVolume,
      stop,
      next,
      previous,
    ]
  );

  return (
    <PhonoPlayerContext.Provider value={value}>
      {children}
    </PhonoPlayerContext.Provider>
  );
}
