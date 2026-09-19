# Catalogue Albums — page dédiée : plan d'implémentation

> **Pour un agent exécutant :** SOUS-SKILL REQUISE — `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans`, tâche par tâche. Les étapes sont des cases à cocher (`- [ ]`).

**Spec :** `docs/superpowers/specs/2026-09-16-catalogue-albums-page-design.md`

**But :** remplacer la fenêtre d'édition d'album par une page dédiée, calquée sur la page titre, dont la tracklist permet d'ajouter des titres existants et d'en créer de nouveaux à la volée.

**Architecture :** deux routes App Router sous `app/(app)/phono/catalogue/album/`, un trio de composants `AlbumEditPage` / `AlbumEditForm` / `AlbumEditAside` miroir du trio titre, et une refonte de `TracklistComposer`. Aucune migration Supabase, aucun nouveau hook : tout passe par `usePhonoData()`.

**Stack :** Next.js 16 App Router, React 19, TypeScript, Tailwind, Radix UI, dnd-kit, SWR via `usePhonoData`.

---

## Conventions de ce plan

**Pas de commit intermédiaire.** Le dépôt l'interdit (`CLAUDE.md` : « Only commit when the user explicitly requests it »). Chaque tâche se termine donc par une vérification, pas par un `git commit`. Ne jamais lancer `git add` ni `git push`.

**Pas de suite de tests** sur ce projet. La vérification de chaque tâche est :

```bash
npx tsc --noEmit
npm run lint
```

et, pour les tâches qui touchent l'écran, un passage à la main dans `npm run dev` connecté avec le compte de démo (`SHOT_EMAIL` / `SHOT_PASSWORD` dans `.env.local`, motif de connexion dans `scripts/shots.mjs`). Les routes `(app)` sont derrière `AuthGuard` : un `curl` renvoie une redirection vers `/login`, il faut une session.

**Design system :** fond `#101010`, texte `#F5F5F5`, cartes `rgba(44,44,46,0.5)`, bordures `rgba(245,245,245,0.08)`, accent `#F0FF00`. Icônes Lucide uniquement. Jamais de classe claire (`bg-white`, `text-gray-900`…). Pas de tiret cadratin dans le texte affiché à l'utilisateur.

---

## Structure des fichiers

| Fichier | Statut | Responsabilité |
|---|---|---|
| `app/(app)/phono/catalogue/album/nouveau/page.tsx` | créé | route de création |
| `app/(app)/phono/catalogue/album/[albumId]/page.tsx` | créé | route d'édition |
| `src/modules/phono/components/albums/AlbumEditPage.tsx` | créé | état du formulaire, chargement, écriture, navigation |
| `src/modules/phono/components/albums/AlbumEditForm.tsx` | créé | sections de la colonne principale |
| `src/modules/phono/components/albums/AlbumEditAside.tsx` | créé | pochette, « Il manque », actions |
| `src/modules/phono/components/albums/TracklistComposer.tsx` | modifié | tracklist pleine largeur, création inline, lien vers le titre |
| `src/modules/phono/components/albums/AlbumsTab.tsx` | modifié | grille seule : navigation + suppression |
| `src/modules/phono/components/CatalogPage.tsx` | modifié | onglet initial lu dans l'URL, prop `setTracks` retirée d'`AlbumsTab` |
| `src/modules/phono/components/albums/AlbumDialog.tsx` | supprimé | remplacé par la page |

Inchangés et réutilisés tels quels : `AlbumCard.tsx`, `AlbumCreditsFields.tsx`, `../tracks/TrackCoverField.tsx`, `../tracks/TrackSection.tsx`, `lib/album.ts`, `lib/release-status.ts`.

---

## Tâche 1 : la page d'édition et ses deux routes

À la fin de cette tâche, `/phono/catalogue/album/nouveau` fonctionne en tapant l'URL à la main. L'onglet Albums, lui, ouvre encore l'ancienne fenêtre — la bascule est la tâche 2.

**Fichiers :**
- Créer : `src/modules/phono/components/albums/AlbumEditPage.tsx`
- Créer : `src/modules/phono/components/albums/AlbumEditForm.tsx`
- Créer : `src/modules/phono/components/albums/AlbumEditAside.tsx`
- Créer : `app/(app)/phono/catalogue/album/nouveau/page.tsx`
- Créer : `app/(app)/phono/catalogue/album/[albumId]/page.tsx`

- [ ] **Étape 1 : créer `AlbumEditAside.tsx`**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { TrackCoverField } from "../tracks/TrackCoverField";
import type { AlbumFormState } from "./AlbumEditPage";

interface AlbumEditAsideProps {
  form: AlbumFormState;
  patch: (values: Partial<AlbumFormState>) => void;
  canSubmit: boolean;
  saving: boolean;
  dirty: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

/** Un manque = une chose que l'artiste devra faire, formulée comme telle. */
function missingItems(form: AlbumFormState): string[] {
  const missing: string[] = [];
  if (form.trackIds.length === 0) missing.push("Aucun titre dans la tracklist");
  if (!form.cover) missing.push("Pas de pochette");
  if (form.upcEan.trim() === "") missing.push("Pas d'UPC / EAN");
  if (form.releaseDate.trim() === "") missing.push("Pas de date de sortie");
  return missing;
}

export function AlbumEditAside({
  form,
  patch,
  canSubmit,
  saving,
  dirty,
  onSubmit,
  onCancel,
}: AlbumEditAsideProps) {
  const missing = missingItems(form);

  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <TrackCoverField value={form.cover} onChange={(cover) => patch({ cover })} />

      <div className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F5F5F5]/70">
          {missing.length > 0 ? "Il manque" : "Rien ne manque"}
        </h2>

        {missing.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {missing.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-xs text-[#F5F5F5]/70"
              >
                <span
                  aria-hidden
                  className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: "#F59E0B" }}
                />
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-[#F5F5F5]/55">
            Tracklist, pochette, UPC et date de sortie sont renseignés.
          </p>
        )}

        <div className="mt-4 space-y-2">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit || saving}
            className="w-full"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="w-full"
          >
            {dirty ? "Annuler les modifications" : "Retour au catalogue"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Étape 2 : créer `AlbumEditForm.tsx`**

`advancingCount` est calculé par la page et affiché ici ; la tâche 3 le branchera réellement, mais la prop existe dès maintenant pour ne pas retoucher la signature deux fois. En tâche 1, la page passe `0`.

```tsx
"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DATE_FORMAT_PLACEHOLDER,
  isoToFr,
  toIsoDatePickerValue,
} from "@/lib/date-format";
import type { Album, AlbumGuest, AlbumType, ReleaseStatus, Track } from "@/lib/sidekick-store";
import {
  ALBUM_TYPES,
  albumTracks,
  computeAlbumContributors,
} from "@/modules/phono/lib/album";
import {
  RELEASE_STATUSES,
  releaseStatusLabel,
} from "@/modules/phono/lib/release-status";
import { TrackSection } from "../tracks/TrackSection";
import { AlbumContributors, AlbumGuestList } from "./AlbumCreditsFields";
import { TracklistComposer } from "./TracklistComposer";
import type { AlbumFormState } from "./AlbumEditPage";

interface AlbumEditFormProps {
  form: AlbumFormState;
  patch: (values: Partial<AlbumFormState>) => void;
  /** Dérivé de `form.releaseDate` dans la page — la validation reste unique. */
  dateInvalid: boolean;
  /** Tous les titres du catalogue, déjà normalisés. */
  allTracks: Track[];
  /** Titres de la tracklist qui avanceront de statut à l'enregistrement. */
  advancingCount: number;
  onAddGuest: () => void;
  onUpdateGuest: (id: string, values: Partial<AlbumGuest>) => void;
  onRemoveGuest: (id: string) => void;
}

export function AlbumEditForm({
  form,
  patch,
  dateInvalid,
  allTracks,
  advancingCount,
  onAddGuest,
  onUpdateGuest,
  onRemoveGuest,
}: AlbumEditFormProps) {
  // Contributeurs calculés en direct : suivent l'ajout ou le retrait d'un titre
  // dans la tracklist, sans attendre l'enregistrement.
  const previewAlbum = {
    id: "__preview__",
    title: form.title,
    artist: form.artist,
    type: form.type,
    status: form.status,
    releaseDate: form.releaseDate,
    upcEan: form.upcEan,
    notes: form.notes,
    guests: form.guests,
    trackIds: form.trackIds,
  } as Album;
  const contributors = computeAlbumContributors(
    previewAlbum,
    albumTracks(previewAlbum, allTracks)
  );

  const publicationFilled =
    form.releaseDate.trim() !== "" ||
    form.upcEan.trim() !== "" ||
    form.genre.trim() !== "" ||
    form.distribution.trim() !== "" ||
    form.label.trim() !== "" ||
    form.editor.trim() !== "";

  const creditsFilled =
    form.guests.some((g) => g.name.trim() !== "") || form.notes.trim() !== "";

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F0FF00]">
          L&apos;essentiel
        </h2>
        <p className="mt-1 text-xs text-[#F5F5F5]/55">
          De quoi exister dans le catalogue. Le reste peut attendre la sortie.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="album-title">Titre *</Label>
            <Input
              id="album-title"
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Titre de l'album ou EP"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="album-artist">Artiste *</Label>
            <Input
              id="album-artist"
              value={form.artist}
              onChange={(e) => patch({ artist: e.target.value })}
              placeholder="Nom de l'artiste principal"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="album-type">Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) => patch({ type: v as AlbumType })}
            >
              <SelectTrigger id="album-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALBUM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="album-status">Statut</Label>
            <Select
              value={form.status}
              onValueChange={(v) => patch({ status: v as ReleaseStatus })}
            >
              <SelectTrigger id="album-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELEASE_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {advancingCount > 0 && (
              <p className="text-xs text-[#F5F5F5]/55">
                En enregistrant, {advancingCount} titre
                {advancingCount > 1 ? "s" : ""} passeront en «{" "}
                {releaseStatusLabel(form.status)} ».
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F0FF00]">
            Tracklist
          </h2>
          <span className="text-[11px] tabular-nums text-[#F5F5F5]/40">
            {form.trackIds.length} titre{form.trackIds.length > 1 ? "s" : ""}
          </span>
        </div>
        <p className="mt-1 text-xs text-[#F5F5F5]/55">
          Un album référence des titres du catalogue, il n&apos;en duplique
          jamais aucun.
        </p>
        <div className="mt-4">
          <TracklistComposer
            trackIds={form.trackIds}
            allTracks={allTracks}
            onChange={(trackIds) => patch({ trackIds })}
          />
        </div>
      </section>

      <TrackSection
        title="Publication"
        description="Date, code-barres et distribution. Rien de tout ça n'existe avant la sortie, laisse vide tant que tu ne sais pas."
        defaultOpen={publicationFilled}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="album-release-date">Date de sortie</Label>
            <DatePicker
              id="album-release-date"
              value={toIsoDatePickerValue(form.releaseDate)}
              onChange={(iso) => patch({ releaseDate: isoToFr(iso) })}
              placeholder={DATE_FORMAT_PLACEHOLDER}
            />
            {dateInvalid && (
              <p className="text-xs text-destructive">
                Date invalide — attendu {DATE_FORMAT_PLACEHOLDER}.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="album-upc">UPC / EAN</Label>
            <Input
              id="album-upc"
              value={form.upcEan}
              onChange={(e) => patch({ upcEan: e.target.value })}
              placeholder="Code-barres"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="album-genre">Genre</Label>
          <Input
            id="album-genre"
            value={form.genre}
            onChange={(e) => patch({ genre: e.target.value })}
            placeholder="Ex. Pop, Rap, Electro…"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="album-distribution">Distribution</Label>
          <Textarea
            id="album-distribution"
            value={form.distribution}
            onChange={(e) => patch({ distribution: e.target.value })}
            placeholder="Nom du distributeur, plateformes, accord, etc."
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="album-label">Label</Label>
            <Input
              id="album-label"
              value={form.label}
              onChange={(e) => patch({ label: e.target.value })}
              placeholder="Nom du label"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="album-editor">Éditeur</Label>
            <Input
              id="album-editor"
              value={form.editor}
              onChange={(e) => patch({ editor: e.target.value })}
              placeholder="Nom de l'éditeur"
            />
          </div>
        </div>
      </TrackSection>

      <TrackSection
        title="Crédits & notes"
        description="Les contributeurs sont hérités des titres de la tracklist. Ajoute ici ceux qui n'apparaissent sur aucun titre."
        defaultOpen={creditsFilled}
      >
        <AlbumContributors contributors={contributors} />

        <AlbumGuestList
          guests={form.guests}
          onAdd={onAddGuest}
          onUpdate={onUpdateGuest}
          onRemove={onRemoveGuest}
        />

        <div className="space-y-2 pt-1">
          <Label htmlFor="album-notes">Notes</Label>
          <Textarea
            id="album-notes"
            value={form.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="Notes libres…"
            rows={2}
            className="resize-none"
          />
        </div>
      </TrackSection>
    </div>
  );
}
```

- [ ] **Étape 3 : créer `AlbumEditPage.tsx`**

`advancing` est calculé dès maintenant et passé à `handleSubmit` ; la prop `advancingCount` du formulaire reste à `0` jusqu'à la tâche 3, où l'affichage sera branché et vérifié.

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { ArrowLeft } from "lucide-react";
import { usePhonoData } from "@/hooks/usePhonoData";
import { PageError } from "@/components/ui/page-error";
import { PageLoader } from "@/components/ui/page-loader";
import type {
  Album,
  AlbumGuest,
  AlbumType,
  ReleaseStatus,
} from "@/lib/sidekick-store";
import { newAlbumId, normalizeAlbum } from "@/modules/phono/lib/album";
import { isStatusMoreAdvanced } from "@/modules/phono/lib/release-status";
import { normalizeTrack } from "@/modules/phono/lib/track";
import { isValidDateFr, toDisplayDate } from "@/lib/date-format";
import { cn, focusRing } from "@/lib/utils";
import { AlbumEditAside } from "./AlbumEditAside";
import { AlbumEditForm } from "./AlbumEditForm";

interface AlbumEditPageProps {
  /** `null` = création. */
  albumId: string | null;
}

/** Champs pilotés par le formulaire. Reprend `AlbumDialog`. */
export interface AlbumFormState {
  title: string;
  type: AlbumType;
  artist: string;
  status: ReleaseStatus;
  releaseDate: string;
  upcEan: string;
  label: string;
  editor: string;
  distribution: string;
  genre: string;
  cover?: string;
  notes: string;
  guests: AlbumGuest[];
  trackIds: string[];
}

/**
 * Constante de module, contrairement à `emptyForm()` côté titre : un album
 * vierge ne tire aucun identifiant, il n'y a rien à figer au chargement du
 * bundle.
 */
const EMPTY_FORM: AlbumFormState = {
  title: "",
  type: "album",
  artist: "",
  status: "en_production",
  releaseDate: "",
  upcEan: "",
  label: "",
  editor: "",
  distribution: "",
  genre: "",
  cover: undefined,
  notes: "",
  guests: [],
  trackIds: [],
};

function formFromAlbum(album: Album): AlbumFormState {
  const a = normalizeAlbum(album);
  return {
    title: a.title,
    type: a.type,
    artist: a.artist,
    status: a.status,
    releaseDate: a.releaseDate,
    upcEan: a.upcEan,
    label: a.label ?? "",
    editor: a.editor ?? "",
    distribution: a.distribution ?? "",
    genre: a.genre ?? "",
    cover: a.cover,
    notes: a.notes ?? "",
    guests: a.guests ?? [],
    trackIds: a.trackIds,
  };
}

function newGuestId(): string {
  return "ag-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
}

/** Le catalogue, ouvert sur l'onglet d'où l'on vient. */
const BACK_URL = "/phono/catalogue?tab=albums";

export function AlbumEditPage({ albumId }: AlbumEditPageProps) {
  const router = useRouter();
  const posthog = usePostHog();
  const {
    albums,
    setAlbums,
    tracks: tracksRaw,
    setTracks,
    loading,
    error,
  } = usePhonoData();

  const existing = albumId ? albums.find((a) => a.id === albumId) : undefined;
  const album = existing ? normalizeAlbum(existing) : null;
  const tracks = tracksRaw.map(normalizeTrack);

  const [form, setForm] = useState<AlbumFormState>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<AlbumFormState>(EMPTY_FORM);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // L'album arrive après le premier rendu (SWR) : on remplit le formulaire dès
  // qu'il est là, une seule fois, sans écraser une saisie en cours. Ajustement
  // d'état en cours de rendu, comme `TrackEditPage` : pas de useEffect, pour
  // que la première peinture montre déjà les bonnes valeurs.
  const readyId = album ? album.id : albumId === null ? "__new__" : null;
  if (readyId !== null && loadedId !== readyId) {
    setLoadedId(readyId);
    const initial = album ? formFromAlbum(album) : EMPTY_FORM;
    setForm(initial);
    setInitialForm(initial);
  }

  const patch = (values: Partial<AlbumFormState>) =>
    setForm((prev) => ({ ...prev, ...values }));

  const addGuest = () =>
    setForm((prev) => ({
      ...prev,
      guests: [
        ...prev.guests,
        { id: newGuestId(), name: "", role: "artiste_secondaire" },
      ],
    }));
  const updateGuest = (id: string, values: Partial<AlbumGuest>) =>
    setForm((prev) => ({
      ...prev,
      guests: prev.guests.map((g) => (g.id === id ? { ...g, ...values } : g)),
    }));
  const removeGuest = (id: string) =>
    setForm((prev) => ({
      ...prev,
      guests: prev.guests.filter((g) => g.id !== id),
    }));

  const displayedDate = toDisplayDate(form.releaseDate);
  const dateInvalid = displayedDate !== "" && !isValidDateFr(displayedDate);
  const canSubmit =
    form.title.trim() !== "" && form.artist.trim() !== "" && !dateInvalid;
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  /**
   * Titres que l'enregistrement fera avancer.
   *
   * Publier un album fait avancer ses titres, jamais reculer : un titre déjà
   * « Publié » ne redevient pas « En production ». Même règle qu'avant, mais
   * calculée une seule fois — c'est elle qui est annoncée sous le statut et
   * elle qui est appliquée à l'enregistrement.
   */
  const advancing =
    form.status !== initialForm.status
      ? tracks.filter(
          (t) =>
            form.trackIds.includes(t.id) &&
            isStatusMoreAdvanced(form.status, t.status ?? "en_production")
        )
      : [];

  // Quitter avec une saisie non enregistrée, c'est perdre le travail.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const handleSubmit = () => {
    if (!canSubmit || saving) return;
    setSaving(true);

    const fields = {
      title: form.title.trim(),
      type: form.type,
      artist: form.artist.trim(),
      status: form.status,
      releaseDate: form.releaseDate,
      upcEan: form.upcEan.trim(),
      label: form.label,
      editor: form.editor,
      distribution: form.distribution,
      genre: form.genre,
      cover: form.cover,
      notes: form.notes,
      guests: form.guests.filter((g) => g.name.trim() !== ""),
      trackIds: form.trackIds,
    };

    // En édition on repart de l'album existant : tout champ hors formulaire doit
    // survivre. En création on génère l'id.
    const next: Album = album
      ? { ...album, ...fields }
      : { id: newAlbumId(), ...fields };

    setAlbums((prev) =>
      album ? prev.map((a) => (a.id === next.id ? next : a)) : [next, ...prev]
    );

    if (advancing.length > 0) {
      const ids = new Set(advancing.map((t) => t.id));
      setTracks((prev) =>
        prev.map((t) =>
          ids.has(t.id) ? { ...normalizeTrack(t), status: form.status } : t
        )
      );
    }

    if (!album) posthog?.capture("item_created", { module: "phono" });

    router.push(BACK_URL);
  };

  const handleCancel = () => {
    if (dirty && !window.confirm("Abandonner les modifications non enregistrées ?"))
      return;
    router.push(BACK_URL);
  };

  if (loading) return <PageLoader />;
  if (error)
    return (
      <PageError
        title="Impossible de charger cet album"
        description="Vérifie ta connexion ou réessaie dans quelques instants."
        onRetry={() => router.refresh()}
      />
    );

  if (albumId && !existing)
    return (
      <PageError
        title="Cet album n'existe plus"
        description="Il a peut-être été supprimé depuis un autre onglet."
        onRetry={() => router.push(BACK_URL)}
      />
    );

  return (
    <div>
      <button
        type="button"
        // Même chemin que le bouton « Annuler » du pied de page : confirmation
        // si des modifications sont en attente.
        onClick={handleCancel}
        className={cn(
          "mb-4 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-xs text-[#F5F5F5]/70 transition-colors hover:text-[#F5F5F5]",
          focusRing
        )}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour au catalogue
      </button>

      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]/40">
        Phono · Catalogue
      </p>
      <h1 className="text-xl font-bold tracking-tight text-[#F5F5F5]">
        {album ? album.title || "Album sans nom" : "Nouvel album ou EP"}
      </h1>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <AlbumEditForm
          form={form}
          patch={patch}
          dateInvalid={dateInvalid}
          allTracks={tracks}
          advancingCount={0}
          onAddGuest={addGuest}
          onUpdateGuest={updateGuest}
          onRemoveGuest={removeGuest}
        />
        <AlbumEditAside
          form={form}
          patch={patch}
          canSubmit={canSubmit}
          saving={saving}
          dirty={dirty}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
```

- [ ] **Étape 4 : créer les deux routes**

`app/(app)/phono/catalogue/album/nouveau/page.tsx` :

```tsx
import { AlbumEditPage } from "@/modules/phono/components/albums/AlbumEditPage";

export default function NouvelAlbumPage() {
  return <AlbumEditPage albumId={null} />;
}
```

`app/(app)/phono/catalogue/album/[albumId]/page.tsx` :

```tsx
import { AlbumEditPage } from "@/modules/phono/components/albums/AlbumEditPage";

export default async function EditerAlbumPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const { albumId } = await params;
  return <AlbumEditPage albumId={albumId} />;
}
```

- [ ] **Étape 5 : vérifier**

```bash
npx tsc --noEmit
npm run lint
```

Attendu : aucune erreur.

Puis, dans `npm run dev`, connecté au compte de démo : ouvrir `/phono/catalogue/album/nouveau`. Attendu — la page s'affiche avec ses quatre sections et l'aside ; « Enregistrer » est désactivé tant que titre et artiste sont vides ; renseigner les deux, ajouter un titre du catalogue, enregistrer ; l'album apparaît dans l'onglet Albums du catalogue. Ouvrir ensuite `/phono/catalogue/album/<id de cet album>` : le formulaire est prérempli.

Note : le retour pointe vers `?tab=albums`, que `CatalogPage` ne lit pas encore — on retombe sur l'onglet Titres. C'est la tâche 2.

---

## Tâche 2 : brancher l'onglet Albums sur la page, supprimer la fenêtre

**Fichiers :**
- Modifier : `src/modules/phono/components/albums/AlbumsTab.tsx`
- Modifier : `src/modules/phono/components/CatalogPage.tsx`
- Supprimer : `src/modules/phono/components/albums/AlbumDialog.tsx`

- [ ] **Étape 1 : réécrire `AlbumsTab.tsx`**

Le tab ne fait plus qu'afficher la grille, naviguer et supprimer. L'écriture d'album et la propagation de statut vivent désormais dans `AlbumEditPage`, et la prop `setTracks` disparaît.

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Disc3, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import type { Album, Track } from "@/lib/sidekick-store";
import { albumTracks } from "@/modules/phono/lib/album";
import { sortCatalog } from "@/modules/phono/lib/catalog-sort";
import { CatalogSortMenu } from "../CatalogSortMenu";
import { usePhonoSort } from "../PhonoSortProvider";
import { AlbumCard } from "./AlbumCard";

interface AlbumsTabProps {
  albums: Album[];
  tracks: Track[];
  setAlbums: (fn: (prev: Album[]) => Album[]) => void;
  onExportMetadata: (albumId: string) => void;
}

export function AlbumsTab({
  albums,
  tracks,
  setAlbums,
  onExportMetadata,
}: AlbumsTabProps) {
  const router = useRouter();
  const { sorts } = usePhonoSort();
  const [pendingDelete, setPendingDelete] = useState<Album | null>(null);

  // Même fonction de tri que la file du lecteur : parcourir les albums avec les
  // flèches suit l'ordre affiché ici.
  const visible = useMemo(
    () => sortCatalog(albums, sorts.albums),
    [albums, sorts.albums]
  );

  const openCreate = () => router.push("/phono/catalogue/album/nouveau");

  const confirmDelete = (album: Album) => {
    setAlbums((prev) => prev.filter((a) => a.id !== album.id));
    setPendingDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <CatalogSortMenu scope="albums" />
        <Button type="button" onClick={openCreate} className="btn-glow">
          <Plus className="mr-2 h-4 w-4" />
          Album
        </Button>
      </div>

      {albums.length === 0 ? (
        <EmptyState
          icon={Disc3}
          title="Aucun album ni EP"
          description="Regroupe tes titres en albums ou EP pour organiser ton catalogue et préparer tes sorties."
          action={{ label: "Ajouter un album ou EP", onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              trackCount={albumTracks(album, tracks).length}
              onEdit={() => router.push(`/phono/catalogue/album/${album.id}`)}
              onDelete={() => setPendingDelete(album)}
              onExportMetadata={() => onExportMetadata(album.id)}
            />
          ))}
        </div>
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Supprimer « {pendingDelete?.title || "Sans titre"} » ?
            </DialogTitle>
            <DialogDescription className="text-sm text-[#F5F5F5]/70">
              L&apos;album est retiré du catalogue. Ses titres, eux, restent
              dans le catalogue — un album ne fait que les référencer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
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
    </div>
  );
}
```

- [ ] **Étape 2 : dans `CatalogPage.tsx`, lire l'onglet initial dans l'URL**

Sans ça, enregistrer un album renvoie sur l'onglet Titres. Ajouter l'import en tête du fichier, à côté des autres imports `next` :

```tsx
import { useSearchParams } from "next/navigation";
```

Puis remplacer la ligne d'état de l'onglet :

```tsx
  const [tab, setTab] = useState<TabKey>("tracks");
```

par :

```tsx
  // L'onglet d'arrivée peut être imposé par l'URL : les pages d'édition de
  // titre et d'album y renvoient pour ne pas éjecter l'artiste de l'onglet
  // d'où il vient. L'état reste local ensuite, cliquer un onglet ne réécrit
  // pas l'URL.
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<TabKey>(
    tabParam === "albums" || tabParam === "mixes" ? tabParam : "tracks"
  );
```

- [ ] **Étape 3 : dans `CatalogPage.tsx`, retirer `setTracks` de l'appel à `AlbumsTab`**

Remplacer :

```tsx
        <AlbumsTab
          albums={albums}
          tracks={tracks}
          setAlbums={setAlbums}
          setTracks={setTracks}
          onExportMetadata={(albumId) =>
            setExportTarget({ kind: "album", albumId })
          }
        />
```

par :

```tsx
        <AlbumsTab
          albums={albums}
          tracks={tracks}
          setAlbums={setAlbums}
          onExportMetadata={(albumId) =>
            setExportTarget({ kind: "album", albumId })
          }
        />
```

`setTracks` reste utilisé par `TracksTab` dans le même fichier : ne pas le retirer de la déstructuration de `usePhonoData()`.

- [ ] **Étape 4 : supprimer la fenêtre**

```bash
rm src/modules/phono/components/albums/AlbumDialog.tsx
grep -rn "AlbumDialog" src app
```

Attendu : le `grep` ne renvoie rien.

- [ ] **Étape 5 : vérifier**

```bash
npx tsc --noEmit
npm run lint
```

Attendu : aucune erreur.

Si le build se plaint de `useSearchParams` non enveloppé dans un `<Suspense>` (le prérendu statique de Next l'exige parfois), envelopper le composant dans la route plutôt que dans `CatalogPage` — `app/(app)/phono/catalogue/page.tsx` devient :

```tsx
import { Suspense } from "react";
import { CatalogPage } from "@/modules/phono/components/CatalogPage";
import { PageLoader } from "@/components/ui/page-loader";

export default function PhonoCataloguePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CatalogPage />
    </Suspense>
  );
}
```

`app/(app)/phono/catalogue/titre/nouveau/page.tsx` appelle déjà `useSearchParams` sans Suspense et passe le build : ce correctif n'est probablement pas nécessaire, ne l'appliquer que si le build échoue.

En dev : depuis l'onglet Albums, le bouton « Album » ouvre la page de création ; un clic sur une carte ouvre la page d'édition ; enregistrer ramène sur le catalogue **ouvert sur l'onglet Albums** ; le menu `⋯` d'une carte supprime toujours après confirmation, et « Exporter les métadonnées » fonctionne toujours.

---

## Tâche 3 : annoncer la propagation de statut

**Fichiers :**
- Modifier : `src/modules/phono/components/albums/AlbumEditPage.tsx`

- [ ] **Étape 1 : passer le vrai compte au formulaire**

Remplacer :

```tsx
          advancingCount={0}
```

par :

```tsx
          advancingCount={advancing.length}
```

- [ ] **Étape 2 : vérifier**

```bash
npx tsc --noEmit
npm run lint
```

En dev, sur un album « En production » ayant au moins deux titres eux aussi en production : passer le statut à « Publié ». Attendu — la phrase « En enregistrant, 2 titres passeront en « Publié ». » apparaît sous le select. Enregistrer, puis ouvrir l'onglet Titres : les deux titres sont en « Publié ».

Puis repasser l'album en « En production ». Attendu — aucune phrase (aucun titre ne recule), et après enregistrement les titres restent en « Publié ».

---

## Tâche 4 : tracklist pleine largeur, statut et lien vers le titre

**Fichiers :**
- Modifier : `src/modules/phono/components/albums/TracklistComposer.tsx`
- Modifier : `src/modules/phono/components/albums/AlbumEditForm.tsx`
- Modifier : `src/modules/phono/components/albums/AlbumEditPage.tsx`

- [ ] **Étape 1 : dans `TracklistComposer.tsx`, enrichir les imports**

Remplacer :

```tsx
import { GripVertical, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Track } from "@/lib/sidekick-store";
```

par :

```tsx
import { GripVertical, Pencil, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Track } from "@/lib/sidekick-store";
import {
  RELEASE_STATUS_COLOR,
  releaseStatusLabel,
} from "@/modules/phono/lib/release-status";
```

- [ ] **Étape 2 : ajouter les deux nouvelles props au contrat**

Remplacer :

```tsx
interface TracklistComposerProps {
  trackIds: string[];
  allTracks: Track[];
  /** Reçoit toujours le tableau complet et ordonné. */
  onChange: (trackIds: string[]) => void;
}
```

par :

```tsx
interface TracklistComposerProps {
  trackIds: string[];
  allTracks: Track[];
  /** Reçoit toujours le tableau complet et ordonné. */
  onChange: (trackIds: string[]) => void;
  /** Ouvre la page d'édition du titre. Navigue hors de l'album. */
  onEditTrack: (trackId: string) => void;
}
```

- [ ] **Étape 3 : réécrire la ligne de tracklist**

Remplacer tout le composant `SortableTrackRow` (de `function SortableTrackRow({` jusqu'à sa dernière accolade fermante) par :

```tsx
function SortableTrackRow({
  id,
  index,
  track,
  onRemove,
  onEdit,
}: {
  id: string;
  index: number;
  /** `undefined` si le titre a été supprimé du catalogue — la ligne reste
   *  affichée et retirable pour ne pas piéger l'utilisateur. */
  track: Track | undefined;
  onRemove: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const status = track?.status ?? "en_production";

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] px-3 py-2"
    >
      <span className="w-5 shrink-0 text-right text-xs tabular-nums text-[#F5F5F5]/40">
        {index + 1}
      </span>
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab text-[#F5F5F5]/30 transition-colors hover:text-[#F5F5F5]/70 active:cursor-grabbing"
        aria-label="Réordonner"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[#F5F5F5]">
          {track ? track.title || "Sans titre" : "Titre introuvable"}
        </p>
        <p className="truncate text-xs text-[#F5F5F5]/45">
          {track
            ? track.mainArtist || "—"
            : "Ce titre a été supprimé du catalogue"}
        </p>
      </div>

      {track && (
        <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <span
            aria-hidden
            className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
            style={{
              background: RELEASE_STATUS_COLOR[status],
              boxShadow: `0 0 8px ${RELEASE_STATUS_COLOR[status]}55`,
            }}
          />
          <span className="text-[11px] text-[#F5F5F5]/55">
            {releaseStatusLabel(status)}
          </span>
        </span>
      )}

      {track && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-[#F5F5F5]/40 hover:text-[#F5F5F5]"
          aria-label={`Ouvrir ${track.title || "ce titre"}`}
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-[#F5F5F5]/40 hover:text-red-400"
        aria-label="Retirer de la tracklist"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}
```

- [ ] **Étape 4 : faire descendre `onEditTrack` jusqu'à la ligne**

Dans la signature du composant `TracklistComposer`, remplacer :

```tsx
export function TracklistComposer({
  trackIds,
  allTracks,
  onChange,
}: TracklistComposerProps) {
```

par :

```tsx
export function TracklistComposer({
  trackIds,
  allTracks,
  onChange,
  onEditTrack,
}: TracklistComposerProps) {
```

Puis, dans le rendu, remplacer :

```tsx
                  <SortableTrackRow
                    key={id}
                    id={id}
                    index={index}
                    track={byId.get(id)}
                    onRemove={() => remove(id)}
                  />
```

par :

```tsx
                  <SortableTrackRow
                    key={id}
                    id={id}
                    index={index}
                    track={byId.get(id)}
                    onRemove={() => remove(id)}
                    onEdit={() => onEditTrack(id)}
                  />
```

- [ ] **Étape 5 : faire descendre la prop depuis la page**

Dans `AlbumEditForm.tsx`, ajouter au contrat, après `advancingCount` :

```tsx
  /** Ouvre la page d'édition d'un titre de la tracklist. */
  onEditTrack: (trackId: string) => void;
```

L'ajouter à la déstructuration des props du composant, après `advancingCount,` :

```tsx
  onEditTrack,
```

Et la passer au composer :

```tsx
          <TracklistComposer
            trackIds={form.trackIds}
            allTracks={allTracks}
            onChange={(trackIds) => patch({ trackIds })}
            onEditTrack={onEditTrack}
          />
```

Dans `AlbumEditPage.tsx`, ajouter le gestionnaire juste après `handleCancel` :

```tsx
  /**
   * Ouvrir un titre quitte la page : une saisie d'album non enregistrée serait
   * perdue. Même confirmation que « Retour au catalogue », jamais de perte
   * silencieuse.
   */
  const handleEditTrack = (trackId: string) => {
    if (dirty && !window.confirm("Abandonner les modifications non enregistrées ?"))
      return;
    router.push(`/phono/catalogue/titre/${trackId}`);
  };
```

et le passer au formulaire, après `advancingCount` :

```tsx
          onEditTrack={handleEditTrack}
```

- [ ] **Étape 6 : vérifier**

```bash
npx tsc --noEmit
npm run lint
```

En dev, sur un album ayant au moins trois titres : chaque ligne montre la pastille de statut et son libellé ; le crayon ouvre la page du titre ; la croix retire de la tracklist sans supprimer le titre du catalogue ; le drag réordonne ; enregistrer puis rouvrir conserve l'ordre.

Avec une saisie en cours (modifier le titre de l'album sans enregistrer) puis clic sur le crayon : la confirmation apparaît.

---

## Tâche 5 : créer un titre depuis la tracklist

**Fichiers :**
- Modifier : `src/modules/phono/components/albums/TracklistComposer.tsx`
- Modifier : `src/modules/phono/components/albums/AlbumEditForm.tsx`
- Modifier : `src/modules/phono/components/albums/AlbumEditPage.tsx`

- [ ] **Étape 1 : ajouter la prop de création au composer**

Dans `TracklistComposerProps`, après `onEditTrack` :

```tsx
  /**
   * Crée un titre dans le catalogue général et l'ajoute en fin de tracklist.
   * Reçoit le libellé saisi, non nettoyé.
   */
  onCreateTrack: (title: string) => void;
```

L'ajouter à la déstructuration des props, après `onEditTrack,` :

```tsx
  onCreateTrack,
```

- [ ] **Étape 2 : ajouter la ligne de création dans la zone catalogue**

Dans le rendu, juste après le bloc `<div className="relative">` qui contient le champ de recherche (donc après son `</div>` fermant) et **avant** le `{notInList.length === 0 ? (`, insérer :

```tsx
        {query.trim() !== "" && (
          <button
            type="button"
            onClick={() => {
              onCreateTrack(query);
              setQuery("");
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg border border-dashed border-[rgba(240,255,0,0.35)] px-2.5 py-2 text-left transition-colors hover:bg-[rgba(240,255,0,0.06)]",
              focusRing
            )}
          >
            <Plus className="h-4 w-4 shrink-0 text-[#F0FF00]" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-sm text-[#F5F5F5]">
              Créer le titre « {query.trim()} »
            </span>
            <span className="shrink-0 text-[11px] text-[#F5F5F5]/45">
              ajouté au catalogue
            </span>
          </button>
        )}
```

Ajouter l'import manquant en tête de fichier, après l'import de `Input` :

```tsx
import { cn, focusRing } from "@/lib/utils";
```

- [ ] **Étape 3 : faire descendre la prop depuis le formulaire**

Dans `AlbumEditForm.tsx`, ajouter au contrat, après `onEditTrack` :

```tsx
  /** Crée un titre dans le catalogue et l'ajoute à la tracklist. */
  onCreateTrack: (title: string) => void;
```

L'ajouter à la déstructuration après `onEditTrack,` :

```tsx
  onCreateTrack,
```

Et au composer :

```tsx
          <TracklistComposer
            trackIds={form.trackIds}
            allTracks={allTracks}
            onChange={(trackIds) => patch({ trackIds })}
            onEditTrack={onEditTrack}
            onCreateTrack={onCreateTrack}
          />
```

- [ ] **Étape 4 : implémenter la création dans `AlbumEditPage.tsx`**

Compléter l'import de types :

```tsx
import type {
  Album,
  AlbumGuest,
  AlbumType,
  ReleaseStatus,
  Track,
} from "@/lib/sidekick-store";
```

Compléter l'import depuis `lib/track` :

```tsx
import {
  defaultVersion,
  newTrackId,
  normalizeTrack,
  suggestedVersionLabel,
} from "@/modules/phono/lib/track";
```

Ajouter le gestionnaire après `handleEditTrack` :

```tsx
  /**
   * Crée un titre depuis la tracklist.
   *
   * Le titre rejoint le catalogue général immédiatement, avant l'enregistrement
   * de l'album : c'est déjà ce que fait la page titre dans l'autre sens, où
   * choisir « Nouvel album ou EP » crée l'album sur-le-champ. Abandonner
   * l'album ne défait donc pas les titres créés ici — ils restent dans le
   * catalogue, simplement rattachés à rien.
   *
   * `defaultVersion()` est appelé ici, à chaque création : hissé en constante,
   * il figerait une `versionId` partagée par tous les titres créés sans
   * rechargement de page, et le lecteur les confondrait.
   */
  const handleCreateTrack = (title: string) => {
    const clean = title.trim();
    if (clean === "") return;
    const track: Track = {
      id: newTrackId(),
      title: clean,
      // Un titre créé depuis l'album hérite de ce que l'album sait déjà : son
      // artiste et son statut. Le reste se remplit sur la page du titre.
      mainArtist: form.artist.trim(),
      role: "artiste_principal",
      status: form.status,
      guestArtists: [],
      isrc: "",
      releaseDate: "",
      selfProduced: true,
      label: "",
      editor: "",
      genre: "",
      distribution: "",
      notes: "",
      versions: [defaultVersion(suggestedVersionLabel(form.status))],
    };
    setTracks((prev) => [track, ...prev]);
    setForm((prev) => ({ ...prev, trackIds: [...prev.trackIds, track.id] }));
  };
```

Le passer au formulaire, après `onEditTrack` :

```tsx
          onCreateTrack={handleCreateTrack}
```

- [ ] **Étape 5 : vérifier**

```bash
npx tsc --noEmit
npm run lint
```

En dev, sur la page de création d'un album : renseigner titre et artiste, statut « Mixé ». Dans la recherche de la tracklist, taper « Intro ». Attendu — la ligne « Créer le titre « Intro » » apparaît ; au clic, « Intro » entre en fin de tracklist avec la pastille « Mixé », la recherche se vide, et on peut enchaîner avec « Interlude » sans quitter la page.

Enregistrer, puis ouvrir l'onglet Titres : les deux titres y sont, avec le bon artiste et le bon statut. Ouvrir « Intro » : son champ « Album ou EP » pointe sur l'album créé, et sa section Versions contient une version « Pré-mix » (la version suggérée pour un titre mixé).

---

## Tâche 6 : recette de bout en bout

**Fichiers :** aucun. Cette tâche ne modifie rien, elle constate.

- [ ] **Étape 1 : vérification statique**

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Attendu : les trois passent. `npm run build` compte, les routes sont nouvelles.

- [ ] **Étape 2 : les sept parcours de la spec**

En dev, connecté au compte de démo. Cocher chaque ligne :

1. Créer un album, y créer deux titres inline, enregistrer → les deux titres apparaissent dans l'onglet Titres, rattachés à l'album.
2. Ouvrir un titre créé inline depuis son crayon, le modifier, revenir sur l'album → la tracklist montre la modification.
3. Ajouter à un album un titre déjà rattaché à un autre album → il rejoint le nouvel album **et reste** dans l'ancien.
4. Passer un album de « En production » à « Publié » → l'annonce affiche le bon compte, et après enregistrement les titres concernés ont avancé, sans qu'un titre déjà « Publié » ne recule.
5. Réordonner la tracklist au drag, enregistrer, rouvrir → l'ordre tient.
6. Quitter avec une saisie en cours → confirmation ; refuser → on reste sur la page, saisie intacte.
7. Ouvrir `/phono/catalogue/album/nawak` → `PageError` « Cet album n'existe plus ».

- [ ] **Étape 3 : non-régressions autour**

- Le menu `⋯` d'une carte album : « Exporter les métadonnées » ouvre toujours `MetadataExportDialog` avec la bonne cible, « Supprimer » supprime après confirmation et laisse les titres dans le catalogue.
- Le tri (`CatalogSortMenu`, onglet Albums) fonctionne toujours, et la file du lecteur suit l'ordre affiché.
- L'onglet Titres et l'onglet Mixes sont intacts.
- Depuis la page titre, « Nouvel album ou EP » dans le champ « Album ou EP » crée toujours l'album à la volée.

- [ ] **Étape 4 : capture**

Prendre une capture de la page d'édition d'album remplie (motif `scripts/shots.mjs`, Playwright déjà installé) et la montrer, plutôt que de faire vérifier l'écran à la main.

- [ ] **Étape 5 : mettre à jour `ALPHA.md`**

Ajouter la ligne du chantier dans la section Avancement, comme le veut la consigne de fin de journée. Ne pas commiter : attendre une demande explicite.
