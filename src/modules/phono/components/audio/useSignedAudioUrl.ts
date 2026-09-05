"use client";

import { useCallback, useRef } from "react";

interface SignedEntry {
  url: string;
  expiresAt: number;
}

export interface SignedUrlResult {
  url: string;
  /** L'URL sort-elle du cache ? Le provider s'en sert pour décider d'une reprise. */
  fromCache: boolean;
}

/** Marge de sécurité : une URL qui expire dans moins d'une minute est resignée. */
const EXPIRY_MARGIN_MS = 60_000;
/** Borne le cache : le catalogue peut contenir des centaines de versions. */
const URL_CACHE_MAX = 50;

/**
 * Cache mémoire des URLs signées du bucket `drive`.
 *
 * Le provider n'a jamais à connaître la `Map`, la fraîcheur ni le plafond :
 * il demande une URL, et purge celle qui s'est révélée invalide.
 */
export function useSignedAudioUrl() {
  const cacheRef = useRef<Map<string, SignedEntry>>(new Map());

  const getSignedUrl = useCallback(
    async (audioPath: string): Promise<SignedUrlResult> => {
      const cached = cacheRef.current.get(audioPath);
      if (cached && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()) {
        return { url: cached.url, fromCache: true };
      }

      const res = await fetch("/api/phono/signed-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioPath }),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error("Session expirée, reconnectez-vous.");
        }
        if (res.status === 404) {
          throw new Error("Lecture impossible : fichier introuvable.");
        }
        throw new Error("Lecture impossible pour le moment.");
      }

      const data = (await res.json()) as { url: string; expiresAt: number };
      cacheRef.current.set(audioPath, {
        url: data.url,
        expiresAt: data.expiresAt,
      });
      if (cacheRef.current.size > URL_CACHE_MAX) {
        // Ordre d'insertion garanti par `Map` : la plus ancienne sort.
        const oldest = cacheRef.current.keys().next().value;
        if (oldest !== undefined) cacheRef.current.delete(oldest);
      }
      return { url: data.url, fromCache: false };
    },
    []
  );

  /** Oublie une URL rejetée par le navigateur, typiquement expirée. */
  const invalidate = useCallback((audioPath: string) => {
    cacheRef.current.delete(audioPath);
  }, []);

  return { getSignedUrl, invalidate };
}
