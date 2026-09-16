// src/modules/phono/lib/track.ts
import type {
  PhonoRole,
  ReleaseStatus,
  Track,
  TrackGuest,
  TrackVersion,
} from "@/lib/sidekick-store";

export const ROLES: { value: PhonoRole; label: string }[] = [
  { value: "artiste_principal", label: "Artiste principal" },
  { value: "artiste_secondaire", label: "Artiste secondaire" },
  { value: "musicien_interprete", label: "Musicien interprète" },
  { value: "chanteur_interprete", label: "Chanteur interprète" },
  { value: "beatmaker", label: "Beatmaker" },
  { value: "directeur_musical", label: "Directeur artistique" },
  { value: "realisateur", label: "Réalisateur" },
  { value: "compositeur", label: "Compositeur" },
  { value: "ingenieur_mixage", label: "Ingé Mixage" },
  { value: "ingenieur_mastering", label: "Ingé Mastering" },
];

/** `ingenieur_du_son` est un ancien libellé fusionné dans `ingenieur_mixage`. */
export function normalizePhonoRole(role: PhonoRole): PhonoRole {
  if (role === "ingenieur_du_son") return "ingenieur_mixage";
  return role;
}

export function roleLabel(role: PhonoRole): string {
  const normalized = normalizePhonoRole(role);
  return ROLES.find((r) => r.value === normalized)?.label ?? normalized;
}

/**
 * Convertit les invités vers `TrackGuest[]`, quelle que soit la forme stockée.
 * Une entrée `string` suit l'ancien format `"Nom – Rôle"` (tiret demi-cadratin
 * entouré d'espaces).
 */
export function normalizeTrackGuests(
  raw: Array<string | TrackGuest> | undefined
): TrackGuest[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): TrackGuest => {
      if (typeof entry === "string") {
        // Découpe sur la DERNIÈRE occurrence : le rôle vient d'une liste fermée
        // (`ROLES`) dont aucun libellé ne contient " – ", alors qu'un nom
        // d'artiste peut en contenir. Couper à la fin récupère donc « Duo A – B
        // – Compositeur » correctement, là où un split classique le tronquait.
        const sep = entry.lastIndexOf(" – ");
        const name = sep === -1 ? entry : entry.slice(0, sep);
        const role = sep === -1 ? "" : entry.slice(sep + 3);
        return { name: name.trim(), role: role.trim() };
      }
      return {
        name: String(entry?.name ?? "").trim(),
        role: String(entry?.role ?? "").trim(),
      };
    })
    .filter((g) => g.name !== "");
}

export function newTrackId(): string {
  return "t-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

export function newVersionId(): string {
  return "v-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

export function defaultVersion(label = "Original"): TrackVersion {
  return { id: newVersionId(), label };
}

/**
 * Nom de version attendu à chaque étape du pipeline.
 *
 * Demander « Original » sur un titre en production n'a pas de sens : le master
 * n'existe pas encore, et l'artiste se retrouve à renommer une version qu'il
 * n'a pas choisie. « Original » reste le nom du titre publié — c'est la version
 * que les plateformes connaissent.
 */
const SUGGESTED_VERSION_LABEL: Record<ReleaseStatus, string> = {
  en_production: "Démo",
  mixe: "Pré-mix",
  masterise: "Master",
  publie: "Original",
};

export function suggestedVersionLabel(status: ReleaseStatus | undefined): string {
  return SUGGESTED_VERSION_LABEL[status ?? "en_production"];
}

const SUGGESTED_LABELS = new Set(Object.values(SUGGESTED_VERSION_LABEL));

/**
 * Vrai si la version n'est encore qu'une suggestion : aucun fichier, aucun
 * ISRC, et un nom que l'artiste n'a pas saisi lui-même. Seules ces versions-là
 * suivent le statut en silence — une version qui porte un fichier a été déposée
 * sous ce nom, et les liens d'écoute publiés l'ont dénormalisé.
 */
export function isSuggestedVersion(version: TrackVersion): boolean {
  return (
    !version.audioPath &&
    (version.isrc ?? "").trim() === "" &&
    SUGGESTED_LABELS.has(version.label.trim())
  );
}

/** Comble les champs absents d'un titre venu de la base. */
export function normalizeTrack(t: Track): Track {
  return {
    ...t,
    id: t.id,
    title: t.title ?? "",
    mainArtist: t.mainArtist ?? "",
    role: normalizePhonoRole((t.role as PhonoRole) ?? "artiste_principal"),
    guestArtists: normalizeTrackGuests(t.guestArtists),
    isrc: t.isrc ?? "",
    releaseDate: t.releaseDate ?? "",
    versions: Array.isArray(t.versions) ? t.versions : [],
    notes: t.notes ?? "",
    // Coercés en chaîne vide, jamais laissés à `undefined` : ces champs
    // alimentent des <Input value={…}> et un passage undefined → string ferait
    // basculer React du mode contrôlé au mode non contrôlé en cours de saisie.
    genre: t.genre ?? "",
    distribution: t.distribution ?? "",
    editor: t.editor ?? "",
    label: t.label ?? "",
    status: t.status ?? "en_production",
    selfProduced: t.selfProduced !== false,
  };
}

/** ISRC effectif d'une version : le sien, sinon celui hérité du titre. */
export function effectiveIsrc(track: Track, version: TrackVersion): string {
  return (version.isrc ?? "").trim() || (track.isrc ?? "").trim();
}

export function versionsWithAudio(track: Track): TrackVersion[] {
  return (track.versions ?? []).filter((v) => Boolean(v.audioPath));
}
