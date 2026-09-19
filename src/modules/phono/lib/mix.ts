import type { Mix, MixFormat, MixTracklistItem } from "@/lib/sidekick-store";

/**
 * Deux formats, et deux seulement : un set enregistré en club ou en radio est
 * un DJ set, un concert capté est un Live. Les nuances d'avant (« Mix »,
 * « Émission ») ne changeaient rien à ce que l'artiste en fait, et remplissaient
 * le catalogue de catégories qu'il fallait choisir sans y penser.
 */
export const MIX_FORMATS: { value: MixFormat; label: string }[] = [
  { value: "live_set", label: "Live" },
  { value: "dj_set", label: "DJ set" },
];

/**
 * Anciennes valeurs, ramenées sur `dj_set` : elles désignaient toutes un set
 * enregistré, pas un concert. Appliqué par `normalizeMix`, donc aussi bien à
 * l'affichage qu'au formulaire — un mix repris en édition repart sur une valeur
 * que le sélecteur propose.
 */
const LEGACY_FORMATS: Record<string, MixFormat> = {
  mix: "dj_set",
  podcast: "dj_set",
};

export function mixFormat(format: unknown): MixFormat {
  if (typeof format !== "string") return "dj_set";
  if (MIX_FORMATS.some((f) => f.value === format)) return format as MixFormat;
  return LEGACY_FORMATS[format] ?? "dj_set";
}

export function mixFormatLabel(format: MixFormat): string {
  const value = mixFormat(format);
  return MIX_FORMATS.find((f) => f.value === value)?.label ?? value;
}

export function newMixId(): string {
  return "m-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

/**
 * `Date.now()` seul entre en collision sur un collage de 20 lignes traité en
 * boucle serrée (même milliseconde). Un compteur de module strictement croissant
 * garantit l'unicité de tous les ids d'items produits dans la session, quelle
 * que soit la résolution de l'horloge.
 */
let itemSeq = 0;
function newItemId(): string {
  itemSeq += 1;
  return (
    "mt-" +
    Date.now().toString(36) +
    "-" +
    itemSeq.toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

export function normalizeMix(m: Mix): Mix {
  return {
    ...m,
    title: m.title ?? "",
    artists: m.artists ?? "",
    publishedOn: m.publishedOn ?? "",
    format: mixFormat(m.format),
    isVideo: Boolean(m.isVideo),
    status: m.status ?? "en_production",
    releaseDate: m.releaseDate ?? "",
    // Champs audio laissés tels quels : `undefined` signifie « pas de
    // fichier », et les coercer en chaîne vide ferait croire à un fichier
    // rattaché dont le chemin serait vide.
    tracklist: Array.isArray(m.tracklist)
      ? m.tracklist.map(normalizeTracklistItem)
      : [],
  };
}

/**
 * Sépare « Artiste – Titre » en deux champs.
 *
 * Les deux moitiés d'une ligne de tracklist sont traditionnellement jointes par
 * un tiret, quel qu'il soit (demi-cadratin, cadratin, trait d'union entouré
 * d'espaces). Seule la **première** occurrence coupe : « Bicep – Glue - Extended
 * Mix » a pour titre « Glue - Extended Mix », et non « Glue ».
 *
 * Un trait d'union collé (« Jay-Z ») n'est jamais un séparateur : il lui faut
 * des espaces autour, contrairement aux tirets typographiques qui, eux, ne
 * servent qu'à ça dans une tracklist.
 */
export function splitArtistTitle(raw: string): { artist: string; title: string } {
  const sep = raw.match(/\s*[–—]\s*|\s+-\s+/);
  if (!sep || sep.index === undefined) return { artist: raw.trim(), title: "" };
  return {
    artist: raw.slice(0, sep.index).trim(),
    title: raw.slice(sep.index + sep[0].length).trim(),
  };
}

/**
 * Item de tracklist remis d'aplomb.
 *
 * Reprend le découpage artiste / titre pour les lignes enregistrées avant qu'il
 * existe : sans ça, elles afficheraient « Bicep – Glue » entier dans le champ
 * Artiste et un champ Titre vide.
 */
function normalizeTracklistItem(item: MixTracklistItem): MixTracklistItem {
  const artist = item.artist ?? "";
  const title = item.title ?? "";
  const split = title === "" ? splitArtistTitle(artist) : { artist, title };
  return {
    id: item.id,
    artist: split.artist,
    title: split.title,
    label: item.label ?? "",
    time: item.time ?? "",
  };
}

/** Minutes et secondes d'un timecode, pour les deux champs de saisie. */
export function splitTimecode(time: string | undefined): {
  minutes: string;
  seconds: string;
} {
  const total = timecodeToSeconds(time);
  if (total === null) return { minutes: "", seconds: "" };
  return {
    minutes: String(Math.floor(total / 60)),
    seconds: String(total % 60).padStart(2, "0"),
  };
}

/**
 * Dernière seconde atteignable d'un fichier, ou `null` si sa durée est inconnue.
 *
 * Un timecode posé au-delà de la fin envoie le lecteur dans le vide : la
 * lecture reste muette ou se termine aussitôt, et la ligne surlignée ne
 * correspond plus à rien. On s'arrête une seconde avant la fin, pour qu'un saut
 * laisse toujours quelque chose à entendre.
 */
export function lastPlayableSecond(durationMs: number | undefined): number | null {
  if (!durationMs || durationMs <= 0) return null;
  return Math.max(0, Math.floor(durationMs / 1000) - 1);
}

/** Les lignes dont le timecode dépasse la durée du fichier. */
export function itemsBeyondDuration(
  items: MixTracklistItem[],
  maxSeconds: number | null
): MixTracklistItem[] {
  if (maxSeconds === null) return [];
  return items.filter((i) => {
    const at = timecodeToSeconds(i.time);
    return at !== null && at > maxSeconds;
  });
}

/**
 * Ramène les timecodes trop tardifs dans la durée du fichier.
 *
 * Sert au rattrapage : une tracklist peut être saisie avant que le fichier
 * existe, et l'arrivée de celui-ci rend soudain caduques des timecodes qui
 * étaient valables. Plutôt que de les corriger dans le dos de l'artiste, la
 * page le lui signale et déclenche cette fonction à sa demande.
 */
export function clampTracklistToDuration(
  items: MixTracklistItem[],
  maxSeconds: number | null
): MixTracklistItem[] {
  if (maxSeconds === null) return items;
  return items.map((item) => {
    const at = timecodeToSeconds(item.time);
    if (at === null || at <= maxSeconds) return item;
    return {
      ...item,
      time: joinTimecode(
        String(Math.floor(maxSeconds / 60)),
        String(maxSeconds % 60)
      ),
    };
  });
}

/**
 * Recompose un timecode depuis les deux champs.
 *
 * Les minutes ne sont pas bornées à 59 : un DJ set d'une heure et demie a des
 * titres à « 95:20 », et exiger un troisième champ d'heures pour ça alourdirait
 * chaque ligne. Vide des deux côtés = pas de timecode, la ligne existe quand
 * même mais ne sera pas cliquable au catalogue.
 */
export function joinTimecode(
  minutes: string,
  seconds: string,
  /**
   * Dernière seconde atteignable du fichier rattaché, quand il y en a un. La
   * saisie ne peut alors pas sortir du morceau : on la borne à la frappe plutôt
   * que de refuser l'enregistrement après coup.
   */
  maxSeconds: number | null = null
): string {
  const m = minutes.trim();
  const s = seconds.trim();
  if (m === "" && s === "") return "";
  const mm = m === "" ? 0 : parseInt(m, 10) || 0;
  const ss = Math.min(59, parseInt(s, 10) || 0);
  const total =
    maxSeconds === null ? mm * 60 + ss : Math.min(mm * 60 + ss, maxSeconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Découpe un tracklisting collé.
 *
 * Reconnaît, dans l'ordre de préférence :
 *   `00:00 Artiste – Titre [Label]`
 *   `1. 00:00 Artiste - Titre (Label)`
 *   `Artiste – Titre`
 *
 * Tolérant par construction : une ligne non reconnue devient un item dont le
 * champ `artist` porte la ligne brute, à corriger à la main. Perdre une ligne
 * silencieusement serait pire que la rendre imparfaitement.
 */
export function parseTracklist(raw: string): MixTracklistItem[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // Numérotation de tête : « 1. », « 01) », « 12 - »
      let rest = line.replace(/^\d{1,3}\s*[.)\-–]\s*/, "");

      // Timecode : M:SS, MM:SS ou H:MM:SS
      let time = "";
      const timeMatch = rest.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]?\s*/);
      if (timeMatch) {
        time = timeMatch[1];
        rest = rest.slice(timeMatch[0].length);
      }

      // Label entre crochets ou parenthèses, en fin de ligne
      let label = "";
      const labelMatch = rest.match(/\s*[[(]([^\])]+)[\])]\s*$/);
      if (labelMatch) {
        label = labelMatch[1].trim();
        rest = rest.slice(0, labelMatch.index).trim();
      }

      const { artist, title } = splitArtistTitle(rest.trim());
      return { id: newItemId(), artist, title, label, time };
    });
}

/**
 * Rendu texte pour Mixcloud, Resident Advisor ou une déclaration SACEM :
 * `M:SS Artiste – Titre [Label]`.
 *
 * C'est la convention des tracklists publiées, et c'est aussi ce que
 * `parseTracklist` sait relire : depuis que l'artiste, le titre et le label
 * vivent dans trois champs distincts, copier puis recoller redonne la même
 * tracklist. L'ancien format joignait artiste et label par le même tiret, ce
 * qui rendait « 0:00 - Bicep – Glue » indécidable au retour.
 */
export function formatTracklistForCopy(items: MixTracklistItem[]): string {
  return items
    .map((item) => {
      const time = (item.time || "").trim();
      const work = [(item.artist || "").trim(), (item.title || "").trim()]
        .filter(Boolean)
        .join(" – ");
      const label = (item.label || "").trim();
      const line = [work, label ? `[${label}]` : ""].filter(Boolean).join(" ");
      return [time, line].filter(Boolean).join(" ");
    })
    .join("\n");
}

/**
 * Timecode en secondes, `null` si la saisie n'en est pas un.
 *
 * `null` et `0` disent deux choses différentes : un timecode illisible ne doit
 * pas envoyer le lecteur au début du mix comme si l'artiste avait écrit
 * « 0:00 ». C'est ce qui décide si la ligne est cliquable dans le catalogue.
 */
export function timecodeToSeconds(time: string | undefined): number | null {
  const raw = (time ?? "").trim();
  if (raw === "") return null;
  const parts = raw.split(":").map((n) => parseInt(n, 10));
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0] * 60;
  return null;
}

/** Durée totale déduite du dernier timecode, ex. « 1 h 04 ». */
export function tracklistDuration(items: MixTracklistItem[]): string | null {
  const seconds = items
    .map((i) => timecodeToSeconds(i.time) ?? 0)
    .reduce((max, s) => Math.max(max, s), 0);

  if (seconds === 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}
