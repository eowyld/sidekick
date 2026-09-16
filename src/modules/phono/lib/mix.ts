import type { Mix, MixFormat, MixTracklistItem } from "@/lib/sidekick-store";

export const MIX_FORMATS: { value: MixFormat; label: string }[] = [
  { value: "dj_set", label: "DJ set" },
  { value: "live_set", label: "Live set" },
  { value: "mix", label: "Mix" },
  { value: "podcast", label: "Émission" },
];

export function mixFormatLabel(format: MixFormat): string {
  return MIX_FORMATS.find((f) => f.value === format)?.label ?? format;
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
    format: m.format ?? "dj_set",
    isVideo: Boolean(m.isVideo),
    status: m.status ?? "en_production",
    releaseDate: m.releaseDate ?? "",
    // Champs audio laissés tels quels : `undefined` signifie « pas de
    // fichier », et les coercer en chaîne vide ferait croire à un fichier
    // rattaché dont le chemin serait vide.
    tracklist: Array.isArray(m.tracklist)
      ? m.tracklist.map((item) => ({
          id: item.id,
          artist: item.artist ?? "",
          label: item.label ?? "",
          time: item.time ?? "0:00",
        }))
      : [],
  };
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

      return {
        id: newItemId(),
        artist: rest.trim(),
        label,
        time: time || "0:00",
      };
    });
}

/**
 * Rendu texte pour Mixcloud, Resident Advisor ou une déclaration SACEM.
 *
 * Format identique à la fonction historique de `CatalogPage.tsx` — c'est celui
 * que l'utilisateur colle déjà sur ces plateformes : `M:SS - Artiste – Label`.
 *
 * ⚠️ Ce format n'est volontairement PAS symétrique de `parseTracklist`.
 *
 * Il reproduit à l'identique la sortie historique, celle que l'artiste colle
 * déjà chez Mixcloud — la changer casserait son habitude sans le prévenir.
 *
 * L'aller-retour copier puis recoller ne peut pas fonctionner, et ce n'est pas
 * un manque d'implémentation : le champ `artist` contient en pratique
 * « Artiste – Titre », et le label est joint par le même séparateur. Une ligne
 * « 0:00 - Bicep – Glue » est donc indécidable — « Glue » est-il la fin du titre
 * ou le label ? Aucune heuristique ne tranche sans se tromper une fois sur deux.
 *
 * `parseTracklist` reconnaît la forme `[Label]`, qui est la convention des
 * tracklists publiées et donc ce qu'on colle depuis l'extérieur. Les deux
 * fonctions servent deux usages opposés : importer ce qui vient d'ailleurs,
 * exporter vers la plateforme de l'artiste.
 */
export function formatTracklistForCopy(items: MixTracklistItem[]): string {
  return items
    .map((item) => {
      const time = (item.time || "0:00").trim();
      const artist = (item.artist || "").trim();
      const label = (item.label || "").trim();
      const part = [artist, label].filter(Boolean).join(" – ");
      return part ? `${time} - ${part}` : time;
    })
    .join("\n");
}

/** Durée totale déduite du dernier timecode, ex. « 1 h 04 ». */
export function tracklistDuration(items: MixTracklistItem[]): string | null {
  const seconds = items
    .map((i) => {
      const parts = (i.time || "").split(":").map((n) => parseInt(n, 10));
      if (parts.some(Number.isNaN)) return 0;
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      return 0;
    })
    .reduce((max, s) => Math.max(max, s), 0);

  if (seconds === 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}
