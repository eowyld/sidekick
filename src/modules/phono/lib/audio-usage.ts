// src/modules/phono/lib/audio-usage.ts

"use client";

import { useMemo } from "react";
import { usePhonoData } from "@/hooks/usePhonoData";
import type { Track } from "@/lib/sidekick-store";

/**
 * Chemin de fichier → libellés des entités du catalogue qui le référencent.
 *
 * Un même fichier du Drive peut être rattaché à plusieurs versions ou mix :
 * rien ne l'interdit, et c'est parfois voulu (un master servant de version
 * « originale » et de face A). Ce relevé ne bloque rien, il sert seulement à
 * le dire au moment du choix, pour que la seconde liaison soit délibérée.
 */
export type DriveAudioUsage = Map<string, string[]>;

/** « Titre · Radio edit », ou « Titre » si la version n'est pas nommée. */
function versionLabel(track: Track, label: string): string {
  const title = track.title?.trim() || "Sans titre";
  const version = label?.trim();
  return version ? `${title} · ${version}` : title;
}

/**
 * Relève, pour chaque fichier audio, les versions de titre et les mix qui le
 * référencent.
 *
 * S'appuie sur le cache SWR partagé de `usePhonoData` : aucune requête
 * supplémentaire n'est émise, le catalogue est déjà chargé par la page qui
 * ouvre le sélecteur.
 *
 * `overrideTrack` remplace la version en base du titre passé : la page
 * d'édition d'un titre travaille sur un brouillon non enregistré, et c'est
 * justement là qu'on risque de rattacher deux fois le même fichier à deux
 * versions voisines. Sans lui, les versions du brouillon seraient invisibles.
 */
export function useDriveAudioUsage(overrideTrack?: Track): DriveAudioUsage {
  const { tracks, mixes } = usePhonoData();

  return useMemo(() => {
    const usage: DriveAudioUsage = new Map();

    const add = (path: string | undefined, label: string) => {
      if (!path) return;
      const existing = usage.get(path);
      if (existing) {
        if (!existing.includes(label)) existing.push(label);
      } else {
        usage.set(path, [label]);
      }
    };

    const catalog = overrideTrack
      ? [...tracks.filter((t) => t.id !== overrideTrack.id), overrideTrack]
      : tracks;

    for (const track of catalog) {
      for (const version of track.versions ?? []) {
        add(version.audioPath, versionLabel(track, version.label));
      }
    }
    for (const mix of mixes) {
      add(mix.audioPath, mix.title?.trim() || "Mix sans titre");
    }

    return usage;
  }, [tracks, mixes, overrideTrack]);
}
