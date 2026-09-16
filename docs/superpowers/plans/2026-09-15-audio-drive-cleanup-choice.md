# Choix de conservation des fichiers audio dans le Drive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user choose, at the moment a track/version/mix audio file leaves the catalogue, whether the underlying file is deleted from the Drive bucket or kept — and lock the "Catalogue" Drive folder plus any file it contains that's still referenced by the catalogue.

**Architecture:** A single shared helper (`handleDetachedAudio`) either deletes or moves a bucket object out of the GC-scanned folder whenever a track, version, or mix detaches from its audio. The Drive-side folder (renamed `phono/audio` → `phono/catalogue`) becomes locked like other module folders, and individual files inside it are locked while a shared "catalogue audio paths" query says they're still referenced.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + Storage), no test framework (per `CLAUDE.md`: verify via `npx tsc --noEmit` and manual Playwright checks against the demo account, not unit tests).

**Project conventions that apply to every task below:**
- No `git add`/`git commit`/`git push` at any point in this plan — the Desktop-level and SIDEKICK `CLAUDE.md` both require committing only on the user's explicit request, after local verification. Steps below end with a verification step, never a commit.
- No test suite exists — "run the tests" steps are replaced with `npx tsc --noEmit` and, where relevant, a manual check via the dev server (credentials in `.env.local` — `SHOT_EMAIL`/`SHOT_PASSWORD`, demo account `booking.yoton@gmail.com`).

---

## File structure

| File | Responsibility |
|---|---|
| `src/modules/phono/lib/audio-gc.ts` (modify) | `AUDIO_PREFIX` renamed; referenced-paths logic split out into an exported `getCatalogAudioPaths()` reused by the GC and by Drive's lock computation. |
| `src/modules/phono/lib/audio-cleanup.ts` (new) | `handleDetachedAudio(paths, deleteFromDrive)` — the one place that decides delete-vs-move when audio leaves the catalogue. |
| `src/lib/migrate-phono-audio-folder.ts` (new) | One-shot, idempotent migration: moves existing files from `phono/audio` to `phono/catalogue` and repoints the three tables that store the path. |
| `src/modules/phono/components/audio/AudioAttachField.tsx` (modify) | Upload path prefix updated to `phono/catalogue`. |
| `src/modules/phono/components/tracks/DeleteTrackDialog.tsx` (modify) | Adds the checkbox; `onConfirm` gains a `deleteFromDrive` argument. |
| `src/modules/phono/components/tracks/TracksTab.tsx` (modify) | Calls `handleDetachedAudio` for every `audioSource === "upload"` version of the deleted track; wires `migratePhonoAudioFolder`/`pruneOrphanAudio` trigger point (already there for the GC — migration added alongside it via `CatalogPage.tsx`). |
| `src/modules/phono/components/tracks/VersionList.tsx` (modify) | Adds the checkbox to the detach/delete/replace confirmations; calls `handleDetachedAudio` for each. |
| `src/modules/phono/components/mixes/MixesTab.tsx` (modify) | Adds the checkbox to the mix delete confirmation; calls `handleDetachedAudio`. |
| `src/modules/phono/components/mixes/MixDialog.tsx` (modify) | Intercepts the in-form "detach" (✕) so it also asks, instead of silently clearing the field. |
| `src/modules/phono/components/CatalogPage.tsx` (modify) | Triggers `migratePhonoAudioFolder()` once, before/alongside the existing `pruneOrphanAudio()` trigger. |
| `src/modules/admin/components/DocumentsPage.tsx` (modify) | `"Phono/Catalogue"` added to locked template paths; per-file lock computed from `getCatalogAudioPaths()`; context menu and row icon updated to respect it. |

**Note on scope vs. the approved spec:** while mapping every place audio can become orphaned, a fifth path turned up that the spec didn't name explicitly — detaching a mix's audio *inside* `MixDialog` (the ✕ button on the audio field), which today clears the field silently with no confirmation at all. It's the same class of action as the version "replace"/"detach" flows already approved ("même choix au remplacement"), so Task 8 extends the same checkbox there for consistency. Flagging it here in case that's not what you meant.

---

### Task 1: Extract `getCatalogAudioPaths` and rename the GC's folder prefix

**Files:**
- Modify: `src/modules/phono/lib/audio-gc.ts`

- [ ] **Step 1: Replace the file's referenced-paths logic with an exported helper, and rename the prefix**

Replace the full contents of `src/modules/phono/lib/audio-gc.ts` with:

```ts
// src/modules/phono/lib/audio-gc.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { DRIVE_BUCKET, getUserStorageUsed } from "@/lib/drive-db";
import type { Track } from "@/lib/sidekick-store";

/** Dossier des fichiers téléversés depuis le catalogue, sous `<userId>/`. */
const AUDIO_PREFIX = "phono/catalogue";

/**
 * Sursis avant qu'un fichier soit considéré comme orphelin.
 *
 * `AudioAttachField` téléverse dès le choix du fichier, mais la version n'est
 * écrite en base qu'à l'enregistrement du dialogue : entre les deux, le fichier
 * n'est référencé nulle part sans être pour autant abandonné. Une heure couvre
 * largement un dialogue laissé ouvert, et reste sans effet sur le nettoyage des
 * vrais orphelins, qui ne redeviennent jamais référencés.
 */
const GRACE_MS = 60 * 60 * 1000;

/**
 * Chemins référencés par une version de titre ou par un mix — le catalogue au
 * sens strict, à l'exclusion des liens d'écoute publiés (voir `pruneOrphanAudio`
 * pour ceux-ci). Réutilisé par le nettoyeur automatique et par le verrouillage
 * des fichiers dans le Drive : les deux ont besoin de savoir si un fichier est
 * "dans le catalogue en ce moment", pas s'il est encore servi ailleurs.
 *
 * `null` si une des deux requêtes échoue — jamais un ensemble partiel silencieux,
 * pour que l'appelant décide lui-même du repli approprié (le GC s'abstient de
 * toucher au bucket, le verrouillage se contente de ne rien verrouiller).
 */
export async function getCatalogAudioPaths(
  supabase: SupabaseClient
): Promise<Set<string> | null> {
  const [tracks, mixes] = await Promise.all([
    supabase.from("user_phono_tracks").select("versions"),
    supabase.from("user_phono_mixes").select("audio_path"),
  ]);
  if (tracks.error || mixes.error) return null;

  const referenced = new Set<string>();
  for (const row of tracks.data ?? []) {
    const versions = (row.versions as Track["versions"]) ?? [];
    for (const v of versions) {
      if (v?.audioPath) referenced.add(v.audioPath);
    }
  }
  for (const row of mixes.data ?? []) {
    const path = row.audio_path as string | null;
    if (path) referenced.add(path);
  }
  return referenced;
}

/**
 * Supprime les fichiers audio que plus rien ne référence.
 *
 * Le catalogue ne doit pas accumuler de fichiers orphelins : détacher un
 * fichier d'une version, supprimer une version, un titre ou un mix laisse
 * derrière lui des octets qui comptent dans le quota de l'artiste sans qu'aucun
 * écran ne les montre. Plutôt que de câbler une suppression dans chacun de ces
 * chemins — et d'en oublier un au prochain ajout — on compare périodiquement le
 * contenu du dossier aux références réelles.
 *
 * Un fichier survit s'il apparaît dans `getCatalogAudioPaths()`, ou dans les
 * liens d'écoute publiés (`user_listening_link_items.audio_path`), qui
 * dénormalisent le chemin : un lien envoyé à un label continue de servir son
 * audio même après que la version a été supprimée du catalogue. Le supprimer
 * casserait un lien déjà dans la nature.
 *
 * Les fichiers rattachés depuis le Drive ne sont jamais concernés : ils vivent
 * en dehors de `<userId>/phono/catalogue`, donc hors du périmètre listé ici. Ce
 * sont des documents de l'artiste, pas des pièces jointes du catalogue.
 *
 * Sans effet de bord visible : en cas d'échec (réseau, session expirée), la
 * fonction renvoie 0 et le nettoyage aura lieu au prochain passage.
 *
 * @returns le nombre de fichiers supprimés.
 */
export async function pruneOrphanAudio(): Promise<number> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const prefix = `${user.id}/${AUDIO_PREFIX}`;

  const [listed, items, catalogPaths] = await Promise.all([
    supabase.storage.from(DRIVE_BUCKET).list(prefix, { limit: 1000 }),
    supabase.from("user_listening_link_items").select("audio_path"),
    getCatalogAudioPaths(supabase),
  ]);

  // Une seule requête en échec et le référentiel est incomplet : supprimer sur
  // cette base effacerait des fichiers bel et bien référencés.
  if (listed.error || items.error || catalogPaths === null) return 0;

  const files = listed.data ?? [];
  if (files.length === 0) return 0;

  const referenced = new Set(catalogPaths);
  for (const row of items.data ?? []) {
    const path = row.audio_path as string | null;
    if (path) referenced.add(path);
  }

  const cutoff = Date.now() - GRACE_MS;
  const orphans = files
    .filter((f) => {
      if (!f.name) return false;
      // `list` remonte aussi les sous-dossiers, sans métadonnées de taille.
      if (!f.metadata) return false;
      if (referenced.has(`${prefix}/${f.name}`)) return false;
      const created = f.created_at ? Date.parse(f.created_at) : NaN;
      return !Number.isFinite(created) || created < cutoff;
    })
    .map((f) => `${prefix}/${f.name}`);

  if (orphans.length === 0) return 0;

  const { error } = await supabase.storage.from(DRIVE_BUCKET).remove(orphans);
  if (error) return 0;

  // Recale le compteur `user_drive_storage`, qui vient d'être faussé de la
  // taille des fichiers supprimés : il est recalculé à partir du bucket.
  await getUserStorageUsed(supabase, user.id).catch(() => {});

  return orphans.length;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `audio-gc.ts`. (`getCatalogAudioPaths` isn't imported anywhere yet — that's expected until Task 9.)

---

### Task 2: Point new uploads at `phono/catalogue`

**Files:**
- Modify: `src/modules/phono/components/audio/AudioAttachField.tsx:129`

- [ ] **Step 1: Change the upload sub-path**

In the `attach()` function, change:

```ts
      const { path } = await uploadDriveFileToPath(
        supabase,
        userId,
        file,
        "phono/audio",
        {
```

to:

```ts
      const { path } = await uploadDriveFileToPath(
        supabase,
        userId,
        file,
        "phono/catalogue",
        {
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

---

### Task 3: `handleDetachedAudio` — the shared delete-or-keep helper

**Files:**
- Create: `src/modules/phono/lib/audio-cleanup.ts`

- [ ] **Step 1: Write the module**

```ts
// src/modules/phono/lib/audio-cleanup.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { DRIVE_BUCKET, deleteStorageFile } from "@/lib/drive-db";

/**
 * Dossier de repli, sous `<userId>/`, pour les fichiers qu'on choisit de
 * garder dans le Drive plutôt que de les supprimer. Volontairement hors de
 * `phono/catalogue` (scanné par `pruneOrphanAudio`) : y rester les remettrait
 * en jeu pour le nettoyage automatique dès l'heure de sursis passée, alors que
 * l'utilisateur vient justement de dire qu'il voulait les garder.
 */
const KEPT_SUBFOLDER = "phono/depuis-catalogue";

async function moveToKept(supabase: SupabaseClient, path: string): Promise<void> {
  const parts = path.split("/");
  const userId = parts[0];
  const fileName = parts[parts.length - 1];
  const destDir = `${userId}/${KEPT_SUBFOLDER}`;
  const dot = fileName.lastIndexOf(".");
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot) : "";

  const { error } = await supabase.storage.from(DRIVE_BUCKET).move(path, `${destDir}/${fileName}`);
  if (!error) return;

  // Collision de nom la plus probable : un autre fichier "gardé" du même nom
  // existe déjà. Un seul nouvel essai, avec un suffixe qui ne peut pas entrer
  // en collision une seconde fois.
  const { error: retryError } = await supabase.storage
    .from(DRIVE_BUCKET)
    .move(path, `${destDir}/${base}-${Date.now()}${ext}`);
  if (retryError) throw new Error(retryError.message ?? String(retryError));
}

/**
 * Décide du sort d'un ou plusieurs fichiers audio qui viennent de quitter le
 * catalogue (suppression de piste/version/mix, détachement, remplacement).
 *
 * `deleteFromDrive` vient directement de la case à cocher présentée à
 * l'utilisateur au moment de l'action : cochée, le fichier est supprimé du
 * bucket ; décochée, il est déplacé hors de `phono/catalogue` pour échapper
 * définitivement à `pruneOrphanAudio` et rester consultable dans le Drive.
 *
 * N'échoue jamais bruyamment : l'action principale (suppression en base) a
 * déjà eu lieu quand cette fonction est appelée, un problème de stockage ne
 * doit pas donner l'impression que la suppression/le remplacement a échoué.
 * En cas d'échec du déplacement, le fichier reste dans `phono/catalogue` non
 * référencé et sera rattrapé par `pruneOrphanAudio` après son sursis d'1h.
 */
export async function handleDetachedAudio(
  paths: Array<string | undefined | null>,
  deleteFromDrive: boolean
): Promise<void> {
  const unique = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));
  if (unique.length === 0) return;

  const supabase = createClient();
  for (const path of unique) {
    try {
      if (deleteFromDrive) {
        await deleteStorageFile(supabase, path);
      } else {
        await moveToKept(supabase, path);
      }
    } catch (e) {
      console.error(`[audio-cleanup] échec sur ${path}`, e);
    }
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

---

### Task 4: Migrate existing `phono/audio` files to `phono/catalogue`

**Files:**
- Create: `src/lib/migrate-phono-audio-folder.ts`
- Modify: `src/modules/phono/components/CatalogPage.tsx`

- [ ] **Step 1: Write the migration**

```ts
// src/lib/migrate-phono-audio-folder.ts

import { createClient } from "@/lib/supabase";
import { DRIVE_BUCKET } from "@/lib/drive-db";
import type { Track } from "@/lib/sidekick-store";

const FLAG = "phono_audio_folder_migrated";
const OLD_PREFIX = "phono/audio";
const NEW_PREFIX = "phono/catalogue";

function migratedPath(path: string, userId: string): string | null {
  const marker = `${userId}/${OLD_PREFIX}/`;
  if (!path.startsWith(marker)) return null;
  return `${userId}/${NEW_PREFIX}/${path.slice(marker.length)}`;
}

/**
 * Migration one-shot : le dossier Storage `phono/audio` est renommé
 * `phono/catalogue` (voir `audio-gc.ts` et `AudioAttachField.tsx`). Cette
 * fonction déplace les fichiers déjà présents sous l'ancien préfixe et
 * répercute le nouveau chemin sur les versions de titres, les mix et les
 * liens d'écoute qui le référencent — sans ça, le catalogue continuerait de
 * pointer vers des fichiers qui n'existent plus à cette adresse.
 *
 * Idempotente : ne fait rien si déjà migrée pour cet utilisateur, ou si aucun
 * fichier n'est trouvé sous l'ancien préfixe. Un échec à n'importe quelle
 * étape laisse le drapeau non posé : la migration sera retentée au prochain
 * chargement plutôt que de laisser le catalogue dans un état à moitié migré.
 */
export async function migratePhonoAudioFolder(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(FLAG) === "done") return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const oldFolder = `${user.id}/${OLD_PREFIX}`;
  const { data: files, error: listError } = await supabase.storage
    .from(DRIVE_BUCKET)
    .list(oldFolder, { limit: 1000 });
  if (listError) return;

  const names = (files ?? []).filter((f) => f.name && f.metadata).map((f) => f.name);

  if (names.length === 0) {
    localStorage.setItem(FLAG, "done");
    return;
  }

  for (const name of names) {
    const { error } = await supabase.storage
      .from(DRIVE_BUCKET)
      .move(`${oldFolder}/${name}`, `${user.id}/${NEW_PREFIX}/${name}`);
    if (error) return; // état intermédiaire toléré : on réessaiera au prochain chargement
  }

  const [tracks, mixes, items] = await Promise.all([
    supabase.from("user_phono_tracks").select("id, versions"),
    supabase.from("user_phono_mixes").select("id, audio_path"),
    supabase.from("user_listening_link_items").select("id, audio_path"),
  ]);
  if (tracks.error || mixes.error || items.error) return;

  for (const row of tracks.data ?? []) {
    const versions = (row.versions as Track["versions"]) ?? [];
    let changed = false;
    const nextVersions = versions.map((v) => {
      const next = v.audioPath ? migratedPath(v.audioPath, user.id) : null;
      if (!next) return v;
      changed = true;
      return { ...v, audioPath: next };
    });
    if (changed) {
      await supabase.from("user_phono_tracks").update({ versions: nextVersions }).eq("id", row.id);
    }
  }

  for (const row of mixes.data ?? []) {
    const audioPath = row.audio_path as string | null;
    const next = audioPath ? migratedPath(audioPath, user.id) : null;
    if (next) {
      await supabase.from("user_phono_mixes").update({ audio_path: next }).eq("id", row.id);
    }
  }

  for (const row of items.data ?? []) {
    const audioPath = row.audio_path as string | null;
    const next = audioPath ? migratedPath(audioPath, user.id) : null;
    if (next) {
      await supabase.from("user_listening_link_items").update({ audio_path: next }).eq("id", row.id);
    }
  }

  localStorage.setItem(FLAG, "done");
}
```

- [ ] **Step 2: Trigger it once from `CatalogPage.tsx`**

Read the current top of `src/modules/phono/components/CatalogPage.tsx` (imports and the `useEffect` that calls `pruneOrphanAudio`, around lines 1-73) before editing — line numbers may have shifted since this plan was written.

Add the import:

```ts
import { migratePhonoAudioFolder } from "@/lib/migrate-phono-audio-folder";
```

next to the existing `import { pruneOrphanAudio } from "@/modules/phono/lib/audio-gc";`.

Add a one-time trigger effect, placed just before the existing `audioRefCount`/`pruneOrphanAudio` effect:

```ts
  useEffect(() => {
    void migratePhonoAudioFolder();
  }, []);
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification against the demo account**

The demo account (`booking.yoton@gmail.com`, see `.env.local` / `scripts/shots.mjs`) has sample data. Run `npm run dev`, log in, and check in Supabase Studio (Storage → `drive` bucket) whether any files exist under `<demo-user-id>/phono/audio/` before testing. If none exist, this step has nothing to verify for that account — confirm instead with whichever account (likely your own artist account) actually has files there, since this migration only matters where legacy data exists.

---

### Task 5: Checkbox on whole-track deletion

**Files:**
- Modify: `src/modules/phono/components/tracks/DeleteTrackDialog.tsx`
- Modify: `src/modules/phono/components/tracks/TracksTab.tsx`

- [ ] **Step 1: Rewrite `DeleteTrackDialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Track } from "@/lib/sidekick-store";

interface DeleteTrackDialogProps {
  track: Track | null;
  albumCount: number;
  onConfirm: (track: Track, deleteFromDrive: boolean) => void;
  onCancel: () => void;
}

export function DeleteTrackDialog({
  track,
  albumCount,
  onConfirm,
  onCancel,
}: DeleteTrackDialogProps) {
  const [deleteFromDrive, setDeleteFromDrive] = useState(false);

  // Repart de zéro à chaque nouvelle piste proposée à la suppression : la case
  // ne doit jamais hériter du choix fait pour une suppression précédente.
  const session = track?.id ?? null;
  const [lastSession, setLastSession] = useState(session);
  if (lastSession !== session) {
    setLastSession(session);
    setDeleteFromDrive(false);
  }

  const hasUploadedAudio = (track?.versions ?? []).some(
    (v) => v.audioPath && v.audioSource === "upload"
  );

  return (
    <Dialog
      open={track !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Supprimer « {track?.title || "Sans titre"} » ?
          </DialogTitle>
          <DialogDescription className="text-sm text-[#F5F5F5]/70">
            Le titre et ses versions sont retirés du catalogue.
            {albumCount > 0
              ? ` Ce titre figure dans ${albumCount} album${
                  albumCount > 1 ? "s" : ""
                } et en sera retiré.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {hasUploadedAudio ? (
          <div className="flex items-start gap-2 rounded-md border border-[rgba(245,245,245,0.12)] p-3">
            <Checkbox
              id="delete-track-from-drive"
              checked={deleteFromDrive}
              onCheckedChange={(checked) => setDeleteFromDrive(checked === true)}
            />
            <Label
              htmlFor="delete-track-from-drive"
              className="cursor-pointer text-xs font-normal text-[#F5F5F5]/70"
            >
              Supprimer aussi le ou les fichiers du Drive. Sans cette case, ils
              sont conservés dans Drive → Phono → depuis-catalogue.
            </Label>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => track && onConfirm(track, deleteFromDrive)}
          >
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Wire it up in `TracksTab.tsx`**

In `src/modules/phono/components/tracks/TracksTab.tsx`, add the import:

```ts
import { handleDetachedAudio } from "@/modules/phono/lib/audio-cleanup";
```

Replace `confirmDelete`:

```ts
  const confirmDelete = (track: Track) => {
    setTracks((prev) => prev.filter((t) => t.id !== track.id));
    // Retire le titre des albums qui le référencent (« il en sera retiré »).
    const inAlbums = albums.filter((a) => (a.trackIds ?? []).includes(track.id));
    if (inAlbums.length > 0) {
      setAlbums((prev) =>
        prev.map((a) =>
          (a.trackIds ?? []).includes(track.id)
            ? { ...a, trackIds: a.trackIds.filter((id) => id !== track.id) }
            : a
        )
      );
    }
    if (expandedId === track.id) setExpandedId(null);
    setPendingDelete(null);
  };
```

with:

```ts
  const confirmDelete = (track: Track, deleteFromDrive: boolean) => {
    setTracks((prev) => prev.filter((t) => t.id !== track.id));
    // Retire le titre des albums qui le référencent (« il en sera retiré »).
    const inAlbums = albums.filter((a) => (a.trackIds ?? []).includes(track.id));
    if (inAlbums.length > 0) {
      setAlbums((prev) =>
        prev.map((a) =>
          (a.trackIds ?? []).includes(track.id)
            ? { ...a, trackIds: a.trackIds.filter((id) => id !== track.id) }
            : a
        )
      );
    }
    if (expandedId === track.id) setExpandedId(null);
    setPendingDelete(null);

    const uploadedPaths = (track.versions ?? [])
      .filter((v) => v.audioSource === "upload")
      .map((v) => v.audioPath);
    void handleDetachedAudio(uploadedPaths, deleteFromDrive);
  };
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. (`DeleteTrackDialog`'s `onConfirm={confirmDelete}` prop in `TracksTab.tsx:235` already matches the new two-argument signature — no change needed there.)

- [ ] **Step 4: Manual verification**

`npm run dev`, log into the demo account, go to a track with an uploaded audio file, delete it with the box unchecked — confirm in Supabase Studio that the file moved to `<userId>/phono/depuis-catalogue/`. Repeat on another track with the box checked — confirm the file is gone from Storage entirely.

---

### Task 6: Checkbox on version detach / delete / replace

**Files:**
- Modify: `src/modules/phono/components/tracks/VersionList.tsx`

- [ ] **Step 1: Rewrite the file**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Track, TrackVersion } from "@/lib/sidekick-store";
import { audioFormatsHint } from "@/modules/phono/lib/audio-limits";
import { handleDetachedAudio } from "@/modules/phono/lib/audio-cleanup";
import { VersionRow } from "./VersionRow";

interface VersionListProps {
  track: Track;
  onPatchVersion: (versionId: string, patch: Partial<TrackVersion>) => void;
  onAddVersion: () => void;
  onRemoveVersion: (versionId: string) => void;
  onExportMetadata: (versionId: string) => void;
}

type Confirm =
  | { kind: "detach"; version: TrackVersion }
  | { kind: "delete"; version: TrackVersion }
  | { kind: "replace"; version: TrackVersion; mode: "file" | "drive" }
  | null;

/**
 * Versions d'un titre, dépliées sous sa ligne. Lecture d'abord : les seules
 * saisies possibles sont le renommage et l'ISRC, sur un champ à la fois.
 */
export function VersionList({
  track,
  onPatchVersion,
  onAddVersion,
  onRemoveVersion,
  onExportMetadata,
}: VersionListProps) {
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [deleteFromDrive, setDeleteFromDrive] = useState(false);
  /**
   * Remplacement confirmé, en cours sur une version — une seule à la fois.
   * Séparé du `confirm` ci-dessus : celui-ci ferme dès la confirmation, alors
   * que le remplacement dure jusqu'au choix effectif d'un nouveau fichier.
   * `oldAudioPath`/`deleteFromDrive` sont capturés ici parce que la version en
   * état React aura déjà son nouveau `audioPath` au moment où le remplacement
   * se termine (`onReplacingDone`) — l'ancien chemin serait sinon perdu.
   */
  const [replacing, setReplacing] = useState<
    {
      versionId: string;
      mode: "file" | "drive";
      oldAudioPath?: string;
      deleteFromDrive: boolean;
    } | null
  >(null);
  const versions = track.versions ?? [];
  /**
   * La note n'apparaît qu'avec l'astérisque qui l'appelle, c'est-à-dire avec un
   * bouton « Ajouter un fichier audio » à l'écran. Le remplacement d'un fichier
   * existant n'affiche donc pas d'astérisque (voir `showFormatsMark` dans
   * `VersionRow`) : les deux marques apparaissent et disparaissent ensemble.
   */
  const showAudioHint = versions.some((v) => !v.audioPath);

  const openConfirm = (next: Confirm) => {
    setDeleteFromDrive(false);
    setConfirm(next);
  };

  const confirmDetach = () => {
    if (confirm?.kind !== "detach") return;
    onPatchVersion(confirm.version.id, {
      audioPath: undefined,
      audioSource: undefined,
      audioName: undefined,
      durationMs: undefined,
      sizeBytes: undefined,
      peaks: undefined,
    });
    if (confirm.version.audioSource === "upload") {
      void handleDetachedAudio([confirm.version.audioPath], deleteFromDrive);
    }
    setConfirm(null);
  };

  const confirmDelete = () => {
    if (confirm?.kind !== "delete") return;
    onRemoveVersion(confirm.version.id);
    if (confirm.version.audioSource === "upload") {
      void handleDetachedAudio([confirm.version.audioPath], deleteFromDrive);
    }
    setConfirm(null);
  };

  const confirmReplace = () => {
    if (confirm?.kind !== "replace") return;
    setReplacing({
      versionId: confirm.version.id,
      mode: confirm.mode,
      oldAudioPath:
        confirm.version.audioSource === "upload" ? confirm.version.audioPath : undefined,
      deleteFromDrive,
    });
    setConfirm(null);
  };

  // `Confirm`'s three non-null variants all carry `version` — no need to
  // check `kind` here, just that `confirm` isn't null (narrows it for the
  // `.version` access below, which `confirm?.kind === "x" && confirm.version`
  // would NOT do, since equality on an optional chain doesn't narrow `confirm`
  // itself).
  const showDriveCheckbox = confirm !== null && confirm.version.audioSource === "upload";

  return (
    <div className="ml-12 mt-3 space-y-1.5 border-l border-[rgba(245,245,245,0.08)] pl-4">
      {versions.length === 0 ? (
        <p className="text-xs text-[#F5F5F5]/45">
          Aucune version pour l&apos;instant. Ajoute-en une pour y rattacher un
          fichier audio.
        </p>
      ) : (
        versions.map((version) => (
          <VersionRow
            key={version.id}
            track={track}
            version={version}
            replacing={
              replacing?.versionId === version.id ? replacing.mode : null
            }
            onPatchVersion={onPatchVersion}
            onExportMetadata={onExportMetadata}
            onRequestDetach={(v) => openConfirm({ kind: "detach", version: v })}
            onRequestDelete={(v) => openConfirm({ kind: "delete", version: v })}
            onRequestReplace={(mode) =>
              openConfirm({ kind: "replace", version, mode })
            }
            onReplacingDone={() => {
              if (replacing?.oldAudioPath) {
                void handleDetachedAudio([replacing.oldAudioPath], replacing.deleteFromDrive);
              }
              setReplacing(null);
            }}
          />
        ))
      )}

      <div className="flex items-end justify-between gap-4 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-[#F5F5F5]/60 hover:text-[#F0FF00]"
          onClick={onAddVersion}
        >
          + Ajouter une version
        </Button>

        {/*
          Note de bas de carte, appelée par l'astérisque du bouton d'ajout.
        */}
        {showAudioHint ? (
          <p className="shrink-0 pb-1 text-right text-[10px] leading-tight text-[#F5F5F5]/30">
            <span aria-hidden className="mr-0.5">
              *
            </span>
            {audioFormatsHint()}
          </p>
        ) : null}
      </div>

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <DialogContent className="max-w-md">
          {confirm?.kind === "detach" ? (
            <>
              <DialogHeader>
                <DialogTitle>Détacher l&apos;audio de « {confirm.version.label} » ?</DialogTitle>
                <DialogDescription className="text-sm text-[#F5F5F5]/70">
                  Les liens d&apos;écoute qui l&apos;utilisent déjà continuent
                  de fonctionner.
                </DialogDescription>
              </DialogHeader>
              {showDriveCheckbox ? (
                <div className="flex items-start gap-2 rounded-md border border-[rgba(245,245,245,0.12)] p-3">
                  <Checkbox
                    id="detach-from-drive"
                    checked={deleteFromDrive}
                    onCheckedChange={(checked) => setDeleteFromDrive(checked === true)}
                  />
                  <Label
                    htmlFor="detach-from-drive"
                    className="cursor-pointer text-xs font-normal text-[#F5F5F5]/70"
                  >
                    Supprimer aussi le fichier du Drive. Sans cette case, il
                    est conservé dans Drive → Phono → depuis-catalogue.
                  </Label>
                </div>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
                  Annuler
                </Button>
                <Button type="button" variant="destructive" onClick={confirmDetach}>
                  Détacher
                </Button>
              </DialogFooter>
            </>
          ) : confirm?.kind === "delete" ? (
            <>
              <DialogHeader>
                <DialogTitle>Supprimer la version « {confirm.version.label} » ?</DialogTitle>
                <DialogDescription className="text-sm text-[#F5F5F5]/70">
                  {confirm.version.audioPath
                    ? "Cette version et sa référence au fichier audio disparaissent du titre."
                    : "Cette version disparaît du titre."}
                </DialogDescription>
              </DialogHeader>
              {showDriveCheckbox ? (
                <div className="flex items-start gap-2 rounded-md border border-[rgba(245,245,245,0.12)] p-3">
                  <Checkbox
                    id="delete-version-from-drive"
                    checked={deleteFromDrive}
                    onCheckedChange={(checked) => setDeleteFromDrive(checked === true)}
                  />
                  <Label
                    htmlFor="delete-version-from-drive"
                    className="cursor-pointer text-xs font-normal text-[#F5F5F5]/70"
                  >
                    Supprimer aussi le fichier du Drive. Sans cette case, il
                    est conservé dans Drive → Phono → depuis-catalogue.
                  </Label>
                </div>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
                  Annuler
                </Button>
                <Button type="button" variant="destructive" onClick={confirmDelete}>
                  Supprimer
                </Button>
              </DialogFooter>
            </>
          ) : confirm?.kind === "replace" ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Remplacer le fichier de « {confirm.version.label} » ?
                </DialogTitle>
                <DialogDescription className="text-sm text-[#F5F5F5]/70">
                  Le fichier actuel sera détaché de cette version dès que tu en
                  choisiras un nouveau. Les liens d&apos;écoute qui l&apos;utilisent
                  déjà continuent de fonctionner.
                </DialogDescription>
              </DialogHeader>
              {showDriveCheckbox ? (
                <div className="flex items-start gap-2 rounded-md border border-[rgba(245,245,245,0.12)] p-3">
                  <Checkbox
                    id="replace-from-drive"
                    checked={deleteFromDrive}
                    onCheckedChange={(checked) => setDeleteFromDrive(checked === true)}
                  />
                  <Label
                    htmlFor="replace-from-drive"
                    className="cursor-pointer text-xs font-normal text-[#F5F5F5]/70"
                  >
                    Supprimer aussi l&apos;ancien fichier du Drive une fois le
                    nouveau choisi. Sans cette case, il est conservé dans Drive
                    → Phono → depuis-catalogue.
                  </Label>
                </div>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
                  Annuler
                </Button>
                <Button type="button" onClick={confirmReplace}>
                  Continuer
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual verification**

`npm run dev`, demo account, a track with two versions where one has an uploaded file:
- "Détacher l'audio" with the box unchecked → file moves to `phono/depuis-catalogue`. With the box checked on another version → file deleted.
- "Remplacer le fichier" → confirm the checkbox appears, confirm, then actually pick a new file (or cancel and check nothing was deleted since replacement never completed) → verify the OLD file is deleted/moved only once the NEW one is actually attached, not at the "Continuer" click.
- A version whose file has `audioSource: "drive"` (attach via "Choisir dans le Drive" first) → confirm no checkbox appears on detach/delete, and the file is left untouched in the bucket.

---

### Task 7: Checkbox on mix deletion

**Files:**
- Modify: `src/modules/phono/components/mixes/MixesTab.tsx`

- [ ] **Step 1: Add the checkbox state, import, and update `confirmDelete`**

Add imports:

```ts
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { handleDetachedAudio } from "@/modules/phono/lib/audio-cleanup";
```

Add state next to the other `useState` calls:

```ts
  const [deleteFromDrive, setDeleteFromDrive] = useState(false);
```

Replace `confirmDelete`:

```ts
  const confirmDelete = (mix: Mix) => {
    setMixes((prev) => prev.filter((m) => m.id !== mix.id));
    if (editingMix?.id === mix.id) {
      setEditingMix(null);
      setDialogOpen(false);
    }
    setPendingDelete(null);
    if (mix.audioPath && mix.audioSource === "upload") {
      void handleDetachedAudio([mix.audioPath], deleteFromDrive);
    }
    setDeleteFromDrive(false);
  };
```

- [ ] **Step 2: Add the checkbox to the dialog, reset it when a new mix is targeted**

Replace the delete-confirmation `Dialog` block:

```tsx
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
            setDeleteFromDrive(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Supprimer « {pendingDelete?.title || "Sans titre"} » ?
            </DialogTitle>
            <DialogDescription className="text-sm text-[#F5F5F5]/70">
              Le mix et sa tracklist sont retirés du catalogue. Cette action est
              définitive.
            </DialogDescription>
          </DialogHeader>
          {pendingDelete?.audioPath && pendingDelete.audioSource === "upload" ? (
            <div className="flex items-start gap-2 rounded-md border border-[rgba(245,245,245,0.12)] p-3">
              <Checkbox
                id="delete-mix-from-drive"
                checked={deleteFromDrive}
                onCheckedChange={(checked) => setDeleteFromDrive(checked === true)}
              />
              <Label
                htmlFor="delete-mix-from-drive"
                className="cursor-pointer text-xs font-normal text-[#F5F5F5]/70"
              >
                Supprimer aussi le fichier du Drive. Sans cette case, il est
                conservé dans Drive → Phono → depuis-catalogue.
              </Label>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingDelete(null);
                setDeleteFromDrive(false);
              }}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => pendingDelete && confirmDelete(pendingDelete)}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification**

`npm run dev`, demo account: create/find a mix with an uploaded audio file, delete it with the box unchecked, confirm it lands in `phono/depuis-catalogue`; repeat with the box checked, confirm it's deleted from Storage.

---

### Task 8: Same choice when detaching a mix's audio inside `MixDialog`

**Files:**
- Modify: `src/modules/phono/components/mixes/MixDialog.tsx`

- [ ] **Step 1: Intercept the field's clearing patch instead of applying it immediately**

Add imports:

```ts
import { Checkbox } from "@/components/ui/checkbox";
import { handleDetachedAudio } from "@/modules/phono/lib/audio-cleanup";
```

(`Checkbox` may already be imported — check before adding a duplicate.)

Add state, next to `form`/`lastSession`:

```ts
  const [pendingDetach, setPendingDetach] = useState<{
    path: string;
    patch: Partial<AudioAttachment>;
  } | null>(null);
  const [detachDeleteFromDrive, setDetachDeleteFromDrive] = useState(false);
```

Replace the `AudioAttachField` block:

```tsx
            <AudioAttachField
              attachment={form.audio}
              onChange={(next) => {
                const clearing = Boolean(form.audio.audioPath) && next.audioPath === undefined;
                if (clearing && form.audio.audioSource === "upload" && form.audio.audioPath) {
                  setDetachDeleteFromDrive(false);
                  setPendingDetach({ path: form.audio.audioPath, patch: next });
                  return;
                }
                patch({ audio: { ...form.audio, ...next } });
              }}
              showFormatsMark={false}
            />
```

- [ ] **Step 2: Add the confirmation dialog**

`MixDialog` currently returns a single top-level `<Dialog>...</Dialog>` (no fragment). Wrap both in a fragment: change `return (` / the closing `);` of the component to `return (\n    <>` / `</>\n  );`, keep the existing `<Dialog open={open} onOpenChange={onOpenChange}>...</Dialog>` as the first child, and add this second `Dialog` as its sibling, right after it:

```tsx
      <Dialog
        open={pendingDetach !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDetach(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Détacher l&apos;audio de ce mix ?</DialogTitle>
            <DialogDescription className="text-sm text-[#F5F5F5]/70">
              Le fichier ne sera plus rattaché à ce mix.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 rounded-md border border-[rgba(245,245,245,0.12)] p-3">
            <Checkbox
              id="mix-detach-from-drive"
              checked={detachDeleteFromDrive}
              onCheckedChange={(checked) => setDetachDeleteFromDrive(checked === true)}
            />
            <Label
              htmlFor="mix-detach-from-drive"
              className="cursor-pointer text-xs font-normal text-[#F5F5F5]/70"
            >
              Supprimer aussi le fichier du Drive. Sans cette case, il est
              conservé dans Drive → Phono → depuis-catalogue.
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDetach(null)}>
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!pendingDetach) return;
                patch({ audio: { ...form.audio, ...pendingDetach.patch } });
                void handleDetachedAudio([pendingDetach.path], detachDeleteFromDrive);
                setPendingDetach(null);
              }}
            >
              Détacher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```

Read the current file first to place this correctly relative to the existing single top-level `<Dialog>` wrapping the whole form (`MixDialog.tsx:151-305` at spec time) — this new `Dialog` must be a sibling returned alongside it, so the component's `return (...)` needs a fragment (`<>...</>`) wrapping both if it doesn't already return one.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification**

`npm run dev`, demo account: open an existing mix with an uploaded audio file, click the ✕ on the audio field → confirm the small dialog now appears instead of the field clearing immediately. Cancel it → field still shows the original file. Confirm it (box unchecked) → field clears, save the mix, verify the file moved to `phono/depuis-catalogue`.

---

### Task 9: Lock the Catalogue folder and its referenced files in Drive

**Files:**
- Modify: `src/modules/admin/components/DocumentsPage.tsx`

- [ ] **Step 1: Read the current file around the areas below before editing**

Line numbers below are from the investigation pass and may have drifted from earlier tasks in this same plan (none of the earlier tasks touch this file, so drift should only come from unrelated concurrent work). Locate each snippet by content, not by line number, before editing.

- [ ] **Step 2: Lock the folder**

In `DEFAULT_LOCKED_TEMPLATE_PATHS` (near the top of the file), add the new path:

```ts
const DEFAULT_LOCKED_TEMPLATE_PATHS = [
  "Admin",
  "Contacts",
  "Edition",
  "Live",
  "Marketing",
  "Marketing/Publications",
  "Marketing/Presskit",
  "Phono",
  "Phono/Catalogue",
  "Revenus"
];
```

- [ ] **Step 3: Add the import and state for catalogue audio paths**

Add the import:

```ts
import { getCatalogAudioPaths } from "@/modules/phono/lib/audio-gc";
```

Add state, near where `lockedTemplatePaths` is declared (`useState<string[]>(DEFAULT_LOCKED_TEMPLATE_PATHS)`):

```ts
  const [catalogAudioPaths, setCatalogAudioPaths] = useState<Set<string>>(new Set());
```

Add a loading effect, right after the existing `loadLockedTemplates` effect (the one keyed on `[userId]` that calls `setLockedTemplatePaths`):

```ts
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function loadCatalogAudioPaths() {
      const supabase = createClient();
      const paths = await getCatalogAudioPaths(supabase);
      if (!cancelled) setCatalogAudioPaths(paths ?? new Set());
    }
    void loadCatalogAudioPaths();
    return () => {
      cancelled = true;
    };
  }, [userId]);
```

- [ ] **Step 4: Compute `isLocked` for file rows instead of hardcoding `false`**

In the `docsInFolder` `useMemo`, both places currently mapping a raw storage file to a row with `isLocked: false` — the global-search branch and the normal branch — change `isLocked: false` to `isLocked: catalogAudioPaths.has(f.path)` in both. Add `catalogAudioPaths` to the `useMemo`'s dependency array (the single array at the end covering both branches).

- [ ] **Step 5: Show a lock icon on locked file rows and block their context menu**

In the row-rendering table body, the file-name cell currently has three branches (folder / doc-with-link / doc-without-link). Update the two "doc" branches (with and without `row.doc.link`) to show a small lock icon when `row.doc.isLocked`, mirroring the existing folder pattern (`<Lock className="h-2.5 w-2.5 ..." />` badge already used for folders a few lines above). For the "doc-without-link" branch, that's:

```tsx
                          ) : (
                            <span className="flex items-center gap-2">
                              <span className="relative inline-flex items-center">
                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                {row.doc.isLocked && (
                                  <Lock className="h-2.5 w-2.5 text-muted-foreground absolute -bottom-0.5 -right-0.5" />
                                )}
                              </span>
                              {row.name}
                            </span>
                          )}
```

Apply the equivalent wrapping to the `row.doc.link` branch (wrap the existing `FileText` icon the same way, keep the `<a>` around the whole thing as it is today).

In the `onContextMenu` handler on the row (`if (row.isFolder) { if (row.folder.isLocked) return; ... } else { setContextMenu(...) }`), add the file guard so it mirrors the folder one:

```tsx
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (row.isFolder) {
                            if (row.folder.isLocked) return;
                            setContextMenu({ type: "folder", item: row.folder as DriveFolder, x: e.clientX, y: e.clientY });
                          } else {
                            if (row.doc.isLocked) return;
                            setContextMenu({ type: "document", item: row.doc, x: e.clientX, y: e.clientY });
                          }
                        }}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Manual verification**

`npm run dev`, demo account, navigate Drive → Phono → Catalogue:
- The "Catalogue" folder itself has no Renommer/Déplacer/Supprimer in its own right-click menu from one level up (Drive → Phono) — matches "Phono"'s existing behaviour.
- Inside it, a file currently attached to a track/mix shows the small lock icon and right-clicking it does nothing (no context menu opens).
- A file under `phono/depuis-catalogue/` (from earlier tasks' testing) is NOT locked — right-click still offers Renommer/Déplacer/Supprimer.

---

### Task 10: Full manual pass

**Files:** none — verification only.

- [ ] **Step 1: End-to-end check with Playwright against the demo account**

Using the existing `scripts/shots.mjs` pattern (logged-in session via `SHOT_EMAIL`/`SHOT_PASSWORD`), or manually in a browser:

1. Upload a fresh audio file to a track version → confirm in Supabase Studio it lands under `<userId>/phono/catalogue/`, not `phono/audio/`.
2. Confirm that same file shows as locked in Drive → Phono → Catalogue.
3. Delete that version with "Supprimer aussi le fichier du Drive" unchecked → confirm the file appears under Drive → Phono → depuis-catalogue and is no longer locked.
4. Repeat upload + deletion, this time with the box checked → confirm the file is gone from Storage entirely and no longer listed anywhere in Drive.
5. Confirm `npx tsc --noEmit` is clean across the whole plan's changes (running it once at the end catches any cross-file signature drift missed by per-task checks).

- [ ] **Step 2: Report back**

Summarize what was verified and flag anything that didn't behave as expected — do not commit; wait for explicit confirmation per project convention.
