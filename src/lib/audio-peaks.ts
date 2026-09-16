/**
 * Décodage d'un fichier audio dans le navigateur pour en extraire la durée et
 * une empreinte de forme d'onde.
 *
 * Tout se passe côté client : aucun transcodage ni traitement serveur n'est
 * nécessaire, et les peaks sont stockés une fois pour toutes avec la version
 * du titre. La page publique n'a donc jamais à télécharger l'audio pour
 * dessiner la waveform.
 */

/** Nombre de barres de la waveform. 400 suffit à un rendu lisible sur desktop. */
export const PEAKS_RESOLUTION = 400;

export interface AudioPeaksResult {
  peaks: number[];
  durationMs: number;
}

export async function computeAudioPeaks(file: File): Promise<AudioPeaksResult> {
  const arrayBuffer = await file.arrayBuffer();

  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioCtx) {
    throw new Error("Votre navigateur ne permet pas de lire ce fichier audio.");
  }

  const context = new AudioCtx();
  try {
    const buffer = await context.decodeAudioData(arrayBuffer);
    const channel = buffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channel.length / PEAKS_RESOLUTION));
    const peaks: number[] = [];

    for (let i = 0; i < PEAKS_RESOLUTION; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize; j++) {
        const value = Math.abs(channel[start + j] ?? 0);
        if (value > max) max = value;
      }
      peaks.push(max);
    }

    // Normalisation : un morceau mixé bas doit produire une waveform aussi
    // lisible qu'un master fort. On borne pour éviter la division par zéro
    // sur un fichier silencieux.
    const loudest = Math.max(...peaks, 0.0001);
    const normalized = peaks.map((p) => Number((p / loudest).toFixed(3)));

    return {
      peaks: normalized,
      durationMs: Math.round(buffer.duration * 1000),
    };
  } finally {
    await context.close();
  }
}

/** Formate une durée en `m:ss`, pour la tracklist et la barre de lecture. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0:00";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
