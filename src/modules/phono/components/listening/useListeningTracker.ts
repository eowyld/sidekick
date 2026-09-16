"use client";

import { useCallback, useEffect, useRef } from "react";

/** Un heartbeat toutes les 10 s : assez fin pour un taux d'écoute juste, assez rare pour rester discret. */
const HEARTBEAT_MS = 10_000;

interface TrackerOptions {
  slug: string;
  sessionId: string | null;
}

/**
 * Accumule le temps réellement écouté et le pousse par paquets.
 *
 * On mesure le temps de lecture, pas le temps passé sur la page : un onglet
 * ouvert et en pause ne doit pas gonfler le taux d'écoute rapporté à l'artiste.
 */
export function useListeningTracker({ slug, sessionId }: TrackerOptions) {
  const pendingMs = useRef(0);
  const currentItem = useRef<string | null>(null);
  const lastPosition = useRef(0);

  const send = useCallback(
    async (
      itemId: string,
      kind: "play" | "progress",
      listenedMsDelta: number,
      positionMs: number,
      completed: boolean
    ) => {
      if (!sessionId) return;
      try {
        await fetch(`/api/listening/${slug}/event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            itemId,
            kind,
            listenedMsDelta,
            positionMs,
            completed,
          }),
        });
      } catch {
        // Un heartbeat perdu ne doit jamais interrompre l'écoute.
      }
    },
    [sessionId, slug]
  );

  const flush = useCallback(
    (completed = false) => {
      const itemId = currentItem.current;
      if (!itemId || pendingMs.current <= 0) return;
      const delta = pendingMs.current;
      pendingMs.current = 0;
      void send(itemId, "progress", delta, lastPosition.current, completed);
    },
    [send]
  );

  const onPlay = useCallback(
    (itemId: string) => {
      flush();
      currentItem.current = itemId;
      pendingMs.current = 0;
      void send(itemId, "play", 0, 0, false);
    },
    [flush, send]
  );

  /** Appelé sur `timeupdate` : accumule le temps écoulé depuis le dernier appel. */
  const onProgress = useCallback(
    (itemId: string, positionMs: number, deltaMs: number) => {
      currentItem.current = itemId;
      lastPosition.current = positionMs;
      // Un delta négatif vient d'un seek arrière, un delta énorme d'un saut :
      // ni l'un ni l'autre n'est du temps réellement écouté.
      if (deltaMs > 0 && deltaMs < 2000) pendingMs.current += deltaMs;
    },
    []
  );

  const onEnded = useCallback(() => flush(true), [flush]);

  useEffect(() => {
    const timer = setInterval(() => flush(), HEARTBEAT_MS);
    // Le départ du visiteur est le moment le plus important à capturer :
    // sans cela, la dernière tranche d'écoute serait systématiquement perdue.
    const onHide = () => flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      flush();
    };
  }, [flush]);

  return { onPlay, onProgress, onEnded, flush };
}
