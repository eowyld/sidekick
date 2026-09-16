# Page d'édition d'un titre (Phono) — plan d'implémentation

> **Pour les agents :** SOUS-COMPÉTENCE REQUISE — utiliser
> `superpowers:subagent-driven-development` (recommandé) ou
> `superpowers:executing-plans` pour dérouler ce plan tâche par tâche. Les
> étapes utilisent des cases à cocher (`- [ ]`).

**But :** remplacer `TrackDialog` par une page dédiée, deux colonnes, qui absorbe
l'étape audio et propose le nom de version correspondant au statut du titre.

**Architecture :** deux routes (`/nouveau`, `/[trackId]`) montent un même
composant `TrackEditPage`, qui tient tout le formulaire dans un état local et
n'écrit en base qu'à l'enregistrement, via `setTracks` de `usePhonoData`.
`VersionList` / `VersionRow` sont réutilisés tels quels, branchés sur l'état du
formulaire au lieu des données serveur.

**Stack :** Next.js 16 (App Router), React 19, Tailwind, Radix, SWR, Supabase.
Spec : [`docs/superpowers/specs/2026-09-14-page-edition-titre-phono-design.md`](../specs/2026-09-14-page-edition-titre-phono-design.md).

---

## Deux règles du dépôt qui modifient ce plan

Elles priment sur les habitudes de la compétence `writing-plans` :

1. **Aucune suite de tests n'est configurée** (`CLAUDE.md`). Ne pas installer
   Jest ni Vitest pour l'occasion. La vérification de chaque tâche est :
   `npx tsc --noEmit`, `npm run lint`, puis une manipulation en dev local
   (`npm run dev`) décrite pas à pas dans la tâche. Chaque tâche se termine par
   une vérification qui a un résultat observable, pas par « ça devrait marcher ».
2. **Pas de `git add` ni de commit intermédiaire.** Le `CLAUDE.md` réserve le
   commit à une demande explicite de l'artiste. Les tâches se terminent donc par
   une vérification en dev, jamais par un commit.

---

## Structure des fichiers

| Fichier | Responsabilité | Action |
|---|---|---|
| `src/modules/phono/lib/track.ts` | `suggestedVersionLabel`, `isSuggestedVersion` | modifier |
| `app/(app)/phono/catalogue/titre/nouveau/page.tsx` | route de création | créer |
| `app/(app)/phono/catalogue/titre/[trackId]/page.tsx` | route d'édition | créer |
| `src/modules/phono/components/tracks/TrackEditPage.tsx` | page : état du formulaire, chargement, enregistrement, navigation | créer |
| `src/modules/phono/components/tracks/TrackEditForm.tsx` | colonne gauche : les quatre blocs | créer |
| `src/modules/phono/components/tracks/TrackEditAside.tsx` | colonne droite : pochette, « Il manque », enregistrement | créer |
| `src/modules/phono/components/tracks/TrackSection.tsx` | bloc titré, repliable, ouvert d'office si rempli | créer |
| `src/modules/phono/components/tracks/TracksTab.tsx` | retrait du dialogue et de l'écriture morte | modifier |
| `src/modules/phono/components/tracks/TracksToolbar.tsx` | inchangé (`onCreate` reste une prop) | — |
| `src/modules/phono/components/tracks/TrackDialog.tsx` | remplacé | supprimer |

Le découpage suit la raison d'être : `TrackEditPage` tient l'état et les effets
de bord, `TrackEditForm` et `TrackEditAside` ne font que rendre et remonter des
changements. `TrackDialog` faisait les trois à la fois sur 387 lignes.

---

## Tâche 1 : le statut propose le nom de la version

**Fichiers :**
- Modifier : `src/modules/phono/lib/track.ts`

- [ ] **Étape 1 : ajouter la table et les deux fonctions**

À la suite de `defaultVersion` (ligne 65), ajouter :

```ts
/**
 * Nom de version attendu à chaque étape du pipeline.
 *
 * Demander « Original » sur un titre en production n'a pas de sens : le master
 * n'existe pas encore, et l'artiste se retrouve à renommer une version qu'il
 * n'a pas choisie. « Original » reste le nom du titre publié — c'est la version
 * que les plateformes connaissent.
 */
const SUGGESTED_VERSION_LABEL: Record<ReleaseStatus, string> = {
  en_production: "Maquette",
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
 * suivent le statut en silence — une version qui porte un fichier a été
 * déposée sous ce nom, et les liens d'écoute publiés l'ont dénormalisé.
 */
export function isSuggestedVersion(version: TrackVersion): boolean {
  return (
    !version.audioPath &&
    (version.isrc ?? "").trim() === "" &&
    SUGGESTED_LABELS.has(version.label.trim())
  );
}
```

Vérifier que `ReleaseStatus` et `TrackVersion` sont déjà importés en tête du
fichier ; sinon les ajouter à l'import depuis `@/lib/sidekick-store`.

- [ ] **Étape 2 : vérifier la compilation**

```bash
npx tsc --noEmit
```
Attendu : aucune sortie.

---

## Tâche 2 : les deux routes et la coquille de la page

**Fichiers :**
- Créer : `app/(app)/phono/catalogue/titre/nouveau/page.tsx`
- Créer : `app/(app)/phono/catalogue/titre/[trackId]/page.tsx`
- Créer : `src/modules/phono/components/tracks/TrackEditPage.tsx`

- [ ] **Étape 1 : la route de création**

```tsx
import { TrackEditPage } from "@/modules/phono/components/tracks/TrackEditPage";

export default function NouveauTitrePage() {
  return <TrackEditPage trackId={null} />;
}
```

- [ ] **Étape 2 : la route d'édition**

```tsx
import { TrackEditPage } from "@/modules/phono/components/tracks/TrackEditPage";

export default async function EditerTitrePage({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  const { trackId } = await params;
  return <TrackEditPage trackId={trackId} />;
}
```

`params` est une promesse en Next 16 — d'où le composant asynchrone.

- [ ] **Étape 3 : la coquille de la page**

Créer `TrackEditPage.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { usePhonoData } from "@/hooks/usePhonoData";
import { PageError } from "@/components/ui/page-error";
import { PageLoader } from "@/components/ui/page-loader";
import { normalizeTrack } from "@/modules/phono/lib/track";
import { cn, focusRing } from "@/lib/utils";

interface TrackEditPageProps {
  /** `null` = création. */
  trackId: string | null;
}

export function TrackEditPage({ trackId }: TrackEditPageProps) {
  const router = useRouter();
  const { tracks, loading, error } = usePhonoData();

  if (loading) return <PageLoader />;
  if (error)
    return (
      <PageError
        title="Impossible de charger ce titre"
        description="Vérifie ta connexion ou réessaie dans quelques instants."
        onRetry={() => router.refresh()}
      />
    );

  const existing = trackId ? tracks.find((t) => t.id === trackId) : undefined;

  if (trackId && !existing)
    return (
      <PageError
        title="Ce titre n'existe plus"
        description="Il a peut-être été supprimé depuis un autre onglet."
        onRetry={() => router.push("/phono/catalogue")}
      />
    );

  const track = existing ? normalizeTrack(existing) : null;

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push("/phono/catalogue")}
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
        {track ? track.title || "Titre sans nom" : "Nouveau titre"}
      </h1>
    </div>
  );
}
```

- [ ] **Étape 4 : vérifier en dev**

```bash
npm run dev
```
Ouvrir `http://localhost:3000/phono/catalogue/titre/nouveau` : le fil d'Ariane
« Phono · Catalogue » et le titre « Nouveau titre » s'affichent, le retour
ramène au catalogue. Ouvrir `/phono/catalogue/titre/inconnu` : l'écran « Ce
titre n'existe plus » s'affiche avec son bouton de retour.

---

## Tâche 3 : l'état du formulaire et le bloc « L'essentiel »

**Fichiers :**
- Modifier : `src/modules/phono/components/tracks/TrackEditPage.tsx`
- Créer : `src/modules/phono/components/tracks/TrackEditForm.tsx`

- [ ] **Étape 1 : reprendre l'état du formulaire de `TrackDialog`**

Copier depuis `TrackDialog.tsx` dans `TrackEditPage.tsx`, sans modification, les
déclarations `TrackFormState` (l. 58-72), `EMPTY_FORM` (l. 74-89) et
`formFromTrack` (l. 91-107). Ajouter à `TrackFormState` un champ que le dialogue
n'avait pas, puisqu'il ne gérait pas les versions :

```ts
  versions: TrackVersion[];
```

Dans `EMPTY_FORM`, l'initialiser avec la version suggérée par le statut par
défaut :

```ts
  versions: [defaultVersion(suggestedVersionLabel("en_production"))],
```

Dans `formFromTrack`, ajouter :

```ts
    versions: track.versions ?? [],
```

- [ ] **Étape 2 : brancher l'état dans la page**

Dans `TrackEditPage`, sous les gardes de chargement, remplacer le rendu par un
état de formulaire et l'appel au formulaire. `useState` doit être appelé avant
tout `return` conditionnel : initialiser depuis `trackId` et resynchroniser avec
le même motif d'ajustement en cours de rendu que `TrackDialog` utilisait.

```tsx
const [form, setForm] = useState<TrackFormState>(EMPTY_FORM);
const [loadedId, setLoadedId] = useState<string | null>(null);

// Le titre arrive après le premier rendu (SWR) : on remplit le formulaire dès
// qu'il est là, une seule fois, sans écraser une saisie en cours.
const readyId = track ? track.id : trackId === null ? "__new__" : null;
if (readyId !== null && loadedId !== readyId) {
  setLoadedId(readyId);
  setForm(track ? formFromTrack(track) : EMPTY_FORM);
}

const patch = (values: Partial<TrackFormState>) =>
  setForm((prev) => ({ ...prev, ...values }));
```

Ces trois blocs se placent avant les `return` conditionnels ; les `const track`
et `const existing` doivent donc remonter au-dessus d'eux, sans les gardes. Pour
que `loading` puisse rester une garde, calculer :

```tsx
const existing = trackId ? tracks.find((t) => t.id === trackId) : undefined;
const track = existing ? normalizeTrack(existing) : null;
```

juste après `usePhonoData()`.

- [ ] **Étape 3 : le bloc « L'essentiel »**

Créer `TrackEditForm.tsx`. Les quatre champs viennent de `TrackDialog` l. 189-247,
à l'identique ; ce qui change est l'enveloppe : un titre de bloc visible et une
ligne qui dit à quoi il sert.

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PhonoRole, ReleaseStatus } from "@/lib/sidekick-store";
import { ROLES } from "@/modules/phono/lib/track";
import { RELEASE_STATUSES } from "@/modules/phono/lib/release-status";
import type { TrackFormState } from "./TrackEditPage";

interface TrackEditFormProps {
  form: TrackFormState;
  patch: (values: Partial<TrackFormState>) => void;
}

export function TrackEditForm({ form, patch }: TrackEditFormProps) {
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
            <Label htmlFor="track-title">Titre *</Label>
            <Input
              id="track-title"
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Titre du morceau"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="track-main-artist">Artiste principal *</Label>
            <Input
              id="track-main-artist"
              value={form.mainArtist}
              onChange={(e) => patch({ mainArtist: e.target.value })}
              placeholder="Nom de l'artiste"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="track-role">Rôle</Label>
            <Select
              value={form.role}
              onValueChange={(v) => patch({ role: v as PhonoRole })}
            >
              <SelectTrigger id="track-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="track-status">Statut</Label>
            <Select
              value={form.status}
              onValueChange={(v) => patch({ status: v as ReleaseStatus })}
            >
              <SelectTrigger id="track-status">
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
          </div>
        </div>
      </section>
    </div>
  );
}
```

Exporter `TrackFormState` depuis `TrackEditPage.tsx` (`export interface
TrackFormState`) pour que le formulaire puisse l'importer.

- [ ] **Étape 4 : monter le formulaire dans la page**

Dans `TrackEditPage`, sous le `<h1>` :

```tsx
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <TrackEditForm form={form} patch={patch} />
        <div />
      </div>
```

Le `<div />` tient la place de la colonne droite, ajoutée à la tâche 5.

- [ ] **Étape 5 : vérifier en dev**

Sur `/phono/catalogue/titre/nouveau`, les quatre champs s'affichent dans un bloc
titré « L'essentiel » et se saisissent. Sur `/phono/catalogue/titre/<id>` d'un
titre existant (prendre un identifiant depuis le catalogue), les champs
arrivent pré-remplis.

```bash
npx tsc --noEmit && npm run lint
```
Attendu : aucune erreur nouvelle (`usePhonoData.ts` en porte déjà quatre,
antérieures à ce chantier).

---

## Tâche 4 : les blocs repliables Publication et Crédits

**Fichiers :**
- Créer : `src/modules/phono/components/tracks/TrackSection.tsx`
- Modifier : `src/modules/phono/components/tracks/TrackEditForm.tsx`

- [ ] **Étape 1 : le bloc repliable**

```tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn, focusRing } from "@/lib/utils";

interface TrackSectionProps {
  title: string;
  /** Une ligne qui dit à quoi sert le bloc. C'est elle qui manquait. */
  description: string;
  /**
   * Ouvre le bloc au montage. On ne replie jamais une donnée déjà saisie :
   * l'artiste la chercherait sans savoir qu'elle est là.
   */
  defaultOpen: boolean;
  children: React.ReactNode;
}

export function TrackSection({
  title,
  description,
  defaultOpen,
  children,
}: TrackSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-start justify-between gap-4 rounded-xl p-5 text-left transition-colors hover:bg-[rgba(245,245,245,0.03)]",
          focusRing
        )}
      >
        <span>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F0FF00]">
            {title}
          </span>
          <span className="mt-1 block text-xs text-[#F5F5F5]/55">
            {description}
          </span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn(
            "mt-0.5 shrink-0 text-[#F5F5F5]/45 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="space-y-4 px-5 pb-5">{children}</div>}
    </section>
  );
}
```

- [ ] **Étape 2 : le bloc Publication**

Dans `TrackEditForm`, après le bloc « L'essentiel ». Le contenu est repris de
`TrackDialog` l. 256-348 sans modification : `DatePicker`, ISRC, genre,
distribution, case « Auto-produit », label conditionnel, éditeur. Les imports
correspondants (`DatePicker`, `Textarea`, `Checkbox`, les aides de
`@/lib/date-format`) viennent du dialogue.

L'enveloppe et le calcul d'ouverture :

```tsx
const publicationFilled =
  form.releaseDate.trim() !== "" ||
  form.isrc.trim() !== "" ||
  form.genre.trim() !== "" ||
  form.distribution.trim() !== "" ||
  form.label.trim() !== "" ||
  form.editor.trim() !== "";
```

```tsx
<TrackSection
  title="Publication"
  description="L'ISRC identifie ton enregistrement chez les plateformes et les sociétés de gestion. Rien de tout ça n'existe avant la sortie — laisse vide tant que tu ne sais pas."
  defaultOpen={publicationFilled}
>
  {/* champs repris de TrackDialog l. 256-348 */}
</TrackSection>
```

- [ ] **Étape 3 : le bloc Crédits & notes**

Même motif, contenu repris de `TrackDialog` l. 352-368 (`TrackCreditsField` et
le `Textarea` de notes) :

```tsx
const creditsFilled =
  form.guestArtists.some((g) => g.name.trim() !== "") ||
  form.notes.trim() !== "";
```

```tsx
<TrackSection
  title="Crédits & notes"
  description="Featurings, producteurs, musiciens — tout ce qui devra apparaître sur les métadonnées et les déclarations."
  defaultOpen={creditsFilled}
>
  {/* TrackCreditsField + Textarea notes, repris de TrackDialog */}
</TrackSection>
```

- [ ] **Étape 4 : vérifier en dev**

Sur un titre neuf, les deux blocs sont repliés et s'ouvrent au clic. Sur un titre
existant qui a un ISRC ou des invités, le bloc correspondant est déjà ouvert à
l'arrivée. Le clavier atteint l'en-tête de bloc et l'anneau de focus jaune est
visible.

---

## Tâche 5 : la colonne droite — pochette, « Il manque », enregistrement

**Fichiers :**
- Créer : `src/modules/phono/components/tracks/TrackEditAside.tsx`
- Modifier : `src/modules/phono/components/tracks/TrackEditPage.tsx`

- [ ] **Étape 1 : le panneau**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { TrackCoverField } from "./TrackCoverField";
import type { TrackFormState } from "./TrackEditPage";

interface TrackEditAsideProps {
  form: TrackFormState;
  patch: (values: Partial<TrackFormState>) => void;
  canSubmit: boolean;
  saving: boolean;
  dirty: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

/** Un manque = une chose que l'artiste devra faire, formulée comme telle. */
function missingItems(form: TrackFormState): string[] {
  const missing: string[] = [];
  if (!form.versions.some((v) => v.audioPath)) missing.push("Aucun fichier audio");
  if (form.isrc.trim() === "") missing.push("Pas d'ISRC");
  if (form.releaseDate.trim() === "") missing.push("Pas de date de sortie");
  return missing;
}

export function TrackEditAside({
  form,
  patch,
  canSubmit,
  saving,
  dirty,
  onSubmit,
  onCancel,
}: TrackEditAsideProps) {
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
            Fichier, ISRC et date de sortie sont renseignés.
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

- [ ] **Étape 2 : le brancher**

Dans `TrackEditPage`, remplacer le `<div />` de la tâche 3 par
`<TrackEditAside … />`. Les valeurs à passer :

```tsx
const displayedDate = toDisplayDate(form.releaseDate);
const dateInvalid = displayedDate !== "" && !isValidDateFr(displayedDate);
const canSubmit =
  form.title.trim() !== "" && form.mainArtist.trim() !== "" && !dateInvalid;
const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);
```

où `initialForm` est mémorisé au chargement, à côté de `loadedId` :

```tsx
const [initialForm, setInitialForm] = useState<TrackFormState>(EMPTY_FORM);
```

et rempli dans le même bloc de synchronisation que `setForm`.

`saving` est un `useState<boolean>(false)` ; `onSubmit` et `onCancel` sont
posés à la tâche 7 — pour cette tâche, `onSubmit={() => {}}` et
`onCancel={() => router.push("/phono/catalogue")}`.

- [ ] **Étape 3 : vérifier en dev**

La colonne droite apparaît à partir de 1024 px de large et reste collée au
défilement ; en dessous, elle passe sous le formulaire. Le panneau liste bien
trois manques sur un titre neuf. « Enregistrer » est désactivé tant que le titre
ou l'artiste est vide.

---

## Tâche 6 : le bloc Versions & audio

**Fichiers :**
- Modifier : `src/modules/phono/components/tracks/TrackEditForm.tsx`
- Modifier : `src/modules/phono/components/tracks/TrackEditPage.tsx`

`VersionList` attend un `Track` complet et quatre rappels. Le formulaire n'a pas
de `Track` en base tant qu'il n'est pas enregistré : on lui en fabrique un à la
volée depuis l'état, ce qui suffit — `VersionList` et `VersionRow` ne lisent que
`track.versions`, `track.isrc` et `track.title`.

- [ ] **Étape 1 : les rappels de version, dans `TrackEditPage`**

```tsx
const patchVersion = (versionId: string, versionPatch: Partial<TrackVersion>) =>
  setForm((prev) => ({
    ...prev,
    versions: prev.versions.map((v) =>
      v.id === versionId ? { ...v, ...versionPatch } : v
    ),
  }));

const addVersion = () =>
  setForm((prev) => {
    const taken = new Set(prev.versions.map((v) => v.label.toLowerCase()));
    // La suggestion du statut d'abord ; si elle est déjà prise, on numérote,
    // comme le fait déjà le catalogue.
    const suggested = suggestedVersionLabel(prev.status);
    if (!taken.has(suggested.toLowerCase())) {
      return { ...prev, versions: [...prev.versions, defaultVersion(suggested)] };
    }
    let n = 2;
    while (taken.has(`version ${n}`)) n += 1;
    return {
      ...prev,
      versions: [...prev.versions, defaultVersion(`Version ${n}`)],
    };
  });

const removeVersion = (versionId: string) =>
  setForm((prev) => ({
    ...prev,
    versions: prev.versions.filter((v) => v.id !== versionId),
  }));
```

- [ ] **Étape 2 : le titre de travail passé à `VersionList`**

Toujours dans `TrackEditPage` :

```tsx
// `VersionList` attend un Track : on lui donne l'état du formulaire, pas la
// donnée serveur. C'est ce qui permet de déposer un fichier avant même le
// premier enregistrement.
const draftTrack: Track = {
  ...(track ?? { id: "__draft__", versions: [] }),
  ...form,
  guestArtists: form.guestArtists,
} as Track;
```

- [ ] **Étape 3 : le bloc dans `TrackEditForm`**

Ajouter les props `draftTrack`, `onPatchVersion`, `onAddVersion`,
`onRemoveVersion` à `TrackEditFormProps`, puis, entre « L'essentiel » et
« Publication » :

```tsx
<section className="rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5">
  <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#F0FF00]">
    Versions & audio
  </h2>
  <p className="mt-1 text-xs text-[#F5F5F5]/55">
    {versionsHint(form.status)}
  </p>
  <div className="mt-4">
    <VersionList
      track={draftTrack}
      onPatchVersion={onPatchVersion}
      onAddVersion={onAddVersion}
      onRemoveVersion={onRemoveVersion}
      // L'export de métadonnées vit dans le catalogue, pas ici : il travaille
      // sur un titre enregistré.
      onExportMetadata={() => {}}
    />
  </div>
</section>
```

avec, en haut du fichier :

```ts
/** Dit pourquoi cette version-là est attendue à cette étape. */
function versionsHint(status: ReleaseStatus): string {
  switch (status) {
    case "en_production":
      return "Un titre en production n'a pas encore de master : on part de la maquette.";
    case "mixe":
      return "Le mix est fait, le master non : la version attendue est le pré-mix.";
    case "masterise":
      return "Le master est prêt — c'est lui qui partira en distribution.";
    case "publie":
      return "La version originale est celle que connaissent les plateformes.";
  }
}
```

- [ ] **Étape 4 : vérifier en dev**

Sur `/phono/catalogue/titre/nouveau` : une version « Maquette » est proposée,
`+ Ajouter une version` en ajoute une seconde, la corbeille la retire. Déposer un
fichier audio sur la maquette : la forme d'onde apparaît, la durée s'affiche. La
phrase sous le titre du bloc change quand on passe le statut de « En
production » à « Mixé ».

---

## Tâche 7 : le statut fait suivre la version, sans jamais renommer

**Fichiers :**
- Modifier : `src/modules/phono/components/tracks/TrackEditPage.tsx`
- Modifier : `src/modules/phono/components/tracks/TrackEditForm.tsx`

- [ ] **Étape 1 : intercepter le changement de statut**

Dans `TrackEditPage`, remplacer le `patch` générique pour le statut par un
gestionnaire dédié, passé au formulaire sous le nom `onStatusChange` :

```tsx
const onStatusChange = (status: ReleaseStatus) =>
  setForm((prev) => ({
    ...prev,
    status,
    // Une version encore vierge suit le statut en silence : rien à réécrire,
    // personne ne l'a vue. Toute autre version est figée — elle porte un
    // fichier ou un nom choisi, et les liens d'écoute publiés ont dénormalisé
    // ce nom.
    versions: prev.versions.map((v) =>
      isSuggestedVersion(v) ? { ...v, label: suggestedVersionLabel(status) } : v
    ),
  }));
```

Dans `TrackEditForm`, le `Select` de statut appelle `onStatusChange(v as
ReleaseStatus)` au lieu de `patch({ status: … })`.

- [ ] **Étape 2 : proposer l'ajout quand rien n'a suivi**

Toujours dans `TrackEditForm`, sous la liste des versions :

```tsx
const suggested = suggestedVersionLabel(form.status);
const hasSuggested = form.versions.some(
  (v) => v.label.trim().toLowerCase() === suggested.toLowerCase()
);
```

```tsx
{!hasSuggested && (
  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[rgba(56,189,248,0.35)] bg-[rgba(56,189,248,0.08)] px-3 py-2">
    <p className="text-xs text-[#F5F5F5]/80">
      Ce titre est <strong>{releaseStatusLabel(form.status)}</strong> et n&apos;a
      pas de version « {suggested} ».
    </p>
    <Button type="button" size="xs" onClick={onAddVersion}>
      Ajouter
    </Button>
  </div>
)}
```

`releaseStatusLabel` s'importe depuis `@/modules/phono/lib/release-status`.
`onAddVersion` ajoute déjà la version suggérée en priorité (tâche 6, étape 1),
les deux se répondent.

- [ ] **Étape 3 : vérifier en dev**

Titre neuf, statut « En production » : la version s'appelle « Maquette ». Passer
en « Mixé » : elle devient « Pré-mix » sans rien demander. Déposer un fichier
dessus, puis passer en « Mastérisé » : le nom **ne bouge pas**, et la bande bleue
propose d'ajouter une version « Master ». Cliquer « Ajouter » : la version
apparaît, la bande disparaît. Renommer une version vierge en « Take 1 » puis
changer le statut : le nom ne bouge pas non plus.

---

## Tâche 8 : enregistrer, rester sur la page, rattacher le projet

**Fichiers :**
- Modifier : `src/modules/phono/components/tracks/TrackEditPage.tsx`

- [ ] **Étape 1 : l'enregistrement**

```tsx
const posthog = usePostHog();
const searchParams = useSearchParams();
const projectIdParam = searchParams.get("projectId");
const { projects, patchProjectLinks } = useProjectsData();

const handleSubmit = () => {
  if (!canSubmit || saving) return;
  setSaving(true);

  const fields = {
    title: form.title.trim(),
    mainArtist: form.mainArtist.trim(),
    role: form.role,
    status: form.status,
    cover: form.cover,
    releaseDate: form.releaseDate,
    isrc: form.isrc,
    genre: form.genre,
    distribution: form.distribution,
    selfProduced: form.selfProduced,
    // Conservé même en auto-produit : `buildMetadataPayload` ignore déjà le
    // label dans ce cas, l'effacer ferait perdre la saisie au décochage.
    label: form.label,
    editor: form.editor,
    guestArtists: form.guestArtists.filter((g) => g.name.trim() !== ""),
    notes: form.notes,
    versions: form.versions,
  };

  const next: Track = track
    ? { ...track, ...fields }
    : { id: newTrackId(), ...fields };

  setTracks((prev) =>
    track ? prev.map((t) => (t.id === next.id ? next : t)) : [next, ...prev]
  );

  setInitialForm(form);

  if (!track) {
    posthog?.capture("item_created", { module: "phono" });
    if (projectIdParam) {
      // L'ancien dialogue écrivait ce rattachement dans `useSidekickData`,
      // c'est-à-dire dans le vide (TracksTab.tsx:193). Ici il atteint la base.
      const project = projects.find((p) => p.id === projectIdParam);
      if (project) {
        patchProjectLinks(projectIdParam, {
          linkedTracks: [...new Set([...project.linkedTracks, next.id])],
        });
      }
    }
    // On reste sur la page : l'artiste enchaîne sur l'audio sans repasser par
    // la liste. C'est la fin du parcours en deux temps.
    router.replace(`/phono/catalogue/titre/${next.id}`);
  }

  setSaving(false);
};
```

`setTracks` vient de `usePhonoData()` — l'ajouter à la déstructuration en tête
de composant. `newTrackId` s'importe depuis `@/modules/phono/lib/track`,
`usePostHog` depuis `posthog-js/react`, `useSearchParams` depuis
`next/navigation`, `useProjectsData` depuis `@/hooks/useProjectsData`.

- [ ] **Étape 2 : la garde de sortie**

```tsx
// Quitter avec une saisie non enregistrée, c'est perdre le travail : le
// fichier audio déjà déposé, lui, sera ramassé par `pruneOrphanAudio`.
useEffect(() => {
  if (!dirty) return;
  const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
  window.addEventListener("beforeunload", onBeforeUnload);
  return () => window.removeEventListener("beforeunload", onBeforeUnload);
}, [dirty]);

const handleCancel = () => {
  if (dirty && !window.confirm("Abandonner les modifications non enregistrées ?"))
    return;
  router.push("/phono/catalogue");
};
```

Brancher `handleSubmit` et `handleCancel` sur `TrackEditAside`.

- [ ] **Étape 3 : vérifier en dev**

Créer un titre depuis `/phono/catalogue/titre/nouveau` : après « Enregistrer »,
l'URL devient `/phono/catalogue/titre/<id>`, la page reste affichée, le bouton
repasse en « Retour au catalogue ». Revenir au catalogue : le titre est dans la
liste. Le recharger (F5) : les champs et la version sont bien en base.

Modifier un champ puis cliquer « Annuler les modifications » : la confirmation
s'affiche. Modifier un champ puis recharger l'onglet : le navigateur prévient.

Pour le rattachement projet : ouvrir
`/phono/catalogue/titre/nouveau?projectId=<id d'un projet existant>`,
enregistrer, puis ouvrir le projet — le titre y figure. C'est le bug
`TracksTab.tsx:193` de `ALPHA.md` qui tombe.

---

## Tâche 9 : basculer les points d'entrée et supprimer le dialogue

**Fichiers :**
- Modifier : `src/modules/phono/components/tracks/TracksTab.tsx`
- Supprimer : `src/modules/phono/components/tracks/TrackDialog.tsx`

- [ ] **Étape 1 : rediriger la création et l'édition**

Dans `TracksTab`, remplacer `openCreate` :

```tsx
const router = useRouter();

const openCreate = () => {
  const suffix = projectIdParam ? `?projectId=${projectIdParam}` : "";
  router.push(`/phono/catalogue/titre/nouveau${suffix}`);
};
```

et le `onEdit` de `TrackRow` :

```tsx
onEdit={() => router.push(`/phono/catalogue/titre/${track.id}`)}
```

`useRouter` s'importe depuis `next/navigation`.

- [ ] **Étape 2 : retirer ce qui n'a plus d'objet**

Supprimer de `TracksTab` : l'import de `TrackDialog` et son rendu, les états
`dialogOpen` et `editingTrack`, la fonction `handleSubmit` en entier (l. 184-207,
avec l'écriture morte `setData`), l'import et l'appel de `useSidekickData`, les
imports devenus inutiles (`usePostHog` si plus utilisé ailleurs dans le fichier,
`defaultVersion` s'il n'est plus appelé).

Ne pas toucher à `patchVersion`, `addVersion`, `removeVersion` : la ligne
dépliable les utilise toujours.

- [ ] **Étape 3 : supprimer le dialogue**

```bash
rm src/modules/phono/components/tracks/TrackDialog.tsx
```

- [ ] **Étape 4 : vérifier qu'il ne reste aucune référence**

```bash
grep -rn "TrackDialog\|useSidekickData" src/modules/phono/components/tracks/
```
Attendu : aucune ligne.

```bash
npx tsc --noEmit && npm run lint
```
Attendu : aucune erreur nouvelle.

---

## Tâche 10 : recette

**Fichiers :** aucun — vérification seule, sur `npm run dev`.

- [ ] **Étape 1 : le parcours de création complet**

Catalogue → « Nouveau titre » → saisir titre et artiste → déposer un fichier sur
la version « Maquette » → « Enregistrer ». Attendu : on reste sur la page, l'URL
porte l'identifiant, le panneau « Il manque » ne liste plus le fichier audio.

- [ ] **Étape 2 : le lecteur**

Retour au catalogue, déplier la ligne du titre créé, lancer la lecture. Attendu :
le son part, la barre du bas affiche « Maquette ».

- [ ] **Étape 3 : l'état vide**

Sur un compte sans titre, le bouton « Ajouter un titre » de `EmptyState` mène
bien à la page de création.

- [ ] **Étape 4 : le secteur désactivé**

Réglages → désactiver Phono → ouvrir `/phono/catalogue/titre/nouveau` à la main.
Attendu : redirection vers le tableau de bord (`ModuleGuard` filtre par préfixe).

- [ ] **Étape 5 : les fichiers orphelins**

Déposer un fichier sur une version puis quitter la page **sans** enregistrer.
Attendu : aucune erreur. Le fichier reste une heure dans le bucket (sursis de
`pruneOrphanAudio`), puis disparaît au passage suivant sur le catalogue.

- [ ] **Étape 6 : vérification finale**

```bash
npx tsc --noEmit && npm run lint && npm run build
```
Attendu : build réussi, aucune erreur nouvelle.

---

## Contrôle du plan contre la spec

| Exigence de la spec | Tâche |
|---|---|
| Deux routes sous `/phono/catalogue/titre` | 2 |
| `TrackEditPage` monté par les deux | 2 |
| Identifiant inconnu → `PageError` | 2 |
| Pas de lien de sidebar (route de détail) | — décision documentée, rien à coder |
| Bloc « L'essentiel » | 3 |
| Blocs repliés, ouverts d'office si remplis | 4 |
| Colonne droite collante : pochette, « Il manque », enregistrement | 5 |
| Réutilisation de `VersionList` / `VersionRow` | 6 |
| `suggestedVersionLabel` et sa table | 1 |
| Suivi silencieux d'une version vierge | 7 |
| Jamais de renommage d'une version établie | 7 |
| Proposition d'ajout en ligne | 7 |
| Rien ne se déclenche sur un statut avancé par un album | 7 — aucun code côté `AlbumsTab`, par construction |
| Enregistrement explicite, `router.replace`, on reste sur la page | 8 |
| Audio déposable avant le premier enregistrement | 6 (titre de travail) + 8 (recette) |
| Confirmation à la sortie | 8 |
| Rattachement projet via `useProjectsData` | 8 |
| Suppression de `TrackDialog` et nettoyage de `TracksTab` | 9 |
| `item_created` émis par la page | 8 |
