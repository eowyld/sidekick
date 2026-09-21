# Identité de l'artiste — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Demander à chaque utilisateur s'il sort sa musique sous un nom d'artiste ou en nom propre, et utiliser ce nom partout où le produit parle de lui (lien d'écoute public, pré-remplissage du catalogue, ayant droit par défaut des œuvres).

**Architecture:** Deux colonnes sur `user_preferences` (`identity_mode`, `artist_name`), lues par `usePreferencesData`. Un module pur `src/lib/artist-identity.ts` (résolution du nom civil, valeur par défaut, ayant droit « soi ») et un hook `useArtistIdentity` qui assemble préférences et `user_metadata`. Les écrans consomment ce hook ; la route publique lit la colonne avec la clé service.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS), SWR, TypeScript, Tailwind, PostHog.

**Spec :** `docs/superpowers/specs/2026-09-21-artist-identity-design.md`

---

## Conventions propres à ce dépôt (à lire avant de commencer)

- **Pas de suite de tests.** La boucle de vérification de chaque tâche est :
  `npx tsc --noEmit` (0 erreur), `npm run lint` (aucune nouvelle erreur sur les
  fichiers touchés), puis contrôle en dev (`npm run dev`) avec le compte de
  captures (`SHOT_EMAIL` / `SHOT_PASSWORD` dans `.env.local`, cf.
  `scripts/shots.mjs`). **C'est un compte aux données réelles** : ne rien
  supprimer, annuler toute création de test.
- **Pas de commit, pas de `git add`.** Commit uniquement sur demande explicite
  de l'utilisateur, après vérification en dev (CLAUDE.md). Les étapes « Commit »
  habituelles sont remplacées par « Point d'arrêt ».
- **`cn()` ne fusionne pas les classes** : pour dimensionner un `Input`, mettre
  la classe sur un wrapper.
- **Aucun tiret cadratin (—) dans les textes affichés** (libellés, aides,
  toasts). Les commentaires de code ne sont pas concernés.
- Palette : fond `#101010`, accent `#F0FF00`, bordures `rgba(245,245,245,0.12)`.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20260921000000_artist_identity.sql` (créé) | Colonnes `identity_mode`, `artist_name` ; RPC `create_project_with_links` qui accepte `persons` |
| `src/lib/artist-identity.ts` (créé) | Fonctions pures : `legalNameParts`, `defaultArtist`, `selfPerson` |
| `src/hooks/usePreferencesData.ts` (modifié) | Lecture/écriture des deux colonnes, `setArtistIdentity` |
| `src/hooks/useArtistIdentity.ts` (créé) | Assemble préférences + `user_metadata` ; `AUTH_META_KEY` |
| `app/api/listening/[slug]/route.ts` (modifié) | En-tête du lien d'écoute |
| `src/components/onboarding/IdentityChoice.tsx` (créé) | Choix contrôlé artiste / nom propre + champ |
| `src/components/onboarding/IdentityStep.tsx` (créé) | Étape d'onboarding autonome (état, enregistrement, PostHog) |
| `src/components/onboarding/SectorOnboarding.tsx` (modifié) | 3 étapes ; exporte `OnboardingShell` |
| `src/modules/dashboard/components/DashboardPage.tsx` (modifié) | Étape identité seule pour les comptes existants |
| `src/modules/phono/components/tracks/TrackEditPage.tsx` (modifié) | Pré-remplissage `mainArtist` |
| `src/modules/phono/components/albums/AlbumEditPage.tsx` (modifié) | Pré-remplissage `artist` |
| `src/modules/phono/components/mixes/MixEditPage.tsx` (modifié) | Pré-remplissage `artists` |
| `src/modules/edition/components/WorksPage.tsx` (modifié) | Nom civil + ayant droit « soi » ; libellés |
| `src/modules/projects/components/ProjectCreatePage.tsx` (modifié) | Sorties et œuvres créées depuis un projet |
| `src/modules/settings/components/ArtistIdentityCard.tsx` (créé) | Carte Réglages + remplissage des champs vides |
| `src/modules/settings/components/SettingsPage.tsx` (modifié) | Monte la carte ; resynchronise en mode nom propre |
| `CLAUDE.md`, `ALPHA.md` (modifiés) | Documentation |

---

### Task 1 : Migration

**Files:**
- Create: `supabase/migrations/20260921000000_artist_identity.sql`

- [ ] **Step 1 : Écrire la migration**

```sql
-- Identité de l'artiste : nom d'artiste ou nom propre.
--
-- `identity_mode` NULL = question jamais posée (le tableau de bord la pose).
-- `artist_name` porte toujours le nom affiché une fois la question posée,
-- y compris en nom propre (« Prénom Nom ») : la route publique du lien
-- d'écoute lit cette table avec la clé service et n'a pas accès simplement à
-- `auth.users.user_metadata`.
--
-- Rejouable : `if not exists` partout, la contrainte est posée à part.

alter table public.user_preferences
  add column if not exists identity_mode text,
  add column if not exists artist_name text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_preferences_identity_mode_check'
  ) then
    alter table public.user_preferences
      add constraint user_preferences_identity_mode_check
      check (identity_mode in ('artist', 'legal'));
  end if;
end
$$;

comment on column public.user_preferences.identity_mode is
  'artist = nom d''artiste, legal = nom propre, NULL = pas encore demandé.';
comment on column public.user_preferences.artist_name is
  'Nom affiché de l''utilisateur (lien d''écoute, pré-remplissage du catalogue).';

-- Les œuvres créées depuis un projet reçoivent désormais leurs ayants droit
-- (l'utilisateur lui-même par défaut). Seule différence avec la version du
-- 14/09 : `persons` est lu dans le payload au lieu d'être forcé à '[]'.
create or replace function public.create_project_with_links(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  project_id uuid := coalesce(nullif(payload->>'id', '')::uuid, gen_random_uuid());
  album jsonb;
  work jsonb;
  album_ids jsonb := coalesce(payload->'linkedAlbumIds', '[]'::jsonb);
  work_ids jsonb := coalesce(payload->'linkedWorkIds', '[]'::jsonb);
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if btrim(coalesce(payload->>'title', '')) = '' then raise exception 'title_required'; end if;

  for album in select value from jsonb_array_elements(coalesce(payload->'newAlbums', '[]'::jsonb)) loop
    insert into public.user_phono_albums (
      id, user_id, title, type, status, artist, release_date, upc_ean,
      track_ids, notes, cover, guests
    ) values (
      album->>'id', uid, album->>'title', album->>'type', 'en_production',
      coalesce(album->>'artist', ''), coalesce(album->>'releaseDate', ''), '',
      '{}', '', nullif(album->>'cover', ''), '[]'::jsonb
    );
    album_ids := album_ids || jsonb_build_array(album->>'id');
  end loop;

  for work in select value from jsonb_array_elements(coalesce(payload->'newWorks', '[]'::jsonb)) loop
    insert into public.user_edition_works (
      id, user_id, artist_name, title, status, persons, dep_repartition,
      drm_repartition, splits_authors, splits_composers, self_published,
      external_publishers, iswc, first_exploitation_date, genre, duration,
      files, exploitation_types, first_broadcaster, worldwide_rights,
      territories, notes, linked_track_ids
    ) values (
      work->>'id', uid, coalesce(work->>'artistName', ''), work->>'title',
      'in-progress', coalesce(work->'persons', '[]'::jsonb), '{}'::jsonb, '{}'::jsonb, '[]'::jsonb,
      '[]'::jsonb, true, '[]'::jsonb, '', '', '', '', '{}'::jsonb,
      '{}', '', true, '{}', '', '{}'
    );
    work_ids := work_ids || jsonb_build_array(work->>'id');
  end loop;

  insert into public.user_projects (
    id, user_id, title, description, status, cover, sectors, linked_albums,
    linked_tracks, linked_works, linked_tour_dates, target_date, objectives,
    milestone_states
  ) values (
    project_id, uid, btrim(payload->>'title'), coalesce(payload->>'description', ''),
    coalesce(payload->>'status', 'in_progress'), coalesce(payload->>'cover', ''),
    coalesce(payload->'sectors', '[]'::jsonb), album_ids,
    coalesce(payload->'linkedTrackIds', '[]'::jsonb), work_ids,
    coalesce(payload->'linkedTourDateIds', '[]'::jsonb),
    nullif(payload->>'targetDate', '')::date,
    coalesce(payload->'objectives', '[]'::jsonb),
    coalesce(payload->'milestoneStates', '{}'::jsonb)
  );

  return project_id;
end;
$$;

grant execute on function public.create_project_with_links(jsonb) to authenticated;
```

- [ ] **Step 2 : Appliquer**

**Demander à l'utilisateur** avant d'appliquer : c'est la base de production (le seul compte y vit). S'il accepte, appliquer via le SQL Editor Supabase ou `npx supabase db push`, selon ce qu'il utilise d'habitude (voir la recette de déploiement dans `ALPHA.md`).

Contrôle :

```sql
select column_name from information_schema.columns
where table_name = 'user_preferences' and column_name in ('identity_mode', 'artist_name');
```

Attendu : 2 lignes.

- [ ] **Point d'arrêt.**

---

### Task 2 : Fonctions pures `artist-identity`

**Files:**
- Create: `src/lib/artist-identity.ts`

- [ ] **Step 1 : Écrire le module**

```ts
import type { Person } from "@/lib/sidekick-store";

/**
 * Identité de l'artiste — voir CLAUDE.md, section « Identité de l'artiste ».
 *
 * Deux noms coexistent :
 * - le nom affiché (`user_preferences.artist_name`), nom d'artiste ou « Prénom
 *   Nom » selon `identity_mode` : il signe les sorties (titres, albums, mixes)
 *   et l'en-tête du lien d'écoute ;
 * - le nom civil (`user_metadata`) : il signe les œuvres, qui se déclarent
 *   sous l'identité civile de leurs auteurs, jamais sous un nom de scène.
 */

export type IdentityMode = "artist" | "legal";

export type LegalNameParts = {
  firstName: string;
  lastName: string;
  /** « Prénom Nom », chaîne vide si rien n'est connu. */
  full: string;
};

/**
 * Nom civil depuis `user_metadata`. L'inscription par email n'écrit que
 * `full_name` ; Réglages écrit `first_name` / `last_name` ; Google fournit
 * `given_name` / `family_name` et `full_name`. Les champs séparés priment.
 */
export function legalNameParts(meta: Record<string, unknown>): LegalNameParts {
  const str = (key: string) =>
    typeof meta[key] === "string" ? (meta[key] as string).trim() : "";

  let firstName = str("first_name") || str("firstname") || str("given_name");
  let lastName = str("last_name") || str("lastname") || str("family_name");

  if (!firstName && !lastName) {
    const [first, ...rest] = (str("full_name") || str("name"))
      .split(/\s+/)
      .filter(Boolean);
    firstName = first ?? "";
    lastName = rest.join(" ");
  }

  return {
    firstName,
    lastName,
    full: [firstName, lastName].filter(Boolean).join(" "),
  };
}

/**
 * Valeur initiale d'un champ « artiste » de sortie (titre, album, mix) à la
 * création. Tout nouveau champ de ce type passe par ici, jamais par une
 * lecture directe de `artist_title` (presskit) ou de `full_name`.
 */
export function defaultArtist(artistName: string): string {
  return artistName.trim();
}

/**
 * L'utilisateur comme ayant droit d'une nouvelle œuvre : nom civil, nom
 * d'artiste en pseudonyme, auteur et compositeur. Un point de départ,
 * retirable et modifiable comme n'importe quel ayant droit. `null` si le nom
 * civil est inconnu : mieux vaut aucune entrée qu'une entrée vide.
 */
export function selfPerson(
  legal: LegalNameParts,
  identityMode: IdentityMode | null,
  artistName: string
): Person | null {
  if (!legal.full) return null;
  return {
    id: crypto.randomUUID(),
    // `name` est le champ obligatoire d'un ayant droit : sans nom de famille
    // connu, le prénom y prend place.
    firstName: legal.lastName ? legal.firstName : "",
    name: legal.lastName || legal.firstName,
    pseudonym: identityMode === "artist" ? artistName.trim() : "",
    roles: ["author", "composer"],
  };
}
```

- [ ] **Step 2 : Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Point d'arrêt.**

---

### Task 3 : `usePreferencesData` — lecture et écriture

**Files:**
- Modify: `src/hooks/usePreferencesData.ts`

- [ ] **Step 1 : Import du type**

Après l'import de `@/lib/sidekick-store` :

```ts
import type { IdentityMode } from "@/lib/artist-identity";
```

- [ ] **Step 2 : `PreferencesRow`**

Ajouter à la fin du type :

```ts
  /** NULL tant que la question « nom d'artiste ou nom propre » n'a pas été posée. */
  identity_mode: IdentityMode | null;
  /** Nom affiché, renseigné dès que `identity_mode` l'est. */
  artist_name: string | null;
```

- [ ] **Step 3 : Palier de repli `SELECTS`**

Remplacer le tableau par :

```ts
  const SELECTS = [
    `${BASE_COLUMNS}, demo_seed, reminders_enabled, invoice_template, invoice_footer_note, identity_mode, artist_name`,
    `${BASE_COLUMNS}, demo_seed, reminders_enabled, invoice_template, invoice_footer_note`,
    `${BASE_COLUMNS}, demo_seed, reminders_enabled`,
    BASE_COLUMNS,
  ];
```

- [ ] **Step 4 : Lecture**

Dans l'objet renvoyé par `fetchPreferences`, après `invoice_footer_note` :

```ts
    identity_mode:
      ((data as { identity_mode?: IdentityMode | null }).identity_mode) ?? null,
    artist_name: ((data as { artist_name?: string | null }).artist_name) ?? null,
```

- [ ] **Step 5 : `persist` reporte les colonnes**

Dans `nextRow`, avant `...patch` :

```ts
        identity_mode: row?.identity_mode ?? null,
        artist_name: row?.artist_name ?? null,
```

- [ ] **Step 6 : Setter**

Après `setInvoiceFooterNote` :

```ts
  /**
   * Enregistre l'identité de l'artiste. Le nom est toujours stocké résolu,
   * même en nom propre : la route publique du lien d'écoute ne lit que cette
   * table. Un nom vide est refusé, l'appelant désactive son bouton avant.
   */
  const setArtistIdentity = useCallback(
    (mode: IdentityMode, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      persist(
        { identity_mode: mode, artist_name: trimmed },
        { identity_mode: mode, artist_name: trimmed }
      );
    },
    [persist]
  );
```

- [ ] **Step 7 : Exposer**

Dans le `return`, après `setInvoiceFooterNote,` :

```ts
    identityMode: row?.identity_mode ?? null,
    artistName: row?.artist_name ?? "",
    setArtistIdentity,
```

- [ ] **Step 8 : Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Point d'arrêt.**

---

### Task 4 : Hook `useArtistIdentity`

**Files:**
- Create: `src/hooks/useArtistIdentity.ts`

- [ ] **Step 1 : Écrire le hook**

```ts
"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { createClient, getSessionUser } from "@/lib/supabase";
import { usePreferencesData } from "@/hooks/usePreferencesData";
import { defaultArtist, legalNameParts } from "@/lib/artist-identity";

/** Clé SWR des métadonnées de compte. Réglages la revalide après un changement de nom. */
export const AUTH_META_KEY = "auth_user_metadata";

async function fetchMeta(): Promise<Record<string, unknown>> {
  const {
    data: { user },
  } = await getSessionUser(createClient());
  return (user?.user_metadata ?? {}) as Record<string, unknown>;
}

/**
 * Point d'entrée unique des écrans qui ont besoin du nom de l'utilisateur.
 * Voir CLAUDE.md, section « Identité de l'artiste ».
 */
export function useArtistIdentity() {
  const { artistName, identityMode, setArtistIdentity, preferencesReady } =
    usePreferencesData();
  const { data: meta, isLoading } = useSWR(AUTH_META_KEY, fetchMeta);

  const legal = useMemo(() => legalNameParts(meta ?? {}), [meta]);

  return {
    /** Nom affiché (artiste ou « Prénom Nom »), chaîne vide si non renseigné. */
    artistName,
    identityMode,
    setArtistIdentity,
    /** Nom civil, pour les œuvres et le choix « nom propre ». */
    legal,
    /** Valeur initiale d'un champ artiste de sortie. */
    releaseArtist: defaultArtist(artistName),
    /** Préférences et métadonnées chargées : on peut pré-remplir. */
    ready: preferencesReady && !isLoading,
  };
}
```

- [ ] **Step 2 : Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Point d'arrêt.**

---

### Task 5 : Lien d'écoute (bug public)

**Files:**
- Modify: `app/api/listening/[slug]/route.ts:40-69`

- [ ] **Step 1 : Lire le nom affiché**

Remplacer le commentaire et la requête `profile` (l. 40-46) par :

```ts
  // Nom affiché : l'identité déclarée à l'onboarding (`user_preferences`),
  // puis le presskit (fermé pour l'alpha, mais peut-être renseigné avant),
  // puis un libellé neutre. `user_presskit_profile` ne porte pas de colonne
  // `artist_name` : son nom est `artist_title`, `streaming_artist_name` en repli.
  const [{ data: prefs }, { data: profile }] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("artist_name")
      .eq("user_id", row.user_id)
      .maybeSingle(),
    supabase
      .from("user_presskit_profile")
      .select("artist_title, streaming_artist_name")
      .eq("user_id", row.user_id)
      .maybeSingle(),
  ]);
```

Si la migration n'est pas appliquée, la première requête renvoie une erreur et `prefs` vaut `null` : on retombe sur le presskit, comme aujourd'hui.

- [ ] **Step 2 : Ordre de résolution**

Remplacer le bloc `artistName: (() => { ... })(),` par :

```ts
    artistName: (() => {
      const p = profile as
        | { artist_title?: string; streaming_artist_name?: string }
        | null;
      return (
        ((prefs as { artist_name?: string | null } | null)?.artist_name ?? "").trim() ||
        (p?.artist_title ?? "").trim() ||
        (p?.streaming_artist_name ?? "").trim() ||
        "Artiste"
      );
    })(),
```

- [ ] **Step 3 : Vérifier**

Run: `npx tsc --noEmit`, puis `npm run lint`.

Contrôle manuel (après la tâche 7, qui renseigne le nom) : ouvrir en navigation privée un lien d'écoute existant du compte (`/ecoute/<slug>`). L'en-tête affiche le nom et non « Artiste ».

- [ ] **Point d'arrêt.**

---

### Task 6 : Composants d'identité

**Files:**
- Create: `src/components/onboarding/IdentityChoice.tsx`
- Create: `src/components/onboarding/IdentityStep.tsx`

- [ ] **Step 1 : `IdentityChoice` (contrôlé, sans état)**

```tsx
"use client";

import { Check, Sparkles, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IdentityMode } from "@/lib/artist-identity";
import { cn } from "@/lib/utils";

const CHOICES: {
  id: IdentityMode;
  label: string;
  description: string;
  icon: typeof User;
}[] = [
  {
    id: "artist",
    label: "Un nom d'artiste",
    description: "Tu sors ta musique sous un nom de scène ou un nom de projet.",
    icon: Sparkles,
  },
  {
    id: "legal",
    label: "Mon nom",
    description: "Tu sors ta musique sous ton nom, prénom et nom.",
    icon: User,
  },
];

/**
 * Choix « nom d'artiste ou nom propre », partagé par l'onboarding et
 * Réglages. Deux brouillons distincts : passer d'un mode à l'autre ne perd
 * pas ce qui a été tapé dans le premier.
 */
export function IdentityChoice({
  mode,
  artistDraft,
  legalDraft,
  onModeChange,
  onArtistDraftChange,
  onLegalDraftChange,
}: {
  mode: IdentityMode | null;
  artistDraft: string;
  legalDraft: string;
  onModeChange: (mode: IdentityMode) => void;
  onArtistDraftChange: (value: string) => void;
  onLegalDraftChange: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {CHOICES.map((choice) => {
          const Icon = choice.icon;
          const checked = mode === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => onModeChange(choice.id)}
              aria-pressed={checked}
              className={cn(
                "flex items-start gap-3 rounded-sm border p-4 text-left transition-colors",
                checked
                  ? "border-[#F0FF00] bg-[rgba(240,255,0,0.06)]"
                  : "border-[rgba(245,245,245,0.12)] hover:bg-[rgba(245,245,245,0.04)]"
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#F0FF00]" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {choice.label}
                  {checked && <Check className="h-3.5 w-3.5 text-[#F0FF00]" />}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[#f5f5f5]/55">
                  {choice.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {mode === "artist" && (
        <div className="space-y-2">
          <Label htmlFor="identity-artist-name">Ton nom d&apos;artiste</Label>
          <Input
            id="identity-artist-name"
            value={artistDraft}
            onChange={(e) => onArtistDraftChange(e.target.value)}
            placeholder="Nom d'artiste"
            autoFocus
          />
        </div>
      )}

      {mode === "legal" && (
        <div className="space-y-2">
          <Label htmlFor="identity-legal-name">Ton nom, tel qu&apos;il apparaîtra</Label>
          <Input
            id="identity-legal-name"
            value={legalDraft}
            onChange={(e) => onLegalDraftChange(e.target.value)}
            placeholder="Prénom Nom"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : `IdentityStep` (état + enregistrement)**

```tsx
"use client";

import { useState } from "react";
import { usePostHog } from "posthog-js/react";
import { Button } from "@/components/ui/button";
import { useArtistIdentity } from "@/hooks/useArtistIdentity";
import type { IdentityMode } from "@/lib/artist-identity";
import { IdentityChoice } from "./IdentityChoice";

/**
 * Étape « Tu sors ta musique sous… ». Première étape de l'onboarding, et
 * seule étape montrée aux comptes créés avant son apparition.
 *
 * L'identité est enregistrée dès « Continuer », sans attendre la fin de
 * l'onboarding : un parcours abandonné en route la garde.
 */
export function IdentityStep({
  eyebrow,
  onContinue,
}: {
  eyebrow: string;
  onContinue: () => void;
}) {
  const posthog = usePostHog();
  const { identityMode, artistName, legal, setArtistIdentity } = useArtistIdentity();

  const [mode, setMode] = useState<IdentityMode | null>(identityMode);
  const [artistDraft, setArtistDraft] = useState(
    identityMode === "artist" ? artistName : ""
  );
  // Le nom civil arrive par SWR : tant que l'utilisateur n'a rien tapé, le
  // brouillon suit la valeur chargée.
  const [legalDraft, setLegalDraft] = useState<string | null>(null);
  const legalValue = legalDraft ?? (identityMode === "legal" ? artistName : legal.full);

  const name = mode === "artist" ? artistDraft : mode === "legal" ? legalValue : "";
  const canContinue = mode !== null && name.trim() !== "";

  const submit = () => {
    if (!mode || !canContinue) return;
    setArtistIdentity(mode, name);
    posthog?.capture("onboarding_identity_set", { mode });
    onContinue();
  };

  return (
    <>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#F0FF00]">
        {eyebrow}
      </p>
      <h1 className="font-display mt-3 text-3xl sm:text-4xl">
        Tu sors ta musique sous…
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[#f5f5f5]/60">
        Ce nom signe tes liens d&apos;écoute et remplit d&apos;office tes
        nouveaux titres et albums. Tes œuvres restent déclarées à ton nom
        civil. Tu peux le changer quand tu veux depuis les réglages.
      </p>

      <div className="mt-8">
        <IdentityChoice
          mode={mode}
          artistDraft={artistDraft}
          legalDraft={legalValue}
          onModeChange={setMode}
          onArtistDraftChange={setArtistDraft}
          onLegalDraftChange={setLegalDraft}
        />
      </div>

      <div className="mt-8 flex justify-end">
        <Button size="lg" className="btn-glow gap-2" disabled={!canContinue} onClick={submit}>
          Continuer
        </Button>
      </div>
    </>
  );
}
```

- [ ] **Step 3 : Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Point d'arrêt.**

---

### Task 7 : Onboarding en 3 étapes + comptes existants

**Files:**
- Modify: `src/components/onboarding/SectorOnboarding.tsx`
- Modify: `src/modules/dashboard/components/DashboardPage.tsx:62-72,355-368`

- [ ] **Step 1 : Extraire la coquille**

Dans `SectorOnboarding.tsx`, ajouter avant `export function SectorOnboarding` :

```tsx
/** Coquille plein écran commune aux étapes d'onboarding. */
export function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101010]/95 p-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-sm border border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] p-8 backdrop-blur-xl">
        {children}
      </div>
    </div>
  );
}
```

Et l'import, en tête du fichier :

```tsx
import { IdentityStep } from "./IdentityStep";
```

- [ ] **Step 2 : Trois étapes**

1. Mettre à jour le commentaire du composant : « Onboarding en trois temps » ; ajouter en tête « Étape 1 : identité (nom d'artiste ou nom propre), enregistrée dès la validation. » et renuméroter secteurs → 2, données d'exemple → 3.
2. `const [step, setStep] = useState<1 | 2>(1);` devient `useState<1 | 2 | 3>(1);`
3. Remplacer les deux `<div>` extérieurs du `return` par `<OnboardingShell>` … `</OnboardingShell>`.
4. Remplacer `{step === 1 ? ( <>…secteurs…</> ) : ( <>…exemples…</> )}` par :

```tsx
      {step === 1 && (
        <IdentityStep eyebrow="Bienvenue" onContinue={() => setStep(2)} />
      )}
      {step === 2 && (
        <>
          {/* bloc secteurs existant, inchangé sauf les deux points ci-dessous */}
        </>
      )}
      {step === 3 && (
        <>
          {/* bloc données d'exemple existant, inchangé sauf le point ci-dessous */}
        </>
      )}
```

(Déplacer les deux blocs existants tels quels dans ces branches.)

5. Dans le bloc secteurs : l'eyebrow « Bienvenue » devient « Étape 2 sur 3 », et le bouton « Continuer » appelle `setStep(3)`.
6. Dans le bloc données d'exemple : le bouton retour appelle `setStep(2)`.

- [ ] **Step 3 : Comptes existants, dans `DashboardPage.tsx`**

Import :

```tsx
import { OnboardingShell, SectorOnboarding } from "@/components/onboarding/SectorOnboarding";
import { IdentityStep } from "@/components/onboarding/IdentityStep";
```

(remplace l'import actuel de `SectorOnboarding`.)

Déstructuration de `usePreferencesData()` : ajouter `identityMode,`.

Sous `const [onboardingDone, setOnboardingDone] = useState(false);` :

```tsx
  // Comptes créés avant l'étape identité : on la leur pose une fois, seule.
  const [identityDone, setIdentityDone] = useState(false);
```

Après `const showOnboarding = …` :

```tsx
  const showIdentityOnly =
    preferencesReady && onboardingCompleted && identityMode === null && !identityDone;
```

Après le `if (showOnboarding) { … }` :

```tsx
  if (showIdentityOnly) {
    return (
      <OnboardingShell>
        <IdentityStep eyebrow="Nouveau" onContinue={() => setIdentityDone(true)} />
      </OnboardingShell>
    );
  }
```

- [ ] **Step 4 : Vérifier**

Run: `npx tsc --noEmit`, `npm run lint`.

En dev, compte de captures (onboarding déjà fait, `identity_mode` NULL) : `/dashboard` affiche l'étape « Nouveau / Tu sors ta musique sous… » ; « Mon nom » propose « Eliott Matton » ; choisir le mode voulu par l'utilisateur, « Continuer » ; le tableau de bord s'affiche ; recharger, l'étape ne revient pas. Contrôle SQL : `select identity_mode, artist_name from user_preferences;`.

Le parcours d'onboarding complet (3 étapes) ne peut pas être rejoué sur ce compte sans le remettre à zéro : le vérifier sur un compte vierge lors de la recette du 24/09 (ajouter la ligne à la recette dans `ALPHA.md`, tâche 12).

Puis reprendre le contrôle manuel de la tâche 5 (lien d'écoute).

- [ ] **Point d'arrêt.**

---

### Task 8 : Pré-remplissage titres, albums, mixes

**Files:**
- Modify: `src/modules/phono/components/tracks/TrackEditPage.tsx:74-77,125-141`
- Modify: `src/modules/phono/components/albums/AlbumEditPage.tsx:92-96,154-169`
- Modify: `src/modules/phono/components/mixes/MixEditPage.tsx:65-67,111-125`

Principe commun : la valeur est posée **à la création uniquement**, au moment où le formulaire vierge est initialisé, et l'initialisation attend que l'identité soit chargée. `initialForm` reçoit la même valeur : le pré-remplissage ne compte pas comme une modification.

- [ ] **Step 1 : Titre**

Import : `import { useArtistIdentity } from "@/hooks/useArtistIdentity";`

`emptyForm` prend le nom en paramètre :

```ts
function emptyForm(mainArtist = ""): TrackFormState {
  return {
    title: "",
    mainArtist,
```

(le reste inchangé ; `useState<TrackFormState>(emptyForm)` reste valide, React appelle l'initialiseur sans argument.)

Dans le composant, avant `const [form, setForm]` :

```ts
  const { releaseArtist, ready: identityReady } = useArtistIdentity();
```

Remplacer la ligne `readyId` et l'appel `emptyForm()` :

```ts
  // Un nouveau titre attend l'identité pour naître pré-rempli.
  const readyId = track
    ? track.id
    : trackId === null && identityReady
      ? "__new__"
      : null;
  if (readyId !== null && loadedId !== readyId) {
    setLoadedId(readyId);
    const initial = track ? formFromTrack(track) : emptyForm(releaseArtist);
```

- [ ] **Step 2 : Album**

Import : `import { useArtistIdentity } from "@/hooks/useArtistIdentity";`

Avant `const [form, setForm]` :

```ts
  const { releaseArtist, ready: identityReady } = useArtistIdentity();
```

Remplacer `readyId` et `initial` :

```ts
  const readyId = album
    ? album.id
    : albumId === null && identityReady
      ? "__new__"
      : null;
  if (readyId !== null && loadedId !== readyId) {
    setLoadedId(readyId);
    const initial = album
      ? formFromAlbum(album)
      : { ...EMPTY_FORM, artist: releaseArtist };
```

- [ ] **Step 3 : Mix**

Import : `import { useArtistIdentity } from "@/hooks/useArtistIdentity";`

Avant `const [form, setForm]` :

```ts
  const { releaseArtist, ready: identityReady } = useArtistIdentity();
```

Remplacer `readyId` et `initial` :

```ts
  const readyId = mix
    ? mix.id
    : mixId === null && identityReady
      ? "__new__"
      : null;
  if (readyId !== null && loadedId !== readyId) {
    setLoadedId(readyId);
    const initial = mix
      ? formFromMix(mix)
      : { ...EMPTY_FORM, artists: releaseArtist };
```

Ne **pas** toucher `TracklistEditor.tsx:314` (entrées de tracklist, souvent le morceau d'un autre artiste).

- [ ] **Step 4 : Vérifier**

Run: `npx tsc --noEmit`, `npm run lint`.

En dev : ouvrir « Nouveau titre », « Nouvel album », « Nouveau mix » : champ artiste pré-rempli ; quitter sans enregistrer ne déclenche pas d'alerte de modifications non enregistrées. Ouvrir un titre existant : sa valeur d'origine est intacte. **Ne rien enregistrer** sur le compte de captures.

- [ ] **Point d'arrêt.**

---

### Task 9 : Œuvres — nom civil et ayant droit « soi »

**Files:**
- Modify: `src/modules/edition/components/WorksPage.tsx:214-215,728,1319-1332,1356,1371,1379,1422,1453`

- [ ] **Step 1 : Imports**

```ts
import { useArtistIdentity } from "@/hooks/useArtistIdentity";
import { selfPerson } from "@/lib/artist-identity";
```

- [ ] **Step 2 : Fabrique d'œuvre vierge**

Dans `WorksPage`, après `const { tracks } = usePhonoData();` :

```ts
  const { legal, identityMode, artistName } = useArtistIdentity();
  // Une œuvre se déclare sous l'identité civile de ses auteurs : nom civil, et
  // l'utilisateur d'office comme ayant droit (retirable). Fonction et non
  // valeur : chaque ouverture tire un nouvel identifiant d'ayant droit.
  const blankWork = (): Omit<Work, "id"> => {
    const self = selfPerson(legal, identityMode, artistName);
    return { ...DEFAULT_WORK, artistName: legal.full, persons: self ? [self] : [] };
  };
```

Remplacer **uniquement** les usages de création :

- l. 1371 : `setNewWork(DEFAULT_WORK);` → `setNewWork(blankWork());`
- l. 1422 : `setNewWork(DEFAULT_WORK); setIsAddOpen(true);` → `setNewWork(blankWork()); setIsAddOpen(true);`
- l. 1453 : idem.

Laisser `useState<Omit<Work, "id">>(DEFAULT_WORK)` (l. 1331-1332) : l'état est réinitialisé à chaque ouverture, et `editWork` n'est jamais une création.

- [ ] **Step 3 : Libellés**

- l. 728 : `Nom du groupe / de l&apos;artiste *` → `Nom (état civil) *`
- l. 1356 et 1379 : `"Le nom du groupe / de l'artiste est requis."` → `"Le nom (état civil) est requis."`

- [ ] **Step 4 : Vérifier**

Run: `npx tsc --noEmit`, `npm run lint`.

En dev, `/edition` puis « Ajouter une œuvre » : champ nom = nom civil (même en mode artiste) ; ayants droit = l'utilisateur, auteur + compositeur, pseudonyme = nom d'artiste en mode artiste ; l'ayant droit se retire. **Fermer sans enregistrer.**

- [ ] **Point d'arrêt.**

---

### Task 10 : Création depuis un projet

**Files:**
- Modify: `src/modules/projects/components/ProjectCreatePage.tsx:22,55,66-67,77`

- [ ] **Step 1 : Imports et type**

```ts
import { useArtistIdentity } from "@/hooks/useArtistIdentity";
import { selfPerson } from "@/lib/artist-identity";
import type { Person } from "@/lib/sidekick-store";
```

(si `sidekick-store` est déjà importé en type, ajouter `Person` à cet import.)

l. 22 : `type DraftWork = { id: string; title: string; artistName: string; persons: Person[] };`

- [ ] **Step 2 : Hook**

Ajouter à la ligne 55, après `const live = useLiveData();` :

```ts
 const identity = useArtistIdentity();
```

- [ ] **Step 3 : Pré-remplir**

l. 66 : dans `addRelease`, `artist: ""` → `artist: identity.releaseArtist`.

l. 67 : remplacer `addWork` par :

```ts
  const addWork = () => {
    const self = selfPerson(identity.legal, identity.identityMode, identity.artistName);
    setNewWorks((prev) => [...prev, { id: `w-${crypto.randomUUID()}`, title: "", artistName: identity.legal.full, persons: self ? [self] : [] }]);
  };
```

l. 77 : placeholder de l'œuvre `"Artiste · facultatif"` → `"Nom (état civil) · facultatif"`.

`createProjectBundle` transmet `newWorks` tel quel : la RPC de la tâche 1 lit `persons`.

- [ ] **Step 4 : Vérifier**

Run: `npx tsc --noEmit`, `npm run lint`.

En dev, `/projects/new` : avec un objectif Phono, « Single » pré-remplit l'artiste ; avec un objectif Édition, « Créer une œuvre » pré-remplit le nom civil. **Ne pas créer le projet** sur le compte de captures (le test d'enregistrement se fait sur un compte vierge lors de la recette).

- [ ] **Point d'arrêt.**

---

### Task 11 : Réglages — carte « Identité artistique »

**Files:**
- Create: `src/modules/settings/components/ArtistIdentityCard.tsx`
- Modify: `src/modules/settings/components/SettingsPage.tsx`

- [ ] **Step 1 : La carte**

```tsx
"use client";

import { useState } from "react";
import { usePostHog } from "posthog-js/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IdentityChoice } from "@/components/onboarding/IdentityChoice";
import { useArtistIdentity } from "@/hooks/useArtistIdentity";
import { useEditionData } from "@/hooks/useEditionData";
import { usePhonoData } from "@/hooks/usePhonoData";
import type { IdentityMode } from "@/lib/artist-identity";

function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`;
}

/**
 * Identité de l'artiste dans Réglages. Changer de nom ne réécrit pas le
 * catalogue : une sortie publiée garde le nom sous lequel elle est sortie.
 * Seuls les champs artiste vides peuvent être remplis, et sur demande.
 */
export function ArtistIdentityCard() {
  const posthog = usePostHog();
  const { identityMode, artistName, legal, setArtistIdentity } = useArtistIdentity();
  const { tracks, setTracks, albums, setAlbums, mixes, setMixes } = usePhonoData();
  const { works, setWorks } = useEditionData();

  const [mode, setMode] = useState<IdentityMode | null>(identityMode);
  const [artistDraft, setArtistDraft] = useState<string | null>(null);
  const [legalDraft, setLegalDraft] = useState<string | null>(null);

  // Brouillons dérivés des valeurs chargées tant que rien n'a été tapé.
  const effectiveMode = mode ?? identityMode;
  const artistValue = artistDraft ?? (identityMode === "artist" ? artistName : "");
  const legalValue = legalDraft ?? (identityMode === "legal" ? artistName : legal.full);
  const name = effectiveMode === "artist" ? artistValue : effectiveMode === "legal" ? legalValue : "";
  const dirty =
    effectiveMode !== identityMode || name.trim() !== artistName.trim();

  const save = () => {
    if (!effectiveMode || !name.trim()) return;
    setArtistIdentity(effectiveMode, name);
    posthog?.capture("artist_identity_updated", { mode: effectiveMode, module: "settings" });
    toast.success("Identité enregistrée.");
  };

  // Remplissage des champs vides : nom affiché pour les sorties, nom civil
  // pour les œuvres. Jamais un champ déjà renseigné.
  const emptyTracks = tracks.filter((t) => !(t.mainArtist ?? "").trim()).length;
  const emptyAlbums = albums.filter((a) => !(a.artist ?? "").trim()).length;
  const emptyMixes = mixes.filter((m) => !(m.artists ?? "").trim()).length;
  const emptyWorks = legal.full
    ? works.filter((w) => !(w.artistName ?? "").trim()).length
    : 0;
  const canFillReleases = artistName.trim() !== "";
  const releaseCount = canFillReleases ? emptyTracks + emptyAlbums + emptyMixes : 0;
  const total = releaseCount + emptyWorks;

  const summary = [
    canFillReleases && emptyTracks > 0 && plural(emptyTracks, "titre", "titres"),
    canFillReleases && emptyAlbums > 0 && plural(emptyAlbums, "album", "albums"),
    canFillReleases && emptyMixes > 0 && plural(emptyMixes, "mix", "mixes"),
    emptyWorks > 0 && plural(emptyWorks, "œuvre", "œuvres"),
  ]
    .filter(Boolean)
    .join(", ");

  const fillEmpty = () => {
    const releaseName = artistName.trim();
    if (releaseName) {
      if (emptyTracks) setTracks((prev) => prev.map((t) => ((t.mainArtist ?? "").trim() ? t : { ...t, mainArtist: releaseName })));
      if (emptyAlbums) setAlbums((prev) => prev.map((a) => ((a.artist ?? "").trim() ? a : { ...a, artist: releaseName })));
      if (emptyMixes) setMixes((prev) => prev.map((m) => ((m.artists ?? "").trim() ? m : { ...m, artists: releaseName })));
    }
    if (emptyWorks) setWorks((prev) => prev.map((w) => ((w.artistName ?? "").trim() ? w : { ...w, artistName: legal.full })));
    posthog?.capture("artist_identity_backfilled", { count: total, module: "settings" });
    toast.success("Champs artiste complétés.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identité artistique</CardTitle>
        <CardDescription>
          Le nom qui signe tes liens d&apos;écoute et remplit tes nouveaux titres,
          albums et mixes. Tes sorties existantes gardent leur nom. Tes œuvres
          sont toujours déclarées à ton nom civil.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <IdentityChoice
          mode={effectiveMode}
          artistDraft={artistValue}
          legalDraft={legalValue}
          onModeChange={setMode}
          onArtistDraftChange={setArtistDraft}
          onLegalDraftChange={setLegalDraft}
        />
        <Button onClick={save} disabled={!dirty || !effectiveMode || !name.trim()}>
          Enregistrer l&apos;identité
        </Button>

        {!dirty && total > 0 && (
          <div className="flex flex-col gap-3 rounded-sm border border-[rgba(245,245,245,0.12)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#f5f5f5]/70">
              Champs artiste vides : {summary}.
            </p>
            <Button variant="outline" size="sm" onClick={fillEmpty}>
              Les remplir avec mon nom
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2 : La monter dans `SettingsPage`**

Imports :

```ts
import { mutate } from "swr";
import { ArtistIdentityCard } from "./ArtistIdentityCard";
import { AUTH_META_KEY } from "@/hooks/useArtistIdentity";
import { usePreferencesData } from "@/hooks/usePreferencesData";
```

Dans le composant, après `const posthog = usePostHog();` :

```ts
  const { identityMode, setArtistIdentity } = usePreferencesData();
```

Dans `handleSaveProfile`, après `if (error) throw error;` :

```ts
      // En nom propre, le nom affiché est le nom civil : il suit.
      const full = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
      if (identityMode === "legal" && full) setArtistIdentity("legal", full);
      void mutate(AUTH_META_KEY);
```

Dans le JSX, entre la `</Card>` du Profil et la `<Card>` du Mot de passe :

```tsx
      <ArtistIdentityCard />
```

- [ ] **Step 3 : Vérifier**

Run: `npx tsc --noEmit`, `npm run lint`.

En dev, `/settings` : la carte affiche le mode enregistré à la tâche 7 ; le bouton reste désactivé tant que rien ne change ; basculer de mode active le bouton. **Ne pas enregistrer d'autre identité que celle voulue par l'utilisateur.** Si des champs vides existent, le résumé les compte : **demander à l'utilisateur** avant de cliquer « Les remplir » (données réelles).

- [ ] **Point d'arrêt.**

---

### Task 12 : Documentation

**Files:**
- Modify: `CLAUDE.md` (en tête de la section `## Architecture`)
- Modify: `ALPHA.md`

- [ ] **Step 1 : `CLAUDE.md`**

Insérer juste après le paragraphe d'introduction de `## Architecture` (« **SIDEKICK** is a Next.js 16 app … ») :

```markdown
### ⚠️ Identité de l'artiste — à respecter partout

L'utilisateur déclare à l'onboarding s'il sort sa musique sous un **nom
d'artiste** ou **en nom propre**. Tout ce qui affiche ou pré-remplit son nom
passe par cette identité, jamais par un champ saisi ailleurs.

- **Source de vérité** : `user_preferences.identity_mode` (`'artist'` |
  `'legal'` | NULL = pas encore demandé) et `user_preferences.artist_name`
  (le nom affiché, toujours résolu, y compris en nom propre).
- **Côté client** : `useArtistIdentity()` (`src/hooks/useArtistIdentity.ts`)
  expose `artistName`, `identityMode`, `legal` (nom civil) et `releaseArtist`.
  Fonctions pures dans `src/lib/artist-identity.ts`.
- **Côté serveur / pages publiques** : lire `user_preferences.artist_name`
  (clé service pour les routes publiques, cf. `app/api/listening/[slug]`).

Trois règles :

1. **Identité = en direct.** Là où c'est l'utilisateur qui parle (en-tête du
   lien d'écoute, futurs prompts IA, presskit à sa réouverture), on lit
   `artist_name` à chaque affichage.
2. **Sortie = pré-remplie puis copiée.** Titres (`mainArtist`), albums
   (`artist`), mixes (`artists`) : valeur initiale `releaseArtist` **à la
   création uniquement**, modifiable, copiée dans l'enregistrement. Renommer
   l'identité ne réécrit jamais le catalogue. Exceptions non pré-remplies :
   entrées de tracklist d'un mix, featurings.
3. **Œuvre = nom civil.** Une œuvre (Édition) se déclare sous l'identité
   civile de ses auteurs : champ `artistName` pré-rempli avec `legal.full`,
   et l'utilisateur ajouté d'office comme ayant droit via `selfPerson()`
   (pseudonyme = nom d'artiste). Jamais `artist_name` à cet endroit.

Interdits : lire `user_presskit_profile.artist_title` ou `user_metadata.full_name`
pour afficher l'artiste ; ajouter un champ « artiste » de création sans passer
par `useArtistIdentity()`. **Tout nouveau module ou écran qui parle de
l'artiste doit se brancher ici.**
```

Et dans le tableau *Module hooks*, ligne Préférences, ajouter `identity_mode`, `artist_name` au rôle de la table si le tableau le précise ; sinon rien.

- [ ] **Step 2 : `ALPHA.md`**

1. Dans *Avancement*, nouvelle entrée datée à la suite des autres :

```markdown
### 🟡 Lundi 21/09 — identité de l'artiste (nom d'artiste ou nom propre)

Oubli structurant : le produit ne connaissait pas le nom de l'utilisateur. Le
seul champ était `artist_title` du presskit, fermé pour l'alpha, si bien que
**tous les liens d'écoute affichaient « Artiste »** à leurs destinataires.

- Colonnes `identity_mode` / `artist_name` sur `user_preferences`
  (`20260921000000_artist_identity.sql`, qui met aussi à jour la RPC
  `create_project_with_links` pour transmettre les ayants droit).
- Onboarding en trois étapes, l'identité en premier ; les comptes existants la
  voient une fois sur le tableau de bord.
- Lien d'écoute signé par `artist_name`.
- Titres, albums, mixes pré-remplis avec le nom affiché ; œuvres pré-remplies
  avec le nom civil et l'utilisateur comme ayant droit.
- Réglages : carte « Identité artistique » et remplissage des champs vides.
- Règles consignées dans `CLAUDE.md` (« Identité de l'artiste »).

Spec : `docs/superpowers/specs/2026-09-21-artist-identity-design.md`.
```

(passer en ✅ une fois vérifié en dev et migration appliquée.)

2. Dans *Recette de déploiement*, ajouter :

```markdown
- [ ] Migration `20260921000000_artist_identity.sql` appliquée en production.
- [ ] Compte vierge : l'onboarding a trois étapes, l'identité en premier ; un
      lien d'écoute créé ensuite affiche le nom choisi.
- [ ] Compte vierge : créer une œuvre depuis un projet, l'utilisateur figure
      dans ses ayants droit.
```

- [ ] **Point d'arrêt final** : présenter à l'utilisateur le récapitulatif des fichiers modifiés et les contrôles faits ; commit seulement s'il le demande.

---

## Self-review (fait à l'écriture)

- Couverture de la spec : données (T1, T3), helpers (T2, T4), onboarding (T6, T7), comptes existants (T7), Réglages + resynchro nom propre + remplissage (T11), lien d'écoute (T5), sorties (T8, T10), œuvres + ayant droit + libellés (T9, T10), RPC projets (T1), docs (T12). Prompts IA : hors périmètre (IA en pause), noté dans la spec.
- Noms cohérents : `IdentityMode`, `legalNameParts`, `defaultArtist`, `selfPerson`, `useArtistIdentity` (`artistName`, `identityMode`, `legal`, `releaseArtist`, `ready`, `setArtistIdentity`), `AUTH_META_KEY`, `OnboardingShell`, `IdentityChoice`, `IdentityStep`, `ArtistIdentityCard`.
- Risque connu : migration non appliquée → `identity_mode` reste NULL et l'upsert échoue (rollback silencieux). L'étape du tableau de bord se ferme quand même localement (`identityDone`) mais reviendra au rechargement : appliquer la migration (T1) avant toute vérification.
