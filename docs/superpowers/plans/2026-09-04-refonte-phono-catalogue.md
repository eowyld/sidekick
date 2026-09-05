# Refonte du Catalogue Phono — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Découper `CatalogPage.tsx` (4540 lignes) en modules focalisés, refondre l'UI des trois onglets selon le principe « lire ≠ éditer », et livrer l'hébergement audio par version avec lecteur, gestion et export de métadonnées branché dessus.

**Architecture:** Approche verticale. Une étape 0 extrait le métier pur vers `src/modules/phono/lib/` sans changement visible, puis chaque onglet est livré fini et vérifiable avant de passer au suivant. L'ancien `CatalogPage` rétrécit progressivement au lieu de disparaître d'un bloc.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind, Radix UI, SWR, Supabase (Postgres + Storage), `@dnd-kit` (déjà présent), JSZip, `lucide-react`.

**Spec:** [docs/superpowers/specs/2026-09-03-refonte-phono-catalogue-design.md](../specs/2026-09-03-refonte-phono-catalogue-design.md)

---

## Conventions de ce plan — à lire avant de commencer

**Pas de tests automatisés.** Le dépôt n'a pas de suite de tests (`CLAUDE.md`). Le cycle TDD habituel est remplacé par, à chaque tâche :

```bash
npx tsc --noEmit && npm run build
npx eslint <les fichiers touchés par la tâche>
```

> **`npm run lint` ne peut pas servir de garde-fou** : le dépôt compte déjà 204 problèmes (80 erreurs) hérités, dans `app/(blog)/`, `Sidebar.tsx`, `Tasks.tsx`, `tailwind.config.ts` et d'autres fichiers hors périmètre. Lancer `eslint .` renverra toujours un échec, quoi que fasse la tâche. Le lint est donc **ciblé sur les fichiers touchés**, qui eux doivent être propres. Nettoyer la dette existante n'appartient pas à ce chantier.

puis un **parcours manuel en dev local** (`npm run dev`) dont chaque tâche précise les gestes exacts et le résultat attendu. Une tâche n'est pas finie tant que ce parcours n'a pas été fait.

**Commits.** `CLAUDE.md` impose de ne commiter que sur demande explicite de l'utilisateur. Les commandes de commit sont écrites dans le plan, mais **ne les exécute pas sans que l'utilisateur l'ait demandé**. Demande à la fin de chaque phase.

**Niveau de détail du code.** Le code complet est donné pour tout ce qui est exact ou piégeux : modules `lib/`, migrations SQL, mappers, contrats de types, interfaces de props. Pour les composants d'affichage, le plan fige **l'interface de props, la structure et les tokens de design** ; le balisage interne est écrit à l'implémentation en suivant les composants de référence nommés. Écrire 4000 lignes de JSX dans un plan reviendrait à écrire l'implémentation deux fois.

**Design system.** Fond `#101010`, texte `#F5F5F5`, accent `#F0FF00`. Conteneur de section :
`rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5`. Chiffres en `font-extralight tabular-nums`. Icônes `lucide-react` uniquement. Aucune classe claire (`bg-white`, `text-gray-900`…).

**Références visuelles** à imiter : `src/modules/live/components/LiveOverviewPage.tsx` (sections, barre segmentée, légende cliquable), `src/modules/tasks/components/TaskCard.tsx` + `TaskModal.tsx` (liste lisible + modale d'édition), `src/modules/tasks/components/BacklogPanel.tsx` (`@dnd-kit`).

**Notifications.** Le shell monte déjà `<Toaster richColors theme="dark" />` de `sonner` (`app/(app)/layout.tsx`). Utiliser `toast.success(…)` / `toast.error(…)` pour les retours transitoires — jamais `alert()`, que le code actuel emploie pour les erreurs de métadonnées. Les erreurs qui bloquent une action restent affichées **dans** le dialog concerné, là où l'utilisateur peut agir.

---

## Structure des fichiers

**À créer**

| Fichier | Responsabilité |
|---|---|
| `src/modules/phono/lib/track.ts` | Normalisation d'un titre, rôles, invités, génération d'id |
| `src/modules/phono/lib/release-status.ts` | Libellés, ordre, couleurs, propagation de statut |
| `src/modules/phono/lib/album.ts` | Normalisation d'album, contributeurs calculés |
| `src/modules/phono/lib/metadata-payload.ts` | Construction du payload de tags ffmpeg |
| `src/modules/phono/lib/mix.ts` | Normalisation d'un mix, parser et export de tracklist |
| `src/modules/phono/lib/audio-limits.ts` | Plafonds de taille et de quota, pilotés par l'environnement |
| `src/modules/phono/components/CatalogHeader.tsx` | Bandeau « état du catalogue » + filtres cliquables |
| `src/modules/phono/components/tracks/TracksTab.tsx` | Liste des titres, recherche, filtres, tri |
| `src/modules/phono/components/tracks/TrackRow.tsx` | Une ligne de titre, lecture seule |
| `src/modules/phono/components/tracks/TrackDialog.tsx` | Formulaire unique création + édition d'un titre |
| `src/modules/phono/components/tracks/VersionList.tsx` | Versions d'un titre, audio, actions |
| `src/modules/phono/components/albums/AlbumsTab.tsx` | Grille des releases |
| `src/modules/phono/components/albums/AlbumCard.tsx` | Une carte release |
| `src/modules/phono/components/albums/AlbumDialog.tsx` | Formulaire release, deux colonnes |
| `src/modules/phono/components/albums/TracklistComposer.tsx` | Composition de tracklist, drag & drop |
| `src/modules/phono/components/mixes/MixesTab.tsx` | Liste des mixes |
| `src/modules/phono/components/mixes/MixRow.tsx` | Une ligne de mix |
| `src/modules/phono/components/mixes/MixDialog.tsx` | Formulaire mix |
| `src/modules/phono/components/mixes/TracklistEditor.tsx` | Tracklist : collage en masse, édition, export |
| `src/modules/phono/components/audio/PhonoPlayerProvider.tsx` | Contexte de lecture |
| `src/modules/phono/components/audio/AudioPlayerBar.tsx` | Barre de lecture persistante |
| `src/modules/phono/components/audio/DrivePickerDialog.tsx` | Rattachement d'un fichier du Drive |
| `src/modules/phono/components/audio/StorageSummary.tsx` | Vue d'ensemble du stockage, orphelins |
| `src/modules/phono/components/metadata/MetadataExportDialog.tsx` | Export de tags, 3 portées |
| `app/api/phono/signed-audio/route.ts` | URL signée pour lire un `audioPath` |
| `supabase/migrations/20260904090000_phono_mixes.sql` | Renommage table + colonne `format` |

**À modifier**

| Fichier | Changement |
|---|---|
| `src/lib/sidekick-store.ts` | `TrackVersion.isrc`, `TrackGuest`, `Mix`, `MixFormat` |
| `src/hooks/usePhonoData.ts` | Mappers tolérants, `mixes` en remplacement de `podcasts` |
| `src/lib/drive-db.ts` | Plafonds paramétrables, `getPublicUrl` remplacé |
| `src/modules/phono/components/CatalogPage.tsx` | Rétrécit à ~150 lignes au fil des phases |
| `app/api/phono/apply-metadata/route.ts` | Accepte un `audioPath` résolu côté serveur |
| `.env.example` | `NEXT_PUBLIC_MAX_AUDIO_MB`, `NEXT_PUBLIC_STORAGE_QUOTA_GB` |

**À déplacer**

`src/modules/phono/components/listening/VersionAudioField.tsx` → `src/modules/phono/components/audio/VersionAudioField.tsx`. Il est importé par `CatalogPage.tsx` et par le chantier liens d'écoute — vérifier tous les imports avec `grep -rn "VersionAudioField" src/ app/` avant de déplacer.

---

# Phase 0 — Socle

Aucun changement visible à l'écran. C'est le critère de vérification de toute la phase : l'application doit se comporter exactement comme avant.

## Task 1 : Plafonds de stockage pilotés par l'environnement

**Files:**
- Create: `src/modules/phono/lib/audio-limits.ts`
- Modify: `src/lib/drive-db.ts:724-726`
- Modify: `.env.example`

- [ ] **Step 1 : Créer le module de plafonds**

```ts
// src/modules/phono/lib/audio-limits.ts

/**
 * Plafonds de stockage audio, pilotés par l'environnement.
 *
 * Les valeurs par défaut correspondent au plan Supabase Free. Le passage à Pro
 * est planifié à la sortie de l'alpha (voir ALPHA.md, « Recette de
 * déploiement ») : il se fait alors en changeant ces deux variables sur Vercel,
 * sans redéploiement de code.
 *
 * Un master WAV 44,1 kHz / 24 bits de 4 minutes pèse ~64 Mo : au-dessus du
 * plafond Free de 50 Mo. C'est attendu, et le message d'erreur doit le dire.
 */

function readNumber(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Plafond par fichier audio, en octets. Défaut : 50 Mo (Supabase Free). */
export const MAX_AUDIO_BYTES =
  readNumber(process.env.NEXT_PUBLIC_MAX_AUDIO_MB, 50) * 1024 * 1024;

/** Quota de stockage par utilisateur, en octets. Défaut : 1 Go (Supabase Free). */
export const STORAGE_QUOTA_BYTES =
  readNumber(process.env.NEXT_PUBLIC_STORAGE_QUOTA_GB, 1) * 1024 * 1024 * 1024;

/** « 64,2 Mo », « 2,41 Go » — séparateur décimal français. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0).replace(".", ",")} Ko`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2).replace(".", ",")} Go`;
}

/**
 * Message d'erreur d'upload, ou `null` si le fichier passe.
 * Chiffré des deux côtés : l'artiste doit savoir de combien il dépasse.
 */
export function audioUploadError(
  fileBytes: number,
  currentUsedBytes: number
): string | null {
  if (fileBytes > MAX_AUDIO_BYTES) {
    return `Fichier trop volumineux : ${formatBytes(fileBytes)}, limite actuelle ${formatBytes(MAX_AUDIO_BYTES)}.`;
  }
  if (currentUsedBytes + fileBytes > STORAGE_QUOTA_BYTES) {
    return `Espace insuffisant : ${formatBytes(currentUsedBytes)} utilisés sur ${formatBytes(STORAGE_QUOTA_BYTES)}, ce fichier pèse ${formatBytes(fileBytes)}.`;
  }
  return null;
}
```

> `process.env.NEXT_PUBLIC_*` est inliné au build par Next : ne pas construire le nom de variable dynamiquement, il doit apparaître littéralement.

- [ ] **Step 2 : Aligner le quota générique du Drive**

Dans `src/lib/drive-db.ts`, remplacer les deux constantes :

```ts
export const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
```

par :

```ts
import { STORAGE_QUOTA_BYTES } from "@/modules/phono/lib/audio-limits";

/** Quota global par utilisateur. Aligné sur le plafond audio, qui le domine. */
export const STORAGE_LIMIT_BYTES = STORAGE_QUOTA_BYTES;

/**
 * Plafond des fichiers Drive génériques (PDF, images, contrats).
 * L'audio a son propre plafond, plus haut : voir `MAX_AUDIO_BYTES`.
 */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
```

L'import doit être placé en haut du fichier avec les autres. Vérifier qu'il ne crée pas de cycle : `audio-limits.ts` n'importe rien.

- [ ] **Step 3 : Documenter dans `.env.example`**

Ajouter à la fin du fichier :

```
# Stockage audio du catalogue Phono. Défauts alignés sur le plan Supabase Free
# (50 Mo par fichier, 1 Go par utilisateur) : un master WAV 24 bits est refusé.
# Passer à 200 / 20 le jour du basculement en Supabase Pro — voir ALPHA.md.
NEXT_PUBLIC_MAX_AUDIO_MB=50
NEXT_PUBLIC_STORAGE_QUOTA_GB=1
```

> Les valeurs de `.env.example` doivent rester celles du plan Free. Y écrire `20` donnerait à un dev local un quota de 20 Go que Supabase refuserait à 1 Go : l'app autoriserait un upload que le Storage rejette.

- [ ] **Step 4 : Vérifier**

```bash
npx tsc --noEmit && npm run lint && npm run build
```
Attendu : aucune erreur. Aucun comportement visible ne change à ce stade.

- [ ] **Step 5 : Commit** *(sur demande de l'utilisateur uniquement)*

```bash
git add src/modules/phono/lib/audio-limits.ts src/lib/drive-db.ts .env.example
git commit -m "feat(phono): plafonds de stockage audio pilotés par l'environnement

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2 : Types — `TrackGuest`, `TrackVersion.isrc`, `Mix`

**Files:**
- Modify: `src/lib/sidekick-store.ts:347-441`

- [ ] **Step 1 : Ajouter `TrackGuest` et étendre `TrackVersion`**

Dans `src/lib/sidekick-store.ts`, au-dessus de `interface TrackVersion`, ajouter :

```ts
/**
 * Un intervenant sur un titre.
 *
 * Historiquement stocké en chaîne concaténée `"Nom – Rôle"`, re-découpée sur
 * `" – "` à cinq endroits — dont le constructeur du payload de métadonnées.
 * Un nom contenant un tiret cassait silencieusement les crédits écrits dans le
 * fichier, sur des données qui alimentent des déclarations de droits.
 *
 * La colonne `guest_artists` est un `jsonb` : elle accepte les deux formes.
 * `normalizeTrackGuests` convertit à la lecture, l'écriture se fait toujours
 * au nouveau format.
 */
export interface TrackGuest {
  name: string;
  /** Libellé lisible, pas une clé `PhonoRole`. Ex. « Ingé Mixage ». */
  role: string;
}
```

Puis dans `interface TrackVersion`, ajouter après `label` :

```ts
  /**
   * ISRC propre à cette version. L'ISRC identifie un enregistrement, pas une
   * œuvre : radio edit, instrumental et live ont chacun le leur. Vide, la
   * version hérite de `Track.isrc` à l'affichage.
   */
  isrc?: string;
```

- [ ] **Step 2 : Élargir le type de `Track.guestArtists`**

Dans `interface Track`, remplacer :

```ts
  guestArtists: string[];
```

par :

```ts
  /**
   * Tolère l'ancien format `"Nom – Rôle"` en lecture. Toujours écrit en
   * `TrackGuest[]`. Utiliser `normalizeTrackGuests` avant tout usage.
   */
  guestArtists: Array<string | TrackGuest>;
```

- [ ] **Step 3 : Introduire `Mix` en remplacement de `Podcast`**

Remplacer les interfaces `PodcastTracklistItem` et `Podcast` par :

```ts
export interface MixTracklistItem {
  id: string;
  artist: string;
  label: string;
  /** Timecode `M:SS` ou `H:MM:SS`. */
  time: string;
}

/**
 * Longs formats non phonographiques : DJ set, live set, mix, émission.
 *
 * Ils n'ont ni ISRC ni version ni distributeur. Leur valeur juridique tient à
 * la tracklist, qui détermine la répartition des droits vers les ayants droit
 * des titres joués — c'est le format exigé par Mixcloud, Resident Advisor et
 * la SACEM.
 */
export type MixFormat = "dj_set" | "live_set" | "mix" | "podcast";

export interface Mix {
  id: string;
  title: string;
  artists: string;
  publishedOn: string;
  format: MixFormat;
  /** Captation vidéo. Orthogonal au format : un live set peut être filmé. */
  isVideo: boolean;
  status: ReleaseStatus;
  releaseDate: string;
  tracklist: MixTracklistItem[];
  cover?: string;
  [key: string]: unknown;
}

/** @deprecated Utiliser `Mix`. Alias conservé le temps de la migration. */
export type Podcast = Mix;
/** @deprecated Utiliser `MixTracklistItem`. */
export type PodcastTracklistItem = MixTracklistItem;
```

Dans `interface SidekickData`, renommer le champ `podcasts: Podcast[]` en `mixes: Mix[]`.

- [ ] **Step 4 : Vérifier**

```bash
npx tsc --noEmit
```
Attendu : **des erreurs**, dans `CatalogPage.tsx` et `usePhonoData.ts`, sur `isLive` et sur les usages de `guestArtists` comme `string`. C'est le résultat souhaité — elles sont résolues aux tâches 3 et 5. Noter la liste, elle sert de checklist.

---

## Task 3 : `lib/track.ts` — normalisation et invités

**Files:**
- Create: `src/modules/phono/lib/track.ts`

- [ ] **Step 1 : Écrire le module**

```ts
// src/modules/phono/lib/track.ts
import type { PhonoRole, Track, TrackGuest, TrackVersion } from "@/lib/sidekick-store";

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
```

> L'ancien `normalizeTrack` fusionnait `defaultTrack()` en amont (`{ ...d, ...t }`), ce qui coerçait ces quatre champs en `""`. Ne spreader que `...t` les laisserait à `undefined` : d'où la coercition explicite ci-dessus. Sans elle, un `<Input>` lié à `track.genre` bascule de non contrôlé à contrôlé dès la première frappe, et React émet un avertissement en console avant de perdre le curseur.

```ts

/** ISRC effectif d'une version : le sien, sinon celui hérité du titre. */
export function effectiveIsrc(track: Track, version: TrackVersion): string {
  return (version.isrc ?? "").trim() || (track.isrc ?? "").trim();
}

export function versionsWithAudio(track: Track): TrackVersion[] {
  return (track.versions ?? []).filter((v) => Boolean(v.audioPath));
}
```

- [ ] **Step 2 : Vérifier**

```bash
npx tsc --noEmit 2>&1 | grep "modules/phono/lib"
```
Attendu : aucune ligne. Le module compile seul ; les erreurs restantes sont ailleurs.

---

## Task 4 : `lib/release-status.ts` et `lib/album.ts`

**Files:**
- Create: `src/modules/phono/lib/release-status.ts`
- Create: `src/modules/phono/lib/album.ts`

- [ ] **Step 1 : `release-status.ts`**

```ts
// src/modules/phono/lib/release-status.ts
import type { ReleaseStatus } from "@/lib/sidekick-store";

export const RELEASE_STATUSES: { value: ReleaseStatus; label: string }[] = [
  { value: "en_production", label: "En production" },
  { value: "mixe", label: "Mixé" },
  { value: "masterise", label: "Mastérisé" },
  { value: "publie", label: "Publié" },
];

/** Ordre chronologique : Production < Mixé < Mastérisé < Publié. */
const RELEASE_STATUS_ORDER: Record<ReleaseStatus, number> = {
  en_production: 0,
  mixe: 1,
  masterise: 2,
  publie: 3,
};

/**
 * Couleurs du pipeline. Empruntées au vocabulaire de `LiveOverviewPage`, où
 * chaque statut a une teinte stable réutilisée par la barre segmentée, la
 * légende et les pastilles de ligne.
 */
export const RELEASE_STATUS_COLOR: Record<ReleaseStatus, string> = {
  en_production: "#F59E0B",
  mixe: "#38BDF8",
  masterise: "#A78BFA",
  publie: "#34D399",
};

export function releaseStatusLabel(s: ReleaseStatus): string {
  return RELEASE_STATUSES.find((r) => r.value === s)?.label ?? s;
}

/** Vrai si `newStatus` est une étape strictement plus avancée que l'actuelle. */
export function isStatusMoreAdvanced(
  newStatus: ReleaseStatus,
  currentStatus: ReleaseStatus | undefined
): boolean {
  const current = currentStatus ? RELEASE_STATUS_ORDER[currentStatus] ?? -1 : -1;
  const next = RELEASE_STATUS_ORDER[newStatus] ?? 0;
  return next > current;
}
```

> L'ancienne fonction `releaseStatusBadgeClass` n'est **pas** reprise : elle produisait des classes claires (`bg-amber-400 text-amber-950`) et un `text-lg` incohérent avec le reste. Les pastilles utilisent désormais `RELEASE_STATUS_COLOR` en style inline, comme `STATUS_META` dans `LiveOverviewPage`.

- [ ] **Step 2 : `album.ts`**

```ts
// src/modules/phono/lib/album.ts
import type { Album, AlbumType, Track } from "@/lib/sidekick-store";
import { normalizeTrackGuests, roleLabel } from "./track";

export const ALBUM_TYPES: { value: AlbumType; label: string }[] = [
  { value: "album", label: "Album" },
  { value: "ep", label: "EP" },
  { value: "single", label: "Single" },
];

export function albumTypeLabel(type: AlbumType): string {
  return ALBUM_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function newAlbumId(): string {
  return "a-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

export function normalizeAlbum(a: Album): Album {
  return {
    ...a,
    id: a.id,
    title: a.title ?? "",
    artist: a.artist ?? "",
    type: a.type ?? "album",
    status: a.status ?? "en_production",
    releaseDate: a.releaseDate ?? "",
    upcEan: a.upcEan ?? "",
    trackIds: Array.isArray(a.trackIds) ? a.trackIds : [],
    guests: Array.isArray(a.guests) ? a.guests : [],
    notes: a.notes ?? "",
  };
}

/** Les titres d'un album, dans l'ordre de la tracklist. */
export function albumTracks(album: Album, allTracks: Track[]): Track[] {
  const byId = new Map(allTracks.map((t) => [t.id, t]));
  return (album.trackIds ?? [])
    .map((id) => byId.get(id))
    .filter((t): t is Track => Boolean(t));
}

/**
 * Crédits d'un album, agrégés depuis ses titres. Un album ne saisit pas ses
 * contributeurs : il les hérite. Un même nom apparaît une fois, avec tous ses
 * rôles réunis ; la casse ne crée pas de doublon.
 */
export function computeAlbumContributors(
  album: Album,
  tracks: Track[]
): Array<{ name: string; roles: string[] }> {
  const byName = new Map<string, { name: string; roles: Set<string> }>();

  const push = (name: string, role?: string) => {
    const cleanName = String(name ?? "").trim();
    if (!cleanName) return;
    const key = cleanName.toLowerCase();
    const label = String(role ?? "").trim();
    const entry = byName.get(key) ?? { name: cleanName, roles: new Set<string>() };
    if (label) entry.roles.add(label);
    byName.set(key, entry);
  };

  push(album.artist, "Artiste principal");
  (album.guests ?? []).forEach((g) => push(g.name, roleLabel(g.role)));
  tracks.forEach((t) => {
    push(t.mainArtist, roleLabel(t.role));
    normalizeTrackGuests(t.guestArtists).forEach((g) => push(g.name, g.role));
  });

  return Array.from(byName.values()).map((v) => ({
    name: v.name,
    roles: Array.from(v.roles),
  }));
}
```

- [ ] **Step 3 : Vérifier**

```bash
npx tsc --noEmit 2>&1 | grep "modules/phono/lib"
```
Attendu : aucune ligne.

---

## Task 5 : `lib/metadata-payload.ts` — la cascade de valeurs par défaut

Cette logique est aujourd'hui écrite **deux fois** dans `CatalogPage.tsx` (`processMetadata` lignes ~926-1067, `processAlbumMetadata` lignes ~1069-1240), avec des divergences. C'est elle qui écrit les crédits dans les fichiers envoyés au distributeur : la centraliser est le gain principal de la phase 0.

**Files:**
- Create: `src/modules/phono/lib/metadata-payload.ts`

- [ ] **Step 1 : Écrire le module**

```ts
// src/modules/phono/lib/metadata-payload.ts
import type { Album, Track, TrackVersion } from "@/lib/sidekick-store";
import { normalizeTrackGuests } from "./track";

/** Tags écrits dans le fichier par `/api/phono/apply-metadata`. */
export interface MetadataPayload {
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  trackNumber?: number;
  trackTotal?: number;
  genre?: string;
  label?: string;
  copyright?: string;
  year?: number;
  fullDate?: string;
  composers?: string;
  isrc?: string;
  comment?: string;
}

/** Rôles comptés comme interprètes dans le tag `artist`. */
const PERFORMER_ROLES = new Set(["Artiste secondaire", "Artiste principal"]);

/** Rôles comptés comme auteurs dans le tag `composers`. */
const COMPOSER_ROLES = new Set(["Compositeur", "Beatmaker"]);

export function buildMetadataPayload(args: {
  track: Track;
  version?: TrackVersion;
  album?: Album;
  /** 1-indexé. Requis pour un export d'album. */
  trackNumber?: number;
  trackTotal?: number;
}): MetadataPayload {
  const { track, version, album, trackNumber, trackTotal } = args;
  const guests = normalizeTrackGuests(track.guestArtists);

  const mainArtist = (track.mainArtist ?? "").trim();

  // artist : artiste principal puis interprètes, dans l'ordre de saisie.
  const performers = guests
    .filter((g) => PERFORMER_ROLES.has(g.role))
    .map((g) => g.name);
  const artist = [mainArtist, ...performers].filter(Boolean).join(", ");

  // composers : dédoublonné, l'artiste principal compte s'il est crédité auteur.
  const composerNames = new Set<string>();
  if (mainArtist && (track.role === "compositeur" || track.role === "beatmaker")) {
    composerNames.add(mainArtist);
  }
  guests.forEach((g) => {
    if (COMPOSER_ROLES.has(g.role)) composerNames.add(g.name);
  });

  const rawDate = (album?.releaseDate || track.releaseDate || "").trim();
  const year = rawDate.match(/(\d{4})/)?.[1];

  const genre = (track.genre ?? "").trim() || (album?.genre ?? "").trim();

  // label : album, sinon le label du titre s'il n'est pas auto-produit,
  // sinon l'artiste — un auto-produit est son propre label.
  const label =
    (album?.label ?? "").trim() ||
    (!track.selfProduced ? (track.label ?? "").trim() : "") ||
    mainArtist;

  // copyright : porte l'éditeur. Album, sinon titre, sinon artiste.
  const editor =
    (album?.editor ?? "").trim() || (track.editor ?? "").trim() || mainArtist;

  // Le titre exporté distingue la version, sauf pour l'originale.
  const versionLabel = (version?.label ?? "").trim();
  const title =
    versionLabel && versionLabel.toLowerCase() !== "original"
      ? `${track.title} (${versionLabel})`
      : track.title;

  // ISRC : celui de la version prime, le titre sert de valeur héritée.
  const isrc = (version?.isrc ?? "").trim() || (track.isrc ?? "").trim();

  return {
    title,
    artist: artist || mainArtist,
    album: album?.title ?? "",
    albumArtist: album?.artist ?? mainArtist,
    trackNumber,
    trackTotal,
    genre: genre || undefined,
    label: label || undefined,
    copyright: editor || undefined,
    year: year ? parseInt(year, 10) : undefined,
    fullDate: rawDate || undefined,
    composers: composerNames.size > 0 ? Array.from(composerNames).join(", ") : undefined,
    isrc: isrc || undefined,
    comment: (track.notes ?? "").trim() || undefined,
  };
}

/** Nom de fichier sûr, accents français conservés. */
export function safeFileName(raw: string, fallback = "audio"): string {
  return (
    raw.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæ\s_-]/gi, "").trim() || fallback
  );
}

/** Libellés lisibles des tags, pour l'aperçu avant écriture. */
export const METADATA_FIELD_LABELS: Record<keyof MetadataPayload, string> = {
  title: "Titre",
  artist: "Artiste",
  album: "Album",
  albumArtist: "Artiste de l'album",
  trackNumber: "Piste",
  trackTotal: "Total pistes",
  genre: "Genre",
  label: "Label",
  copyright: "Copyright / éditeur",
  year: "Année",
  fullDate: "Date de sortie",
  composers: "Compositeurs",
  isrc: "ISRC",
  comment: "Commentaire",
};
```

> **Divergence à connaître.** L'ancien `processMetadata` (export d'un titre seul) n'ajoutait pas le libellé de version au titre et ne transmettait ni `trackNumber` ni `trackTotal`. Le nouveau module unifie : l'export d'une version nommée autrement qu'« Original » produit `Titre (Instrumental)`. C'est intentionnel — deux fichiers portant le même tag `title` sont une source d'erreur chez le distributeur.

- [ ] **Step 2 : Vérifier**

```bash
npx tsc --noEmit 2>&1 | grep "modules/phono/lib"
```
Attendu : aucune ligne.

- [ ] **Step 3 : Commit** *(sur demande uniquement)*

```bash
git add src/modules/phono/lib/ src/lib/sidekick-store.ts
git commit -m "refactor(phono): extrait le métier du catalogue vers lib/

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6 : URL signées — corriger `getPublicUrl` et créer la route

> **Correction du 05/09 — cette tâche partait d'une prémisse fausse.** J'avais
> déduit des policies RLS que le bucket `drive` était privé. Vérification faite
> auprès de l'API Storage, il a `public = true`. Les `getPublicUrl` que cette
> tâche remplaçait par `""` fonctionnaient donc, et `DocumentsPage.tsx` s'en sert
> comme lien d'ouverture de chaque fichier du Drive : le remplacement cassait le
> module Drive, et **a été annulé**. Seule la création de la route d'URL signée
> est conservée — c'est le bon mécanisme pour le lecteur du catalogue, et il ne
> dépend pas de la publicité du bucket. La question de fond reste ouverte et est
> documentée dans `ALPHA.md` : un bucket public sert les masters inédits sans
> aucune authentification.

Les 4 policies RLS du bucket `drive` filtrent sur `auth.uid()` comparé au premier segment du chemin (`supabase/migrations/00000000000000_baseline.sql:2633`). Elles protègent l'accès authentifié, mais pas la route publique du bucket. La feature liens d'écoute utilise déjà `createSignedUrl` (`app/api/listening/[slug]/audio/[itemId]/route.ts:51`) : le catalogue s'aligne.

**Files:**
- Create: `app/api/phono/signed-audio/route.ts`
- Modify: `src/lib/drive-db.ts:489` et `:606`, `:628`

- [ ] **Step 1 : Créer la route d'URL signée**

```ts
// app/api/phono/signed-audio/route.ts
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { DRIVE_BUCKET } from "@/lib/drive-db";

/** Durée de vie d'une URL de lecture. Assez longue pour un titre, assez courte
 *  pour qu'une URL qui fuite ne serve pas indéfiniment. */
const SIGNED_URL_TTL_SECONDS = 3600;

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let audioPath: unknown;
  try {
    ({ audioPath } = await request.json());
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  if (typeof audioPath !== "string" || !audioPath) {
    return NextResponse.json({ error: "audioPath manquant." }, { status: 400 });
  }

  // Le premier segment du chemin est l'id du propriétaire. Le vérifier ici
  // évite qu'un utilisateur signe le fichier d'un autre : les policies RLS ne
  // s'appliquent pas à createSignedUrl côté serveur.
  if (audioPath.split("/")[0] !== userId) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { data, error } = await supabase.storage
    .from(DRIVE_BUCKET)
    .createSignedUrl(audioPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  return NextResponse.json({
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
  });
}
```

> Le contrôle du premier segment n'est pas décoratif : `createSignedUrl` appelé depuis une route serveur passe outre les policies RLS. Sans lui, n'importe quel utilisateur connecté pourrait signer le master inédit d'un autre.

- [ ] **Step 2 : Retirer les `getPublicUrl` inopérants de `drive-db.ts`**

Dans `uploadDriveFileToPath` (`src/lib/drive-db.ts:489`), remplacer :

```ts
  const { data: urlData } = supabase.storage.from(DRIVE_BUCKET).getPublicUrl(path);
  return { url: urlData.publicUrl, path };
```

par :

```ts
  // Le bucket est privé : une URL publique ne répond pas. Les consommateurs
  // demandent une URL signée à /api/phono/signed-audio au moment de lire.
  return { url: "", path };
```

Faire de même aux lignes ~606 et ~628 (mêmes appels dans les fonctions de listage) : remplacer la valeur `url` par `""` en conservant le `path`. Vérifier ensuite les usages :

```bash
grep -rn "\.url" src/hooks/useDriveData.ts src/modules/admin src/modules/marketing | grep -i drive
```
Si un consommateur affichait cette URL, il affichait déjà un lien mort — le corriger pour passer par la route signée.

- [ ] **Step 3 : Vérifier**

```bash
npx tsc --noEmit && npm run lint && npm run build
```
Puis en dev : `npm run dev`, ouvrir le module Drive, uploader un fichier, vérifier qu'il apparaît dans la liste et que rien ne régresse.

- [ ] **Step 4 : Commit** *(sur demande uniquement)*

```bash
git add app/api/phono/signed-audio/route.ts src/lib/drive-db.ts
git commit -m "fix(drive): remplace les URL publiques mortes par des URL signées

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7 : Mappers tolérants dans `usePhonoData`

**Files:**
- Modify: `src/hooks/usePhonoData.ts`

- [ ] **Step 1 : Normaliser les invités à la lecture et à l'écriture**

Dans `trackToRow`, remplacer :

```ts
    guest_artists: t.guestArtists ?? [],
```

par :

```ts
    guest_artists: normalizeTrackGuests(t.guestArtists),
```

Dans `rowToTrack`, remplacer :

```ts
    guestArtists: (row.guest_artists as string[]) ?? [],
```

par :

```ts
    guestArtists: normalizeTrackGuests(
      row.guest_artists as Array<string | TrackGuest> | undefined
    ),
```

Ajouter en haut du fichier :

```ts
import { normalizeTrackGuests } from "@/modules/phono/lib/track";
import type { TrackGuest } from "@/lib/sidekick-store";
```

Les données existantes se convertissent au fil des enregistrements : lues en ancien format, réécrites en nouveau.

- [ ] **Step 1 bis : Adapter `ListeningLinkComposer` — une ligne, sans toucher au chantier**

Élargir `Track.guestArtists` casse aussi `src/modules/phono/components/ListeningLinkComposer.tsx:85`, qui construit le `snapshot` d'un lien d'écoute et dont le type attend `string[]`.

Le chantier liens d'écoute est **hors périmètre** : on ne change ni son type de snapshot, ni sa base, ni son rendu. On pose un simple adaptateur de sérialisation qui restitue exactement le format que ce code recevait déjà :

```ts
guestArtists: normalizeTrackGuests(track.guestArtists).map((g) =>
  g.role ? `${g.name} – ${g.role}` : g.name
),
```

C'est la seule modification autorisée dans ce fichier.

> **À signaler à l'utilisateur, sans agir :** le snapshot fige `isrc: track.isrc`, l'ISRC du titre. Maintenant que `TrackVersion.isrc` existe, un lien d'écoute portant sur l'instrumental devrait exposer l'ISRC de cette version. C'est une amélioration réelle, mais elle appartient au chantier liens d'écoute — ne pas la faire ici.

- [ ] **Step 2 : Vérifier**

```bash
npx tsc --noEmit 2>&1 | grep -v "CatalogPage"
```
Attendu : aucune ligne. `CatalogPage.tsx` reste en erreur sur `isLive` — résolu en phase 3.

Pour ne pas rester en build cassé pendant les phases 1 et 2, appliquer une compatibilité temporaire dans `CatalogPage.tsx` : conserver `isLive` en lisant `format === "live_set"` et en écrivant `format: value ? "live_set" : "dj_set"`. La ligne est supprimée à la tâche 20.

- [ ] **Step 3 : Vérifier en dev**

`npm run dev`, ouvrir `/phono/catalogue`, onglet Titres. Éditer les « personnes impliquées » d'un titre existant, enregistrer, recharger la page. Attendu : nom et rôle intacts. Vérifier dans Supabase que `guest_artists` contient désormais des objets `{name, role}` pour ce titre.

- [ ] **Step 4 : Commit** *(sur demande uniquement)*

```bash
git add src/hooks/usePhonoData.ts src/modules/phono/components/CatalogPage.tsx
git commit -m "refactor(phono): invités de titre en objets, lecture tolérante

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

**Fin de phase 0.** Vérification globale : parcourir les trois onglets du catalogue, créer un titre, créer un album, créer un podcast, exporter des métadonnées. Rien ne doit avoir changé visuellement. Demander à l'utilisateur s'il souhaite commiter avant de continuer.

---

# Phase 1 — Titres et audio

C'est la phase la plus lourde et celle qui porte le plus de valeur. À sa fin, l'onglet Titres est entièrement neuf et l'audio est utilisable de bout en bout.

## Task 8 : `PhonoPlayerProvider` et `AudioPlayerBar`

**Files:**
- Create: `src/modules/phono/components/audio/PhonoPlayerProvider.tsx`
- Create: `src/modules/phono/components/audio/AudioPlayerBar.tsx`

- [ ] **Step 1 : Écrire le contexte**

Contrat à respecter exactement — les tâches suivantes en dépendent :

```ts
export interface PlayerTrackRef {
  trackId: string;
  versionId: string;
  /** Affiché dans la barre. */
  title: string;
  versionLabel: string;
  coverSrc?: string;
  audioPath: string;
  /** ~400 valeurs entre 0 et 1, déjà stockées avec la version. */
  peaks?: number[];
  durationMs?: number;
}

export interface PhonoPlayerContextValue {
  current: PlayerTrackRef | null;
  isPlaying: boolean;
  /** Secondes écoulées. */
  position: number;
  /** Secondes. Reprend `durationMs` avant chargement, puis la vraie durée. */
  duration: number;
  volume: number;
  error: string | null;
  play: (ref: PlayerTrackRef) => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  stop: () => void;
}

export function usePhonoPlayer(): PhonoPlayerContextValue;
export function PhonoPlayerProvider(props: { children: React.ReactNode }): JSX.Element;
```

Implémentation :

- Un unique `HTMLAudioElement` conservé dans un `useRef`, créé à la première lecture. Un seul élément pour tout le catalogue : lancer une version en arrête automatiquement une autre.
- `play(ref)` : si `ref.versionId` est déjà le courant, se comporte comme `toggle()`. Sinon, obtient une URL signée puis assigne `audio.src` et lance la lecture.
- **URL signée** : `POST /api/phono/signed-audio` avec `{ audioPath }`. Mémoriser `{ path, url, expiresAt }` dans un `Map` en ref et réutiliser tant que `expiresAt - 60_000 > Date.now()`. Sur un `error` de l'élément audio alors qu'une URL était en cache, purger l'entrée et retenter **une fois** — c'est le cas de l'expiration en cours de lecture.
- `position` mis à jour sur `timeupdate`. Ne pas mettre à jour l'état pendant qu'un glissement de curseur est en cours.
- `volume` persisté dans `localStorage` sous `phono-player-volume` — c'est une préférence d'UI, l'un des rares usages légitimes de `useLocalStorage` selon `CLAUDE.md`.
- `error` : message français court affiché dans la barre, ex. « Lecture impossible : fichier introuvable. »
- Nettoyage : `pause()` et `src = ""` au démontage.

- [ ] **Step 2 : Écrire `AudioPlayerBar`**

Aucune prop : lit tout depuis `usePhonoPlayer()`. Ne rend rien si `current === null`.

Structure :

```
sticky bottom-0 z-30 -mx-6 mt-6 px-6 py-3
bg-[rgba(16,16,16,0.92)] backdrop-blur-xl
border-t border-[rgba(245,245,245,0.12)]

[cover 40×40 rounded-md]  [titre · label version]  [▶/⏸]
[waveform cliquable, flex-1]  [0:42 / 3:20]  [volume]  [×]
```

- **`sticky`, pas `fixed`.** L'état replié de la sidebar est local à `Sidebar.tsx` (`useState` ligne 279, persisté sous `sidekick-sidebar-collapsed`) et n'est **pas** remonté dans le layout : une barre `position: fixed` ne peut donc pas connaître la largeur à laquelle s'aligner sans dupliquer cet état. Le shell (`app/(app)/layout.tsx`) place le contenu dans un `<main className="flex-1 p-6">` d'un conteneur `min-h-screen` — le défilement est au niveau du document, donc `sticky bottom-0` à l'intérieur de la page colle en bas de la fenêtre **et** respecte la largeur de la sidebar sans aucun couplage. Le `-mx-6 px-6` compense le padding de `main` pour que la barre file d'un bord à l'autre.
- **Waveform** : réutiliser `src/modules/phono/components/listening/Waveform.tsx`, qui expose exactement le contrat nécessaire :

```ts
interface WaveformProps {
  peaks: number[];
  /** Progression de lecture entre 0 et 1. */
  progress: number;
  /** Appelé avec une position entre 0 et 1 quand le visiteur clique. */
  onSeek: (ratio: number) => void;
  height?: number;
}
```

  L'appeler avec `progress={duration ? position / duration : 0}` et
  `onSeek={(ratio) => seek(ratio * duration)}`. Il gère déjà le clic, le rôle
  ARIA `slider` et les flèches gauche/droite. Ne pas le déplacer : il sert aussi
  au chantier liens d'écoute.
- Sans `peaks` : afficher une barre de progression pleine largeur (`Progress`) à la place du composant.
- Un padding bas sur le conteneur de liste n'est pas nécessaire avec `sticky` — la barre occupe sa place dans le flux.

- [ ] **Step 3 : Vérifier**

```bash
npx tsc --noEmit && npm run lint
```
La vérification fonctionnelle a lieu à la tâche 10, une fois la barre montée dans la page.

---

## Task 9 : `VersionAudioField` déplacé et durci

**Files:**
- Move: `src/modules/phono/components/listening/VersionAudioField.tsx` → `src/modules/phono/components/audio/VersionAudioField.tsx`
- Create: `src/modules/phono/components/audio/DrivePickerDialog.tsx`

- [ ] **Step 1 : Déplacer et corriger les imports**

```bash
grep -rn "VersionAudioField" src/ app/
```
Déplacer le fichier, puis mettre à jour chaque import trouvé. Ne pas modifier les fichiers du chantier liens d'écoute au-delà du chemin d'import.

- [ ] **Step 2 : Appliquer les plafonds paramétrables**

Dans `attach(file)`, avant `computeAudioPeaks`, insérer :

```ts
import { audioUploadError, MAX_AUDIO_BYTES } from "@/modules/phono/lib/audio-limits";
import { getUserStorageUsed } from "@/lib/drive-db";

// …dans attach(file), après avoir obtenu supabase et userId :
const used = await getUserStorageUsed(supabase, userId);
const limitError = audioUploadError(file.size, used);
if (limitError) {
  setError(limitError);
  setBusy(false);
  return;
}
```

L'ordre importe : aujourd'hui `computeAudioPeaks` s'exécute avant tout contrôle. Décoder un WAV de 200 Mo pour le refuser ensuite est du gâchis — contrôler la taille d'abord, décoder ensuite.

Ajouter aussi l'attribut `accept="audio/*,.wav,.aiff,.flac"` sur l'input : certains navigateurs ne reconnaissent pas `audio/*` pour les fichiers AIFF.

- [ ] **Step 3 : Afficher la progression**

`uploadDriveFileToPath` accepte déjà un `onProgress?: (progress: number) => void`. Le brancher sur un état local et afficher une barre fine de 2 px en `#F0FF00` sous la ligne pendant l'upload, avec le libellé « Envoi… {n} % ». Sur un WAV de 60 Mo, l'absence de retour visuel donne l'impression que l'app est figée.

- [ ] **Step 4 : Créer `DrivePickerDialog`**

```ts
interface DrivePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé avec le chemin bucket du fichier choisi. */
  onPick: (file: { path: string; name: string; sizeBytes: number }) => void;
}
```

- Liste les fichiers du Drive de l'utilisateur dont l'extension est audio (`.wav .aiff .aif .flac .mp3 .m4a .aac .ogg`). Utiliser `useDriveData()`, qui expose déjà tout le nécessaire — ne pas requêter Storage directement :

```ts
const {
  userId,
  storageRootFolders,      // dossiers racine à parcourir
  storageContents,         // contenu du dossier courant
  isLoadingContents,
  loadStorageContents,     // (path: string) => Promise<void>
} = useDriveData();
```

  Naviguer avec `loadStorageContents(path)` et filtrer `storageContents` sur les extensions audio.
- Champ de recherche, liste scrollable, taille affichée via `formatBytes`.
- À la sélection, le parent télécharge le fichier via URL signée, calcule les peaks avec `computeAudioPeaks`, et applique `{ audioPath, audioSource: "drive", audioName, durationMs, sizeBytes, peaks }`. **Aucun octet n'est ré-uploadé** : le fichier est déjà dans le bucket, seule la référence est créée. Le quota n'est donc pas incrémenté.

Exposer ce choix dans `VersionAudioField` : à côté de « Ajouter un fichier audio », un second bouton « Choisir dans le Drive ».

- [ ] **Step 5 : Vérifier**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

---

## Task 10 : `TrackRow` et `VersionList`

**Files:**
- Create: `src/modules/phono/components/tracks/TrackRow.tsx`
- Create: `src/modules/phono/components/tracks/VersionList.tsx`

- [ ] **Step 1 : Contrats de props**

```ts
interface TrackRowProps {
  track: Track;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExportMetadata: (versionId?: string) => void;
  onPatchVersion: (versionId: string, patch: Partial<TrackVersion>) => void;
  onAddVersion: () => void;
  onRemoveVersion: (versionId: string) => void;
}

interface VersionListProps {
  track: Track;
  onPatchVersion: (versionId: string, patch: Partial<TrackVersion>) => void;
  onAddVersion: () => void;
  onRemoveVersion: (versionId: string) => void;
  onExportMetadata: (versionId: string) => void;
}
```

- [ ] **Step 2 : Structurer `TrackRow`**

Aucun `<input>`, aucun `<Select>` dans ce composant. C'est le principe de la refonte : la ligne se lit.

```
┌──────────────────────────────────────────────────────────────────┐
│ ▸ ▣  Nom du titre                       ● Publié                 │
│      Artiste principal · feat. X        FR-XXX-25-00001          │
│      12 mars 2025            ▶ 3 versions · 2 audio          ⋯   │
└──────────────────────────────────────────────────────────────────┘
```

- Conteneur : `rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-4`, `hover:border-[rgba(245,245,245,0.18)] transition-colors`.
- Chevron `ChevronRight` pivotant de 90° quand `expanded`.
- Cover 40×40 `rounded-md object-cover`. Sans cover : carré `bg-[rgba(245,245,245,0.06)]` avec une icône `Music` en `rgba(245,245,245,0.3)`.
- Titre en `text-sm font-medium text-[#F5F5F5]`. Ligne secondaire en `text-xs text-[#F5F5F5]/45` : artiste principal, puis `· feat. X, Y` construit depuis `normalizeTrackGuests` filtré sur le rôle « Artiste secondaire ».
- Pastille de statut : point de 8 px coloré par `RELEASE_STATUS_COLOR[status]` + `releaseStatusLabel` en `text-xs`.
- ISRC en `font-mono text-xs tabular-nums`. Vide : `⚠ ISRC manquant` en `#F59E0B`, avec `AlertTriangle` de 12 px.
- Compteur de versions : `{n} versions · {m} audio`. Bouton play visible uniquement si au moins une version a un `audioPath` ; il lance la première d'entre elles.
- `DropdownMenu` sur `⋯` : Éditer · Exporter les métadonnées · Dupliquer · Supprimer (`text-red-400`). Suivre `TaskCard.tsx` pour le style du menu.
- **Toute la ligne est cliquable** pour déplier ; les boutons internes appellent `e.stopPropagation()`.

- [ ] **Step 3 : Structurer `VersionList`**

Rendu uniquement quand la ligne est dépliée, dans un conteneur indenté
`ml-12 mt-3 space-y-1.5 border-l border-[rgba(245,245,245,0.08)] pl-4`.

Par version :

```
▶  Original      ▁▃▅▇▅▃▁▂▄▆▄▂▁▃▅▇▅  3:42 · WAV 38 Mo   FR-XXX-25-00001  ⋯
```

- Bouton play → `play()` du contexte avec un `PlayerTrackRef` construit depuis le titre et la version. Version courante en lecture : icône `Pause` et libellé en `#F0FF00`.
- Waveform miniature de 28 px de haut depuis `peaks`, non cliquable ici — le seek se fait dans la barre du bas.
- Durée via un `formatDuration` déjà exporté par `src/lib/audio-peaks.ts`, extension déduite de `audioName`, taille via `formatBytes`.
- ISRC de la version : le sien en `#F5F5F5`, sinon celui hérité du titre en `rgba(245,245,245,0.35)` avec un `title` expliquant l'héritage.
- Sans audio : à la place de la waveform, `VersionAudioField` en ligne (upload ou choix Drive).
- Menu `⋯` : Renommer la version · Modifier l'ISRC · Remplacer le fichier · Choisir dans le Drive · Exporter les métadonnées · Détacher l'audio · Supprimer la version.
- « Détacher l'audio » ouvre une confirmation qui dit exactement : *« Le fichier reste dans ton Drive. Les liens d'écoute qui l'utilisent déjà continuent de fonctionner. »* — c'est le comportement réel du code existant, il doit être annoncé.
- « Renommer » et « Modifier l'ISRC » basculent la ligne en édition sur ce seul champ, validation à `Enter` ou au blur, annulation à `Escape`.
- En bas : « + Ajouter une version », `Button variant="ghost" size="sm"`.

- [ ] **Step 4 : Vérifier**

```bash
npx tsc --noEmit && npm run lint
```

---

## Task 11 : `TrackDialog` — le formulaire unique

Ce composant remplace **deux** blocs de `CatalogPage.tsx` : le dialog « Nouveau titre » et le formulaire d'édition inline, aujourd'hui identiques champ pour champ.

**Files:**
- Create: `src/modules/phono/components/tracks/TrackDialog.tsx`

- [ ] **Step 1 : Contrat de props**

```ts
interface TrackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = création. */
  track: Track | null;
  onSubmit: (track: Track) => void;
}
```

Le mode se déduit de `track` : `null` crée, sinon édite. Un seul formulaire, une seule validation, un seul jeu de libellés.

- [ ] **Step 2 : Contenu**

`DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"`, en trois sections séparées par un filet `border-t border-[rgba(245,245,245,0.08)]`.

**Identité** — Titre \*, Artiste principal \*, Rôle (`ROLES` de `lib/track.ts`), Statut (`RELEASE_STATUSES`), Cover (`ImagePlus`, lecture en data URL comme aujourd'hui).

**Publication** — Date de sortie (`DatePicker`, utiliser `frToIso` / `isoToFr` / `isValidDateFr` / `DATE_FORMAT_PLACEHOLDER` de `@/lib/date-format`), ISRC du titre, Genre, Distribution, case « Auto-produit ». Décochée, elle révèle les champs Label et Éditeur — cette dépendance est la même que celle qui pilote la cascade de `buildMetadataPayload`.

**Crédits** — liste de `TrackGuest` : `Input` pour le nom (2/3), `Select` de `ROLES` pour le rôle (1/3), bouton de suppression. « + Ajouter une personne ». État interne en `TrackGuest[]`, jamais en chaînes concaténées.

**Notes** — `Textarea`.

Les **versions ne figurent pas dans ce dialog** : elles vivent dans `VersionList`, au plus près de leur audio. C'est ce qui permet au formulaire de tenir sans défilement interminable.

- [ ] **Step 3 : Validation**

Bouton de soumission désactivé tant que `title` ou `mainArtist` est vide. Date invalide : message sous le champ, soumission bloquée. Ne pas utiliser `alert()` — le code actuel le fait pour les erreurs de métadonnées, ce n'est pas un modèle à suivre.

À la création, initialiser `versions: [defaultVersion("Original")]` : un titre sans version ne peut recevoir aucun audio.

- [ ] **Step 4 : Vérifier**

```bash
npx tsc --noEmit && npm run lint
```

---

## Task 12 : `CatalogHeader` et `StorageSummary`

**Files:**
- Create: `src/modules/phono/components/CatalogHeader.tsx`
- Create: `src/modules/phono/components/audio/StorageSummary.tsx`

- [ ] **Step 1 : Contrat de props**

```ts
export type CatalogFilter =
  | { kind: "none" }
  | { kind: "status"; status: ReleaseStatus }
  | { kind: "missing-isrc" }
  | { kind: "missing-audio" };

interface CatalogHeaderProps {
  tracks: Track[];
  albums: Album[];
  filter: CatalogFilter;
  onFilterChange: (filter: CatalogFilter) => void;
}
```

- [ ] **Step 2 : Structurer le bandeau**

Modèle direct : `LiveOverviewPage.tsx:341-400`. Conteneur
`rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5`.

```
┌──────────────────────────────────────────────────────────────────┐
│  Catalogue                                              24       │
│  Répartition de tes titres par statut         titres · 6 releases│
│                                                                  │
│  ████████████░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓            │
│  ● 8 En production   ● 3 Mixé   ● 2 Mastérisé   ● 11 Publié      │
│                                                                  │
│  ⚠ 5 sans ISRC    ⚠ 9 sans audio       🎵 2,4 Go · 31 fichiers ▾│
└──────────────────────────────────────────────────────────────────┘
```

- Barre segmentée : `flex h-2.5 gap-0.5 overflow-hidden rounded-full`, chaque segment `flexGrow: count`, `minWidth: 14`, `background: RELEASE_STATUS_COLOR[status]`. Les statuts à zéro sont omis.
- Total à droite en `text-[28px] font-extralight leading-none tabular-nums`.
- **Segments et légende sont des filtres** : cliquer sur « Publié » appelle `onFilterChange({ kind: "status", status: "publie" })` ; recliquer le filtre actif renvoie `{ kind: "none" }`. Le filtre actif est marqué par un anneau `ring-1 ring-[#F0FF00]`.
- Les chips ⚠ ne s'affichent que si leur compte est non nul — un catalogue propre ne doit pas afficher « 0 sans ISRC ». Couleur `#F59E0B`, mêmes règles de bascule.
- Décompte « sans audio » : titres dont **aucune** version n'a d'`audioPath`.
- La ligne stockage déplie `StorageSummary` (chevron `▾`, animation d'ouverture simple).

- [ ] **Step 3 : `StorageSummary`**

```ts
interface StorageSummaryProps {
  tracks: Track[];
}
```

- **Total référencé** : somme des `sizeBytes` de toutes les versions ayant un `audioPath`, sur `STORAGE_QUOTA_BYTES`. Barre de `Progress`, virant à `#F59E0B` au-delà de 80 %.
- **Tableau** : titre · version · nom de fichier · taille · source (Upload / Drive). Trié par taille décroissante — on cherche ce qui pèse.
- **Orphelins** : via `useDriveData()`, `loadStorageContents("phono/audio")` puis soustraire de `storageContents` les chemins référencés par une version. Afficher le résultat dans une sous-section « Fichiers non rattachés », avec suppression individuelle après confirmation, par `deleteStorageFileAtPath(filePath)` du même hook — il décrémente le quota, ce qu'un appel direct à Storage ne ferait pas.
- Si le listage échoue, afficher « Impossible de lister les fichiers du stockage. » plutôt qu'une section vide silencieuse — une section vide ferait croire qu'il n'y a pas d'orphelin.

- [ ] **Step 4 : Vérifier**

```bash
npx tsc --noEmit && npm run lint
```

---

## Task 13 : `TracksTab` et branchement dans `CatalogPage`

**Files:**
- Create: `src/modules/phono/components/tracks/TracksTab.tsx`
- Modify: `src/modules/phono/components/CatalogPage.tsx`

- [ ] **Step 1 : Contrat de props**

```ts
interface TracksTabProps {
  tracks: Track[];
  setTracks: (fn: (prev: Track[]) => Track[]) => void;
  filter: CatalogFilter;
  onFilterChange: (filter: CatalogFilter) => void;
}
```

- [ ] **Step 2 : Barre d'outils et filtrage**

```
[Rechercher…]   Statut ▾  Audio ▾  ISRC ▾        Tri ▾   + Titre
```

- Recherche insensible à la casse et aux accents sur titre, artiste principal, invités et ISRC (titre comme versions). Normaliser avec `String.prototype.normalize("NFD").replace(/\p{Diacritic}/gu, "")` des deux côtés.
- Les `Select` de filtre sont synchronisés avec le `filter` du bandeau, dans les deux sens : cliquer « 5 sans ISRC » en haut doit positionner le `Select` ISRC sur « Manquant ».
- Tri : Date de sortie ↓ (défaut) · Titre A→Z · Statut · Ajout récent. Conserver le tri actuel par défaut, qui place les titres sans date en fin de liste (`CatalogPage.tsx:406-416`).
- `+ Titre` ouvre `TrackDialog` en création.

- [ ] **Step 3 : Mutations**

Toutes passent par `setTracks((prev) => …)`, jamais d'écriture Supabase directe — le pattern optimiste du hook s'en charge.

```ts
// Dupliquer : nouvel id pour le titre ET pour chaque version, sinon deux
// titres partageraient des ids de version et les patchs toucheraient les deux.
// L'audio est volontairement délié : un doublon ne doit pas faire croire que
// deux titres pointent le même master.
const duplicate = (track: Track) => {
  setTracks((prev) => [
    {
      ...track,
      id: newTrackId(),
      title: `${track.title} (copie)`,
      isrc: "",
      versions: (track.versions ?? []).map((v) => ({
        id: newVersionId(),
        label: v.label,
      })),
    },
    ...prev,
  ]);
};
```

La suppression d'un titre demande confirmation et signale, le cas échéant, qu'il figure dans *n* album(s) — le supprimer le retire de ces tracklists.

- [ ] **Step 4 : États**

`PageLoader` pendant le chargement, `PageError` avec `onRetry={() => mutate("user_phono")}`, `EmptyState` avec l'icône `Music` quand `tracks.length === 0`, et `NoResult` quand un filtre ne renvoie rien. Le second doit proposer « Réinitialiser les filtres ».

Conserver les appels PostHog existants (`item_created` avec `module: "phono"`).

- [ ] **Step 5 : Réduire `CatalogPage`**

`CatalogPage.tsx` devient :

```
PhonoPlayerProvider
  └ div
      ├ titre de page + description
      ├ CatalogHeader
      ├ onglets (Titres · Albums · Podcasts)
      ├ TracksTab            ← neuf
      ├ …albums (ancien code, inchangé)
      ├ …podcasts (ancien code, inchangé)
      └ AudioPlayerBar
```

Supprimer de `CatalogPage.tsx` tout ce qui ne sert plus qu'aux titres : `defaultTrack`, `normalizeTrack`, `newId`, `addTrackFromDraft`, `updateDraft`, `addDraftGuestArtist`, `updateDraftGuestArtist`, `removeDraftGuestArtist`, `addDraftVersion`, `updateDraftVersion`, `patchDraftVersion`, `removeDraftVersion`, `addGuestArtist`, `updateGuestArtist`, `removeGuestArtist`, `addVersion`, `updateVersion`, `patchVersion`, `removeVersion`, `handleDraftTrackCoverChange`, `handleTrackCoverChange`, le dialog « Nouveau titre » et le bloc `{tab === "tracks" && …}`.

Attention : `updateTrack` et `removeTrack` sont aussi appelés depuis le code albums (propagation de statut). Les conserver jusqu'à la phase 2.

Rebasculer l'onglet par défaut sur `"tracks"` — il est actuellement sur `"albums"` (`CatalogPage.tsx:365`), ce qui n'a plus de sens dans un modèle titre-centré.

- [ ] **Step 6 : Vérifier**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Parcours dev complet sur `/phono/catalogue`, onglet Titres :

1. La liste s'affiche, aucune ligne ne contient de champ de saisie.
2. Créer un titre → il apparaît en tête, avec une version « Original ».
3. Le déplier, ajouter un fichier audio → progression visible, puis waveform, durée et taille.
4. Cliquer play → la barre du bas apparaît, le son démarre, la waveform progresse.
5. Changer d'onglet puis revenir → **le son continue**.
6. Cliquer dans la waveform de la barre → la lecture saute à l'endroit visé.
7. Recharger la page, relancer la lecture → fonctionne (nouvelle URL signée).
8. Cliquer « sans ISRC » dans le bandeau → la liste se filtre, le `Select` ISRC se positionne sur « Manquant ».
9. Déplier la ligne stockage → total cohérent avec les fichiers ajoutés.
10. Éditer le titre, ajouter une personne impliquée, enregistrer, recharger → intact.
11. Dupliquer un titre → copie sans ISRC et sans audio, les versions ont de nouveaux ids.
12. Détacher un audio → la confirmation mentionne le Drive et les liens d'écoute.
13. Vérifier qu'un titre dont `guest_artists` contient encore des chaînes s'affiche correctement (en fabriquer un dans Supabase si nécessaire).

- [ ] **Step 7 : Commit** *(sur demande uniquement)*

```bash
git add src/modules/phono/components/ src/hooks/usePhonoData.ts
git commit -m "feat(phono): refonte de l'onglet Titres avec lecteur audio

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 2 — Albums

## Task 14 : `AlbumCard` et `TracklistComposer`

**Files:**
- Create: `src/modules/phono/components/albums/AlbumCard.tsx`
- Create: `src/modules/phono/components/albums/TracklistComposer.tsx`

- [ ] **Step 1 : `AlbumCard`**

```ts
interface AlbumCardProps {
  album: Album;
  trackCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onExportMetadata: () => void;
}
```

Carte en grille `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`. Cover en `aspect-square rounded-lg object-cover`, ou aplat `bg-[rgba(245,245,245,0.06)]` avec `Disc3`. Sous la cover : titre, `Badge` de type via `albumTypeLabel`, pastille de statut, date, `{n} titres`, UPC en `font-mono text-xs` ou `⚠ UPC manquant`. Menu `⋯` en surimpression au coin haut droit, révélé au survol.

- [ ] **Step 2 : `TracklistComposer`**

```ts
interface TracklistComposerProps {
  trackIds: string[];
  allTracks: Track[];
  onChange: (trackIds: string[]) => void;
}
```

Deux zones empilées :

**Tracklist** — liste ordonnée, drag & drop avec `@dnd-kit`. Suivre `src/modules/tasks/components/BacklogPanel.tsx` pour le montage (`DndContext`, `SortableContext`, `verticalListSortingStrategy`, `useSortable`) et le style de la poignée. Chaque ligne : numéro en `tabular-nums`, poignée `GripVertical`, titre, artiste, bouton de retrait. Vide : « Aucun titre. Ajoute-les depuis le catalogue ci-dessous. »

**Catalogue** — recherche, puis les titres non déjà présents, avec un bouton `Plus` qui les ajoute en fin de tracklist. Limiter l'affichage à 20 résultats pour ne pas noyer le dialog.

`onChange` reçoit toujours le tableau complet et ordonné.

- [ ] **Step 3 : Vérifier**

```bash
npx tsc --noEmit && npm run lint
```

---

## Task 15 : `AlbumDialog` et `AlbumsTab`

**Files:**
- Create: `src/modules/phono/components/albums/AlbumDialog.tsx`
- Create: `src/modules/phono/components/albums/AlbumsTab.tsx`
- Modify: `src/modules/phono/components/CatalogPage.tsx`

- [ ] **Step 1 : `AlbumDialog`**

```ts
interface AlbumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = création. */
  album: Album | null;
  allTracks: Track[];
  onSubmit: (album: Album, statusChanged: boolean) => void;
}
```

`DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"`, deux colonnes `grid gap-6 md:grid-cols-2`.

**Colonne gauche** — Titre \*, Type (`ALBUM_TYPES`), Artiste \*, Statut, Date (`DatePicker`), UPC/EAN, Label, Éditeur, Distribution, Genre, Cover, Notes. Puis les **contributeurs calculés** via `computeAlbumContributors`, en lecture seule, avec la mention *« Calculés depuis les titres de la tracklist. »* — sinon on croit à un champ vide non rempli. Sous eux, les invités propres à l'album (`album.guests`), eux éditables.

**Colonne droite** — `TracklistComposer`.

`statusChanged` vaut vrai si le statut soumis diffère de celui de l'album d'origine. C'est ce qui déclenche la propagation, à l'étape suivante.

- [ ] **Step 2 : `AlbumsTab` et propagation de statut**

```ts
interface AlbumsTabProps {
  albums: Album[];
  tracks: Track[];
  setAlbums: (fn: (prev: Album[]) => Album[]) => void;
  setTracks: (fn: (prev: Track[]) => Track[]) => void;
}
```

Reprendre la propagation existante (`CatalogPage.tsx:518-535`) à l'identique, en la formulant avec les helpers de `lib/` :

```ts
const submitAlbum = (album: Album, statusChanged: boolean) => {
  setAlbums((prev) => {
    const exists = prev.some((a) => a.id === album.id);
    return exists ? prev.map((a) => (a.id === album.id ? album : a)) : [album, ...prev];
  });

  // Publier un album fait avancer ses titres — mais jamais reculer : un titre
  // déjà publié ne redevient pas « en production » parce que l'album change.
  if (statusChanged) {
    setTracks((prev) =>
      prev.map((t) => {
        if (!album.trackIds.includes(t.id)) return t;
        return isStatusMoreAdvanced(album.status, t.status) ? { ...t, status: album.status } : t;
      })
    );
  }
};
```

Grille de `AlbumCard`, `EmptyState` avec l'icône `Disc3`, suppression avec confirmation.

- [ ] **Step 3 : Retirer l'ancien code albums de `CatalogPage`**

Supprimer : `defaultAlbum`, `normalizeAlbum`, `newAlbumId`, `albumTypeLabel`, `parseTrackGuest`, `computeAlbumContributors`, `addAlbumFromDraft`, `updateAlbum`, `removeAlbum`, `toggleAlbumTrack`, `moveAlbumTrack`, `addAlbumGuestDraft`, `updateAlbumGuestDraft`, `removeAlbumGuestDraft`, `addAlbumGuest`, `updateAlbumGuest`, `removeAlbumGuest`, `filteredTracksForAlbum`, `handleCoverChange`, le dialog « Nouvel album » et le bloc `{tab === "albums" && …}`. Ainsi que `updateTrack` et `removeTrack`, désormais sans appelant.

- [ ] **Step 4 : Vérifier**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Parcours dev, onglet Albums :

1. Créer un album, y ajouter trois titres, les réordonner au drag & drop, enregistrer.
2. Rouvrir : l'ordre est conservé.
3. Les contributeurs affichent bien l'artiste de l'album, ses invités et ceux des titres, sans doublon de casse.
4. Retirer un titre → les contributeurs se recalculent immédiatement.
5. Passer l'album en « Publié » → les titres de la tracklist qui étaient « En production » passent à « Publié ».
6. Repasser l'album en « Mixé » → **les titres restent « Publié »** (pas de recul).
7. Supprimer un titre depuis l'onglet Titres → il disparaît de la tracklist de l'album.

- [ ] **Step 5 : Commit** *(sur demande uniquement)*

```bash
git add src/modules/phono/components/albums/ src/modules/phono/components/CatalogPage.tsx
git commit -m "feat(phono): refonte de l'onglet Albums en vue de composition

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 3 — Mixes

## Task 16 : Migration SQL

**Files:**
- Create: `supabase/migrations/20260904090000_phono_mixes.sql`

- [ ] **Step 1 : Écrire la migration**

```sql
-- Renomme user_phono_podcasts en user_phono_mixes et remplace le booléen
-- is_live par un champ format explicite.
--
-- L'onglet « Podcasts » désignait en réalité des longs formats de DJ. Le
-- modèle le montrait déjà : une tracklist { artist, label, time } est le
-- format de déclaration exigé par Mixcloud, Resident Advisor et la SACEM,
-- pas la structure d'un podcast.
--
-- ALTER TABLE ... RENAME conserve policies, index et contraintes.

alter table if exists public.user_phono_podcasts
  rename to user_phono_mixes;

alter table public.user_phono_mixes
  add column if not exists format text not null default 'dj_set';

-- Backfill : un live set était le seul cas distingué. Le reste devient dj_set,
-- reclassable à la main depuis l'interface.
update public.user_phono_mixes
  set format = case when is_live then 'live_set' else 'dj_set' end;

alter table public.user_phono_mixes
  add constraint user_phono_mixes_format_check
  check (format in ('dj_set', 'live_set', 'mix', 'podcast'));

alter table public.user_phono_mixes
  drop column if exists is_live;
```

- [ ] **Step 2 : Appliquer et vérifier**

Appliquer la migration sur la base de dev, puis vérifier en SQL :

```sql
select format, count(*) from public.user_phono_mixes group by format;
select policyname from pg_policies where tablename = 'user_phono_mixes';
```
Attendu : la répartition reflète l'ancien `is_live`, et les policies sont toujours là sous le nouveau nom de table.

> Si des policies étaient définies avec un nom contenant « podcast », elles ont survécu mais portent un nom trompeur. Les renommer n'est pas nécessaire au fonctionnement ; le signaler à l'utilisateur.

---

## Task 17 : `usePhonoData` — `mixes` remplace `podcasts`

**Files:**
- Modify: `src/hooks/usePhonoData.ts`

- [ ] **Step 1 : Remplacer les mappers**

```ts
function mixToRow(m: Mix, userId: string): Record<string, unknown> {
  return {
    id: m.id,
    user_id: userId,
    title: m.title,
    artists: m.artists ?? "",
    published_on: m.publishedOn ?? "",
    format: m.format ?? "dj_set",
    is_video: m.isVideo ?? false,
    status: m.status ?? "en_production",
    release_date: m.releaseDate ?? "",
    tracklist: m.tracklist ?? [],
    cover: m.cover ?? null,
  };
}

function rowToMix(row: Record<string, unknown>): Mix {
  return {
    id: row.id as string,
    title: row.title as string,
    artists: (row.artists as string) ?? "",
    publishedOn: (row.published_on as string) ?? "",
    format: ((row.format as Mix["format"]) ?? "dj_set"),
    isVideo: Boolean(row.is_video),
    status: (row.status as Mix["status"]) ?? "en_production",
    releaseDate: (row.release_date as string) ?? "",
    tracklist: (row.tracklist as Mix["tracklist"]) ?? [],
    cover: (row.cover as string) ?? undefined,
  };
}
```

- [ ] **Step 2 : Renommer la tranche partout**

Dans `PhonoData`, `FALLBACK`, `fetchPhonoData` (table `user_phono_mixes`), le setter (`makeOptimisticSetter<Mix>("mixes", "user_phono_mixes", mixToRow)`) et la valeur de retour : `podcasts` → `mixes`, `setPodcasts` → `setMixes`.

- [ ] **Step 3 : Vérifier les autres consommateurs**

```bash
grep -rn "podcasts\|setPodcasts\|Podcast" src/ app/ --include=*.ts --include=*.tsx
```
Traiter chaque occurrence. Vérifier en particulier `DashboardPage.tsx` et les règles de suggestion (`src/modules/tasks/rules/phono.ts`), qui lisent `usePhonoData`.

Retirer ensuite les alias `@deprecated` `Podcast` et `PodcastTracklistItem` de `sidekick-store.ts` une fois qu'aucun import ne les référence.

- [ ] **Step 4 : Vérifier**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

---

## Task 18 : `TracklistEditor` — collage en masse

C'est la fonctionnalité centrale de l'onglet. La saisie ligne par ligne actuelle décourage à partir de quinze titres, et c'est précisément la tracklist qui détermine la répartition des droits.

**Files:**
- Create: `src/modules/phono/lib/mix.ts`
- Create: `src/modules/phono/components/mixes/TracklistEditor.tsx`

- [ ] **Step 1 : Parser et export dans `lib/mix.ts`**

```ts
// src/modules/phono/lib/mix.ts
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

function newItemId(): string {
  return "mt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

export function normalizeMix(m: Mix): Mix {
  return {
    ...m,
    title: m.title ?? "",
    artists: m.artists ?? "",
    format: m.format ?? "dj_set",
    isVideo: Boolean(m.isVideo),
    status: m.status ?? "en_production",
    releaseDate: m.releaseDate ?? "",
    tracklist: Array.isArray(m.tracklist) ? m.tracklist : [],
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

/** Rendu texte pour Mixcloud, Resident Advisor ou une déclaration SACEM. */
export function formatTracklistForCopy(items: MixTracklistItem[]): string {
  return items
    .map((item) => {
      const time = (item.time || "0:00").trim();
      const artist = (item.artist || "").trim();
      const label = (item.label || "").trim();
      return [time, artist, label ? `[${label}]` : ""].filter(Boolean).join(" ");
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
```

> `formatTracklistForCopy` reprend la fonction existante (`CatalogPage.tsx:346`) sans changement de format de sortie : c'est celui que l'utilisateur colle déjà chez Mixcloud.

- [ ] **Step 2 : `TracklistEditor`**

```ts
interface TracklistEditorProps {
  items: MixTracklistItem[];
  onChange: (items: MixTracklistItem[]) => void;
}
```

- **Import par collage** : bouton « Coller une tracklist » ouvrant un `Textarea` en `font-mono`, avec un exemple en placeholder. À la validation, `parseTracklist` puis **aperçu du résultat** avant application, et le choix « Remplacer » ou « Ajouter à la suite ». Ne jamais écraser une tracklist existante sans le demander.
- **Tableau** : timecode (`w-24 text-center font-mono tabular-nums`), artiste — titre (`flex-1`), label (`w-40`), suppression. Réordonnable au drag & drop, même montage `@dnd-kit` qu'à la tâche 14.
- **Export** : bouton `Copy` copiant `formatTracklistForCopy(items)` dans le presse-papier, avec confirmation visuelle de deux secondes (icône `Check`).
- Pied : `{n} titres · {durée}` via `tracklistDuration`.
- Vide : `EmptyState` compact orientant vers le collage plutôt que vers l'ajout manuel.

- [ ] **Step 3 : Vérifier**

```bash
npx tsc --noEmit && npm run lint
```

---

## Task 19 : `MixRow`, `MixDialog`, `MixesTab`

**Files:**
- Create: `src/modules/phono/components/mixes/MixRow.tsx`
- Create: `src/modules/phono/components/mixes/MixDialog.tsx`
- Create: `src/modules/phono/components/mixes/MixesTab.tsx`

- [ ] **Step 1 : Contrats de props**

```ts
interface MixRowProps {
  mix: Mix;
  onEdit: () => void;
  onDelete: () => void;
  onCopyTracklist: () => void;
}

interface MixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = création. */
  mix: Mix | null;
  onSubmit: (mix: Mix) => void;
}

interface MixesTabProps {
  mixes: Mix[];
  setMixes: (fn: (prev: Mix[]) => Mix[]) => void;
}
```

- [ ] **Step 2 : `MixRow`**

```
┌──────────────────────────────────────────────────────────────────┐
│ ▣  Nom du set          [DJ set] 📹    28 juin 2025               │
│    Artiste                            18 titres · 1 h 04    ⋯   │
└──────────────────────────────────────────────────────────────────┘
```

Même conteneur que `TrackRow`. `Badge` de format via `mixFormatLabel` ; icône `Video` de 12 px si `isVideo`, avec un `title` « Captation vidéo ». Compte et durée depuis `tracklistDuration`. Menu `⋯` : Éditer · Copier la tracklist · Supprimer.

- [ ] **Step 3 : `MixDialog`**

Titre \*, Artistes, Format (`MIX_FORMATS`), case « Captation vidéo », Statut, Date de publication, Plateforme (`publishedOn`), Cover, puis `TracklistEditor`.

- [ ] **Step 4 : `MixesTab` et branchement**

Liste, recherche sur titre et artistes, `EmptyState` avec l'icône `Mic`. Dans `CatalogPage.tsx`, renommer l'onglet en « Mixes » et remplacer le bloc podcasts par `<MixesTab />`. Supprimer `defaultPodcast`, `normalizePodcast`, `newPodcastId`, `formatTracklistForCopy`, `addPodcastFromDraft`, `updatePodcast`, `removePodcast`, `handlePodcastCoverChange`, `addPodcastTracklistItem`, `updatePodcastTracklistItem`, `removePodcastTracklistItem`, le dialog et le bloc `{tab === "podcasts" && …}`.

Retirer la compatibilité `isLive` temporaire ajoutée à la tâche 7.

- [ ] **Step 5 : Vérifier**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Parcours dev, onglet Mixes :

1. Les mixes existants s'affichent avec un format cohérent avec l'ancien `is_live`.
2. Créer un mix, coller une tracklist de dix lignes au format `00:00 Artiste – Titre [Label]` → aperçu correct, application, timecodes en place.
3. Coller une tracklist mal formée → aucune ligne perdue, les lignes non reconnues sont éditables.
4. Coller sur une tracklist non vide → le choix Remplacer / Ajouter est proposé.
5. Réordonner au drag & drop, enregistrer, rouvrir → ordre conservé.
6. Copier la tracklist → le presse-papier contient le format attendu.
7. Recharger la page → tout est persisté.

- [ ] **Step 6 : Commit** *(sur demande uniquement)*

```bash
git add supabase/migrations/ src/modules/phono/ src/hooks/usePhonoData.ts src/lib/sidekick-store.ts
git commit -m "feat(phono): Podcasts devient Mixes, tracklist par collage

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 4 — Export de métadonnées

## Task 20 : L'API accepte un `audioPath`

**Files:**
- Modify: `app/api/phono/apply-metadata/route.ts`

- [ ] **Step 1 : Lire la route existante**

```bash
cat app/api/phono/apply-metadata/route.ts
```
Relever la façon dont elle lit le `FormData` (`file`, `metadata`, `cover`) et écrit les tags. La logique de tagging ne change pas.

- [ ] **Step 2 : Résoudre le fichier côté serveur**

Accepter un champ `audioPath` **en alternative** à `file`. Quand il est présent :

```ts
// Le premier segment du chemin est l'id du propriétaire : même contrôle que
// dans /api/phono/signed-audio. createSignedUrl et download appelés côté
// serveur ne passent pas par les policies RLS.
if (audioPath.split("/")[0] !== userId) {
  return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
}

const { data: blob, error } = await supabase.storage
  .from(DRIVE_BUCKET)
  .download(audioPath);

if (error || !blob) {
  return NextResponse.json({ error: "Fichier audio introuvable." }, { status: 404 });
}
```

Le `Blob` obtenu alimente ensuite le même traitement que le fichier uploadé.

Si ni `file` ni `audioPath` n'est fourni, répondre 400 avec « Aucun fichier audio fourni. »

> Motif : sans cela, exporter un album de douze WAV ferait descendre puis remonter environ 500 Mo par le navigateur, pour un fichier qui est déjà à côté du serveur.

- [ ] **Step 3 : Vérifier**

```bash
npx tsc --noEmit && npm run build
```
Puis, l'app lancée, avec le chemin d'un fichier réel du bucket :

```bash
curl -X POST http://localhost:3000/api/phono/apply-metadata \
  -F 'audioPath=<userId>/phono/audio/<fichier>.wav' \
  -F 'metadata={"title":"Test","artist":"Moi","album":"","albumArtist":"Moi"}' \
  -o /tmp/tagged.wav -w '%{http_code}\n'
```
Attendu : `200` et un fichier non vide dans `/tmp/tagged.wav`. Un `401` signifie que la requête n'est pas authentifiée — refaire le test depuis l'interface.

Vérifier aussi qu'un `audioPath` pointant vers le dossier d'un autre utilisateur renvoie `403`.

---

## Task 21 : `MetadataExportDialog`

**Files:**
- Create: `src/modules/phono/components/metadata/MetadataExportDialog.tsx`
- Modify: `src/modules/phono/components/CatalogPage.tsx`

- [ ] **Step 1 : Contrat de props**

```ts
export type MetadataExportTarget =
  | { kind: "version"; trackId: string; versionId: string }
  | { kind: "track"; trackId: string }
  | { kind: "album"; albumId: string };

interface MetadataExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: MetadataExportTarget | null;
  tracks: Track[];
  albums: Album[];
}
```

- [ ] **Step 2 : Contenu du dialog**

**Portée** — déduite de `target`, affichée en clair : « Version *Instrumental* de *Titre* », « Les 3 versions de *Titre* », « Les 12 titres de *Album* ».

**Source, par élément à exporter** — deux états :

- Fichier hébergé présent : ligne « ✓ *nom.wav* · 38 Mo » plus un lien « Utiliser un autre fichier ».
- Absent : `input type="file"` pour un dépôt ponctuel.

Un élément sans fichier ni dépôt est exclu de l'export, signalé par une ligne grisée « ignoré, aucun fichier ». Ne pas bloquer l'export entier pour autant : exporter dix titres sur douze vaut mieux que zéro.

**Aperçu des tags** — tableau à deux colonnes construit depuis `buildMetadataPayload` et `METADATA_FIELD_LABELS`, champs vides omis. Pour un album, l'aperçu porte sur la première piste, avec la mention « Aperçu de la piste 1 sur 12 ». C'est ici que la cascade label/éditeur devient vérifiable, ce qu'elle n'a jamais été.

**Export** — `Loader2` animé pendant le traitement, avec le décompte « Traitement 3/12 ».

- [ ] **Step 3 : Traitement**

- Une seule version → un fichier téléchargé, nommé `safeFileName(payload.title) + extension`.
- Plusieurs versions ou album → un zip JSZip. Pour un album, dossier au nom de la release et fichiers préfixés `01 - `, `02 - `… en reprenant la numérotation actuelle (`String(n).padStart(2, "0")`).
- Envoi : `FormData` avec `audioPath` **ou** `file`, plus `metadata` en JSON, plus `cover` quand une cover data-URL existe (album d'abord, sinon titre — l'ordre actuel).
- Un échec sur un élément n'interrompt pas les autres : le collecter et afficher à la fin « 2 fichiers n'ont pas pu être traités : … ». Le code actuel `console.error` puis `continue` en silence.
- Remplacer les `alert()` existants par un message d'erreur dans le dialog.

- [ ] **Step 4 : Brancher et retirer l'ancien code**

Monter le dialog dans `CatalogPage`, piloté par un état `exportTarget`. Le brancher sur `onExportMetadata` de `TrackRow`, `VersionList` et `AlbumCard`.

Supprimer de `CatalogPage.tsx` : `processMetadata`, `processAlbumMetadata`, `handleMetadataFileChange` et les états `metadataTrackId`, `metadataFile`, `metadataProcessing`, `metadataUploading`, `metadataBuffer`, `albumMetadataId`, `albumMetadataFiles`, `albumMetadataBuffers`, `albumMetadataUploading`, `albumMetadataProcessing`.

- [ ] **Step 5 : Vérifier**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Parcours dev :

1. Exporter une version avec fichier hébergé → aucun dépôt demandé, téléchargement direct.
2. Ouvrir le fichier obtenu dans un lecteur de tags (Kid3, Mp3tag, ou « Lire les informations » du Finder) → titre, artiste, ISRC, label et copyright conformes à l'aperçu.
3. Exporter une version sans fichier → le dépôt ponctuel est proposé et fonctionne.
4. Exporter un titre à trois versions → zip contenant trois fichiers, titres distincts (`Titre`, `Titre (Instrumental)`, `Titre (Live)`).
5. Exporter un album → zip, dossier au nom de l'album, fichiers numérotés `01 - `, tags `trackNumber`/`trackTotal` corrects.
6. Exporter un album dont un titre n'a pas de fichier → les autres sont exportés, le manquant est signalé.
7. Vérifier la cascade sur un titre auto-produit (label = artiste) et sur un titre sous label (label = le label).

- [ ] **Step 6 : Commit** *(sur demande uniquement)*

```bash
git add src/modules/phono/components/metadata/ app/api/phono/apply-metadata/route.ts src/modules/phono/components/CatalogPage.tsx
git commit -m "feat(phono): export de métadonnées unifié, résolu côté serveur

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 5 — Nettoyage

## Task 22 : Réduire `CatalogPage` et vérifier l'ensemble

**Files:**
- Modify: `src/modules/phono/components/CatalogPage.tsx`

- [ ] **Step 1 : Vérifier la taille atteinte**

```bash
wc -l src/modules/phono/components/CatalogPage.tsx
```
Attendu : **moins de 200 lignes**. Au-delà, il reste du code à déplacer — le chercher et le sortir.

Le fichier ne doit plus contenir que : les imports, l'état d'onglet, l'état de filtre, l'état d'export, l'appel à `usePhonoData`, les états `PageLoader` / `PageError`, et le rendu `PhonoPlayerProvider > CatalogHeader + onglets + Tab + AudioPlayerBar + MetadataExportDialog`.

- [ ] **Step 2 : Chasser le code mort**

```bash
grep -n "JSZip\|useSidekickData\|useSearchParams\|useRef" src/modules/phono/components/CatalogPage.tsx
npx tsc --noEmit
npm run lint
```
`JSZip` doit avoir migré vers `MetadataExportDialog`. Vérifier que `useSidekickData` n'est conservé que s'il sert encore (badges de projet sur les titres — le cas échéant, la logique appartient à `TrackRow`, lui passer la donnée en prop).

Vérifier qu'aucun import ne pointe encore vers l'ancienne arborescence :

```bash
grep -rn "components/listening/VersionAudioField" src/ app/
grep -rn "PodcastTracklistItem\|: Podcast\b" src/ app/
```
Attendu : aucune ligne.

- [ ] **Step 3 : Vérifier la navigation**

`CLAUDE.md` impose une entrée de sidebar pour toute page. Aucune route n'est ajoutée ici, mais vérifier que `src/components/layout/Sidebar.tsx:61-63` reste juste — les trois entrées Phono (Catalogue, Sessions Studio, Liens d'écoute) sont inchangées.

- [ ] **Step 4 : Recette complète**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Puis, en dev, dérouler la recette de la spec :

1. Propagation de statut album → titres, sans recul.
2. Contributeurs d'album recalculés après ajout et après retrait d'un titre.
3. Cascade label / éditeur dans les tags écrits, sur un auto-produit et sur un titre sous label.
4. Un titre dont `guest_artists` contient encore des chaînes s'affiche et se ré-enregistre sans perte.
5. Numérotation `01 - Titre` et nom de dossier dans le zip d'album.
6. Lecture audio continue en changeant d'onglet.
7. Filtres du bandeau synchronisés avec ceux de la barre d'outils.
8. Les trois onglets ont un `EmptyState` sur un compte vierge.
9. Aucune régression dans les modules qui lisent `usePhonoData` : Dashboard, suggestions de tâches, Calendrier.
10. La page Liens d'écoute se charge toujours et voit les fichiers audio rattachés depuis le catalogue.

- [ ] **Step 5 : Commit** *(sur demande uniquement)*

```bash
git add src/modules/phono/
git commit -m "refactor(phono): CatalogPage réduit à son orchestration

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Reste à faire, hors de ce plan

- **Sessions Studio** — spec B, à brainstormer. `SessionsStudioPage.tsx` (688 lignes) n'est pas touché ici.
- **Liens d'écoute** — chantier en cours, non touché. La refonte ne modifie aucun champ dont il dépend : `audioPath`, `audioSource`, `audioName`, `durationMs`, `sizeBytes` et `peaks` gardent leur forme.
- **Supabase Pro** — inscrit dans `ALPHA.md`, section « Recette de déploiement ». Tant qu'il n'est pas actif, un master WAV 24 bits de plus de 50 Mo est refusé avec un message explicite. C'est le comportement attendu, pas un bug.
