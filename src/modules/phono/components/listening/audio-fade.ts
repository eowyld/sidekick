/**
 * Fondus de volume sur un élément `<audio>`.
 *
 * Web Audio donnerait des rampes échantillon par échantillon, mais brancher un
 * `MediaElementSource` casse la lecture dès que le flux vient d'une autre
 * origine ou qu'un `AudioContext` est suspendu par le navigateur — trop
 * fragile pour une page envoyée à un label. Une rampe en `requestAnimationFrame`
 * sur `volume` est suffisante à ces durées et ne casse jamais la lecture.
 */

const running = new WeakMap<HTMLAudioElement, number>();

/** Coupe un fondu en cours sur cet élément, sans toucher à son volume. */
export function cancelFade(audio: HTMLAudioElement): void {
  const frame = running.get(audio);
  if (frame !== undefined) {
    cancelAnimationFrame(frame);
    running.delete(audio);
  }
}

/**
 * Amène le volume de `audio` à `target` en `durationMs`, puis appelle `onDone`.
 * Un nouveau fondu sur le même élément remplace le précédent.
 */
export function fadeVolume(
  audio: HTMLAudioElement,
  target: number,
  durationMs: number,
  onDone?: () => void
): void {
  cancelFade(audio);
  const clamped = Math.min(1, Math.max(0, target));
  if (durationMs <= 0) {
    audio.volume = clamped;
    onDone?.();
    return;
  }

  const from = audio.volume;
  const start = performance.now();
  // Courbes à puissance constante (sinus en montée, cosinus en descente) :
  // deux titres différents qui se croisent en linéaire donnent un creux audible
  // au milieu du fondu, la somme des puissances tombant à la moitié.
  const rising = clamped > from;

  const step = (now: number) => {
    const ratio = Math.min(1, (now - start) / durationMs);
    const curve = rising ? Math.sin((ratio * Math.PI) / 2) : 1 - Math.cos((ratio * Math.PI) / 2);
    audio.volume = Math.min(1, Math.max(0, from + (clamped - from) * curve));
    if (ratio < 1) {
      running.set(audio, requestAnimationFrame(step));
      return;
    }
    running.delete(audio);
    onDone?.();
  };

  running.set(audio, requestAnimationFrame(step));
}
