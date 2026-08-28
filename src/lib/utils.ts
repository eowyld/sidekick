export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Affiche une heure sans secondes (ex. événements perso stockés en HH:MM:SS). */
export function formatTimeForDisplay(time: string): string {
  const t = String(time).trim();
  const m = t.match(/^(\d{1,2}:\d{2})(?::\d{2})?/);
  return m ? m[1] : t;
}

