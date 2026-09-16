# Lien d'écoute (module Phono) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'artiste de composer, depuis son catalogue phono, une page d'écoute privée et traçable à envoyer à un label ou un programmateur.

**Architecture:** Approche « référence vivante + copie de sécurité » : un lien référence le catalogue mais dénormalise à l'ajout tout ce que la page publique doit afficher, si bien qu'aucune modification du catalogue ne casse un lien en circulation. La page publique vit hors de l'app shell, ne reçoit jamais d'URL audio dans son HTML, et obtient à la lecture des URL Supabase signées valables 5 minutes. Les écoutes sont agrégées par couple (session, titre) via une fonction Postgres atomique plutôt que loguées événement par événement.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres + Storage + RLS), SWR, Radix UI + Tailwind, Web Audio API pour les peaks de waveform.

**Spec de référence :** `docs/superpowers/specs/2026-09-03-lien-ecoute-phono-design.md`

---

## Conventions imposées par ce dépôt

Trois écarts par rapport aux habitudes de la skill writing-plans, dictés par `CLAUDE.md` :

1. **Aucune étape de commit.** Le dépôt interdit `git add` / `git push` intermédiaires ; on ne commite que sur demande explicite de l'utilisateur. Les tâches se terminent donc par une vérification, pas par un commit.
2. **Aucune suite de tests.** Il n'y a pas de runner configuré. La vérification de chaque tâche passe par `npx tsc --noEmit`, `npm run lint`, et un contrôle manuel dans `npm run dev` dont le résultat attendu est décrit explicitement.
3. **Design system dark-only.** Jamais de `bg-white`, `text-gray-900` ni de variante claire. Palette : fond `#101010`, texte `#f5f5f5`, texte secondaire `rgba(245,245,245,0.7)`, carte `rgba(44,44,46,0.72)` + `backdrop-blur-xl`, bordure `rgba(245,245,245,0.12)`, accent `#F0FF00`. Icônes : `lucide-react` uniquement. Composants : `src/components/ui/` uniquement.

## Décisions techniques verrouillées

**Secret de signature des cookies.** Les cookies d'accès (mot de passe validé) sont signés par HMAC-SHA256 avec `SUPABASE_SERVICE_ROLE_KEY` comme clé. Cette variable est déjà présente, strictement serveur, et jamais exposée au client — elle évite d'introduire une variable d'environnement supplémentaire à provisionner sur Vercel. Elle n'est utilisée que comme secret HMAC, jamais transmise.

**Routes publiques et RLS.** Les cinq tables sont en RLS stricte par `user_id`. Les routes publiques bypassent la RLS via le client service role, exactement comme le fait déjà `app/api/calendar/ical/[token]/route.ts`. Aucune policy `anon` en écriture n'est créée : le slug et l'état du lien sont validés côté serveur avant toute écriture.

**Comptage atomique.** Les heartbeats passent par la fonction Postgres `listening_record_event`, en `insert ... on conflict do update`, ce qui évite les pertes d'incréments quand deux requêtes se croisent.

## Structure des fichiers

**À créer :**

| Fichier | Responsabilité |
|---|---|
| `supabase/migrations/20260903100000_listening_links.sql` | 5 tables, RLS, grants, fonction d'agrégation |
| `src/lib/listening-types.ts` | Types partagés app ↔ page publique |
| `src/lib/audio-peaks.ts` | Décodage client d'un fichier audio → durée + peaks |
| `src/lib/listening-db.ts` | CRUD côté artiste (client navigateur) |
| `src/lib/listening-public.ts` | Helpers serveur : service client, résolution de slug, mot de passe, cookie |
| `src/hooks/useListeningData.ts` | Hook SWR + updates optimistes |
| `app/api/listening/[slug]/route.ts` | Métadonnées publiques, sans URL audio |
| `app/api/listening/[slug]/unlock/route.ts` | Vérification du mot de passe, pose du cookie |
| `app/api/listening/[slug]/session/route.ts` | Création de session d'écoute |
| `app/api/listening/[slug]/audio/[itemId]/route.ts` | URL signée 5 min |
| `app/api/listening/[slug]/event/route.ts` | Heartbeat de progression |
| `app/api/listening/[slug]/download/[itemId]/route.ts` | Téléchargement conditionnel |
| `app/ecoute/[slug]/page.tsx` | Entrée serveur de la page publique |
| `app/ecoute/[slug]/ListeningRoomClient.tsx` | Orchestration des 3 portes |
| `src/modules/phono/components/listening/PasswordGate.tsx` | Porte mot de passe |
| `src/modules/phono/components/listening/IdentityGate.tsx` | Porte d'identification |
| `src/modules/phono/components/listening/ListeningPlayer.tsx` | Tracklist + lecture continue + barre ancrée |
| `src/modules/phono/components/listening/Waveform.tsx` | Rendu SVG des peaks |
| `src/modules/phono/components/listening/useListeningTracker.ts` | Heartbeats client |
| `app/(app)/phono/liens-ecoute/page.tsx` | Route app |
| `src/modules/phono/components/ListeningLinksPage.tsx` | Liste + états vides |
| `src/modules/phono/components/ListeningLinkComposer.tsx` | Composeur deux colonnes |
| `src/modules/phono/components/ListeningLinkStats.tsx` | Analytics d'un lien |
| `src/modules/phono/components/listening/ProtectionSummary.tsx` | Encart de confidentialité côté artiste |
| `src/modules/tasks/rules/phono.ts` | Règle de relance |

**À modifier :**

| Fichier | Modification |
|---|---|
| `src/lib/sidekick-store.ts` | `TrackVersion` gagne les champs audio |
| `src/modules/phono/components/CatalogPage.tsx` | Attachement d'un fichier audio par version |
| `src/components/layout/Sidebar.tsx:61-62` | Entrée « Liens d'écoute » |
| `src/modules/tasks/rules/types.ts` | Champ `phono` dans `RuleContext` |
| `src/modules/tasks/rules/index.ts` | Agrégation de `phonoRules` |
| `src/modules/tasks/components/Tasks.tsx` | Passage du contexte phono |
| `.env.example` | Documentation du rôle HMAC du service role |

---

## Task 1: Migration base de données

**Files:**
- Create: `supabase/migrations/20260903100000_listening_links.sql`

- [ ] **Step 1: Écrire la migration**

Le fichier suit la convention du dépôt : rejouable de bout en bout (`if not exists`, `drop policy if exists`), commenté en français, expliquant *pourquoi* et pas seulement *quoi*.

```sql
-- Liens d'écoute : pages privées composées depuis le catalogue phono et
-- envoyées à des labels / programmateurs.
--
-- Principe « référence vivante + copie de sécurité » : un item pointe vers le
-- catalogue par `source_id`, mais `snapshot` fige à l'ajout tout ce que la page
-- publique affiche. Supprimer un titre du catalogue ne casse donc jamais une
-- page déjà chez un label.
--
-- Écrite pour être rejouable : un premier passage interrompu doit pouvoir
-- repartir de n'importe quel état intermédiaire.

create table if not exists public.user_listening_links (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    -- Slug aléatoire non devinable : c'est la première ligne de défense.
    slug text not null unique,
    title text not null default '',
    intro_message text not null default '',
    cover_path text,
    -- NULL = pas de mot de passe. Format scrypt$sel$empreinte.
    password_hash text,
    -- NULL = pas d'expiration. Modifiable à tout moment.
    expires_at timestamptz,
    allow_download boolean not null default false,
    presskit_url text,
    -- Kill switch : coupe la page en conservant l'historique d'écoute,
    -- contrairement à la suppression qui efface tout en cascade.
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.user_listening_link_items (
    id uuid primary key default gen_random_uuid(),
    link_id uuid not null references public.user_listening_links(id) on delete cascade,
    position integer not null default 0,
    -- Nom du projet quand un album a été ajouté en bloc : la page publique en
    -- fait un intertitre de section. NULL pour un titre isolé.
    group_label text,
    kind text not null default 'track',
    source_id text not null default '',
    version_id text,
    -- Copie de sécurité : titre, artiste, invités, version, ISRC, crédits.
    snapshot jsonb not null default '{}'::jsonb,
    audio_path text not null default '',
    duration_ms integer not null default 0,
    peaks jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists user_listening_link_items_link_id_idx
    on public.user_listening_link_items (link_id, position);

create table if not exists public.user_listening_invites (
    id uuid primary key default gen_random_uuid(),
    link_id uuid not null references public.user_listening_links(id) on delete cascade,
    contact_id text,
    contact_name text not null default '',
    contact_email text not null default '',
    sent_at timestamptz not null default now(),
    first_opened_at timestamptz
);

create index if not exists user_listening_invites_link_id_idx
    on public.user_listening_invites (link_id);

create table if not exists public.user_listening_sessions (
    id uuid primary key default gen_random_uuid(),
    link_id uuid not null references public.user_listening_links(id) on delete cascade,
    invite_id uuid references public.user_listening_invites(id) on delete set null,
    -- NULL = le pro a choisi « écouter sans m'identifier ».
    visitor_name text,
    user_agent text,
    -- Empreinte, jamais l'IP en clair : on veut distinguer des sessions,
    -- pas constituer un fichier d'adresses.
    ip_hash text,
    created_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now()
);

create index if not exists user_listening_sessions_link_id_idx
    on public.user_listening_sessions (link_id, created_at desc);

create table if not exists public.user_listening_plays (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.user_listening_sessions(id) on delete cascade,
    item_id uuid not null references public.user_listening_link_items(id) on delete cascade,
    listened_ms integer not null default 0,
    max_position_ms integer not null default 0,
    play_count integer not null default 0,
    completed boolean not null default false,
    downloaded boolean not null default false,
    updated_at timestamptz not null default now(),
    unique (session_id, item_id)
);

-- Clés étrangères vers auth.users posées séparément pour rester rejouable.
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'user_listening_links_user_id_fkey'
    ) then
        alter table only public.user_listening_links
            add constraint user_listening_links_user_id_fkey
            foreign key (user_id) references auth.users(id) on delete cascade;
    end if;
end
$$;

-- RLS : l'artiste ne voit que ses liens. Les visiteurs n'ont aucun accès
-- direct — les routes publiques passent par le service role après avoir
-- validé le slug et l'état du lien.
alter table public.user_listening_links enable row level security;
alter table public.user_listening_link_items enable row level security;
alter table public.user_listening_invites enable row level security;
alter table public.user_listening_sessions enable row level security;
alter table public.user_listening_plays enable row level security;

drop policy if exists "Users manage own listening links" on public.user_listening_links;
create policy "Users manage own listening links" on public.user_listening_links
    using ((user_id = auth.uid()))
    with check ((user_id = auth.uid()));

drop policy if exists "Users manage own listening items" on public.user_listening_link_items;
create policy "Users manage own listening items" on public.user_listening_link_items
    using (exists (
        select 1 from public.user_listening_links l
        where l.id = link_id and l.user_id = auth.uid()
    ))
    with check (exists (
        select 1 from public.user_listening_links l
        where l.id = link_id and l.user_id = auth.uid()
    ));

drop policy if exists "Users manage own listening invites" on public.user_listening_invites;
create policy "Users manage own listening invites" on public.user_listening_invites
    using (exists (
        select 1 from public.user_listening_links l
        where l.id = link_id and l.user_id = auth.uid()
    ))
    with check (exists (
        select 1 from public.user_listening_links l
        where l.id = link_id and l.user_id = auth.uid()
    ));

drop policy if exists "Users read own listening sessions" on public.user_listening_sessions;
create policy "Users read own listening sessions" on public.user_listening_sessions
    using (exists (
        select 1 from public.user_listening_links l
        where l.id = link_id and l.user_id = auth.uid()
    ))
    with check (exists (
        select 1 from public.user_listening_links l
        where l.id = link_id and l.user_id = auth.uid()
    ));

drop policy if exists "Users read own listening plays" on public.user_listening_plays;
create policy "Users read own listening plays" on public.user_listening_plays
    using (exists (
        select 1
        from public.user_listening_sessions s
        join public.user_listening_links l on l.id = s.link_id
        where s.id = session_id and l.user_id = auth.uid()
    ))
    with check (exists (
        select 1
        from public.user_listening_sessions s
        join public.user_listening_links l on l.id = s.link_id
        where s.id = session_id and l.user_id = auth.uid()
    ));

-- Agrégation atomique d'un heartbeat. Un read-modify-write applicatif
-- perdrait des incréments quand deux requêtes se croisent.
create or replace function public.listening_record_event(
    p_session_id uuid,
    p_item_id uuid,
    p_kind text,
    p_listened_ms_delta integer default 0,
    p_position_ms integer default 0,
    p_completed boolean default false
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.user_listening_plays as p (
        session_id, item_id, listened_ms, max_position_ms,
        play_count, completed, downloaded, updated_at
    )
    values (
        p_session_id, p_item_id, greatest(p_listened_ms_delta, 0), greatest(p_position_ms, 0),
        case when p_kind = 'play' then 1 else 0 end,
        p_completed,
        p_kind = 'download',
        now()
    )
    on conflict (session_id, item_id) do update set
        listened_ms = p.listened_ms + greatest(p_listened_ms_delta, 0),
        max_position_ms = greatest(p.max_position_ms, greatest(p_position_ms, 0)),
        play_count = p.play_count + case when p_kind = 'play' then 1 else 0 end,
        completed = p.completed or p_completed,
        downloaded = p.downloaded or (p_kind = 'download'),
        updated_at = now();

    update public.user_listening_sessions
        set last_seen_at = now()
        where id = p_session_id;
end;
$$;

grant all on table public.user_listening_links to anon, authenticated, service_role;
grant all on table public.user_listening_link_items to anon, authenticated, service_role;
grant all on table public.user_listening_invites to anon, authenticated, service_role;
grant all on table public.user_listening_sessions to anon, authenticated, service_role;
grant all on table public.user_listening_plays to anon, authenticated, service_role;
grant execute on function public.listening_record_event(uuid, uuid, text, integer, integer, boolean) to service_role;
```

- [ ] **Step 2: Appliquer la migration sur Supabase**

Coller le contenu du fichier dans le SQL Editor du projet Supabase et exécuter.

Attendu : `Success. No rows returned`. Puis vérifier dans Table Editor que les cinq tables `user_listening_*` existent et affichent le badge RLS activé.

- [ ] **Step 3: Vérifier la rejouabilité**

Réexécuter le même script une seconde fois dans le SQL Editor.

Attendu : `Success. No rows returned`, sans aucune erreur de type « already exists ». Si une erreur apparaît, corriger le fichier — un script non rejouable est un piège pour le prochain déploiement.

---

## Task 2: Étendre `TrackVersion` avec l'audio

**Files:**
- Modify: `src/lib/sidekick-store.ts:347-350`
- Modify: `.env.example`

- [ ] **Step 1: Étendre le type**

Remplacer l'interface `TrackVersion` :

```ts
export interface TrackVersion {
  id: string;
  label: string;
  /** Chemin dans le bucket `drive`. Absent = version sans fichier audio. */
  audioPath?: string;
  /** `upload` = fichier déposé depuis le catalogue, `drive` = fichier déjà rangé dans le Drive. */
  audioSource?: "upload" | "drive";
  /** Nom de fichier d'origine, affiché tel quel à l'artiste. */
  audioName?: string;
  durationMs?: number;
  sizeBytes?: number;
  /** ~400 valeurs entre 0 et 1, calculées dans le navigateur à l'ajout. */
  peaks?: number[];
}
```

Aucun mapper à toucher : `trackToRow` sérialise `t.versions ?? []` et `rowToTrack` relit la colonne `jsonb` telle quelle, donc les nouveaux champs transitent sans modification de `src/hooks/usePhonoData.ts`.

- [ ] **Step 2: Documenter le double usage du service role**

Dans `.env.example`, remplacer la ligne de commentaire au-dessus de `SUPABASE_SERVICE_ROLE_KEY` par :

```
# Côté serveur uniquement : route iCal publique, cron des rappels, et pages
# publiques de liens d'écoute (bypass RLS + secret HMAC des cookies d'accès).
```

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit`
Attendu : aucune erreur. Les champs étant tous optionnels, le code existant qui construit des `TrackVersion` reste valide.

---

## Task 3: Calcul des peaks de waveform

**Files:**
- Create: `src/lib/audio-peaks.ts`

- [ ] **Step 1: Écrire le module**

```ts
/**
 * Décodage d'un fichier audio dans le navigateur pour en extraire la durée et
 * une empreinte de forme d'onde.
 *
 * Tout se passe côté client : aucun transcodage ni traitement serveur n'est
 * nécessaire, et les peaks sont stockés une fois pour toutes avec la version
 * du titre. La page publique n'a donc jamais à télécharger l'audio pour
 * dessiner la waveform.
 */

/** Nombre de barres de la waveform. 400 suffit à un rendu lisible sur desktop. */
export const PEAKS_RESOLUTION = 400;

export interface AudioPeaksResult {
  peaks: number[];
  durationMs: number;
}

export async function computeAudioPeaks(file: File): Promise<AudioPeaksResult> {
  const arrayBuffer = await file.arrayBuffer();

  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioCtx) {
    throw new Error("Votre navigateur ne permet pas de lire ce fichier audio.");
  }

  const context = new AudioCtx();
  try {
    const buffer = await context.decodeAudioData(arrayBuffer);
    const channel = buffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channel.length / PEAKS_RESOLUTION));
    const peaks: number[] = [];

    for (let i = 0; i < PEAKS_RESOLUTION; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize; j++) {
        const value = Math.abs(channel[start + j] ?? 0);
        if (value > max) max = value;
      }
      peaks.push(max);
    }

    // Normalisation : un morceau mixé bas doit produire une waveform aussi
    // lisible qu'un master fort. On borne pour éviter la division par zéro
    // sur un fichier silencieux.
    const loudest = Math.max(...peaks, 0.0001);
    const normalized = peaks.map((p) => Number((p / loudest).toFixed(3)));

    return {
      peaks: normalized,
      durationMs: Math.round(buffer.duration * 1000),
    };
  } finally {
    await context.close();
  }
}

/** Formate une durée en `m:ss`, pour la tracklist et la barre de lecture. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0:00";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Attendu : aucune erreur.

---

## Task 4: Attacher un fichier audio à une version, dans le catalogue

**Files:**
- Modify: `src/modules/phono/components/CatalogPage.tsx`

Ce fichier est déjà volumineux. Ne pas le restructurer : ajouter le strict nécessaire, en suivant les conventions locales (composants de `src/components/ui/`, icônes `lucide-react`).

- [ ] **Step 1: Ajouter les imports**

```ts
import { computeAudioPeaks, formatDuration } from "@/lib/audio-peaks";
import { uploadDriveFileToPath } from "@/lib/drive-db";
import { createClient } from "@/lib/supabase";
import { Music, Upload, X } from "lucide-react";
```

- [ ] **Step 2: Ajouter l'état local du composant de formulaire de titre**

À placer avec les autres `useState` du formulaire de track :

```ts
const [audioBusyVersionId, setAudioBusyVersionId] = useState<string | null>(null);
const [audioError, setAudioError] = useState<string | null>(null);
```

- [ ] **Step 3: Ajouter le gestionnaire d'attachement**

```ts
async function handleAttachAudio(versionId: string, file: File) {
  setAudioError(null);
  setAudioBusyVersionId(versionId);
  try {
    // Les peaks d'abord : un fichier illisible par le navigateur est rejeté
    // avant d'avoir consommé du quota de stockage.
    const { peaks, durationMs } = await computeAudioPeaks(file);

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error("Session expirée, reconnectez-vous.");

    const { path } = await uploadDriveFileToPath(
      supabase,
      userId,
      file,
      "phono/audio"
    );

    setVersions((prev) =>
      prev.map((v) =>
        v.id === versionId
          ? {
              ...v,
              audioPath: path,
              audioSource: "upload" as const,
              audioName: file.name,
              durationMs,
              sizeBytes: file.size,
              peaks,
            }
          : v
      )
    );
  } catch (e) {
    setAudioError(e instanceof Error ? e.message : String(e));
  } finally {
    setAudioBusyVersionId(null);
  }
}

function handleDetachAudio(versionId: string) {
  // On retire seulement la référence : le fichier reste dans le Drive, où
  // l'artiste le supprimera s'il le souhaite. Supprimer ici casserait les
  // liens d'écoute qui l'ont déjà dénormalisé.
  setVersions((prev) =>
    prev.map((v) =>
      v.id === versionId
        ? {
            ...v,
            audioPath: undefined,
            audioSource: undefined,
            audioName: undefined,
            durationMs: undefined,
            sizeBytes: undefined,
            peaks: undefined,
          }
        : v
    )
  );
}
```

Adapter `setVersions` au nom réel du setter de la liste des versions dans ce formulaire, repéré au moment de l'implémentation.

- [ ] **Step 4: Ajouter l'UI sous chaque ligne de version**

Dans le rendu de la liste des versions, sous le champ de label :

```tsx
<div className="mt-2 flex items-center gap-2">
  {version.audioPath ? (
    <>
      <Music className="h-4 w-4 shrink-0" style={{ color: "#F0FF00" }} />
      <span className="truncate text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
        {version.audioName} · {formatDuration(version.durationMs ?? 0)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => handleDetachAudio(version.id)}
        aria-label="Retirer le fichier audio"
      >
        <X className="h-4 w-4" />
      </Button>
    </>
  ) : (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm"
           style={{ color: "rgba(245,245,245,0.7)" }}>
      <Upload className="h-4 w-4" />
      {audioBusyVersionId === version.id ? "Analyse du fichier…" : "Ajouter un fichier audio"}
      <input
        type="file"
        accept="audio/*"
        className="hidden"
        disabled={audioBusyVersionId !== null}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleAttachAudio(version.id, file);
          e.target.value = "";
        }}
      />
    </label>
  )}
</div>
```

Et sous la liste des versions, l'erreur éventuelle :

```tsx
{audioError && (
  <p className="mt-2 text-sm" style={{ color: "#ff6b6b" }}>{audioError}</p>
)}
```

- [ ] **Step 5: Vérifier**

Run: `npx tsc --noEmit && npm run lint`, puis `npm run dev`.

Manuel : ouvrir `/phono/catalogue`, éditer un titre, ajouter une version, y attacher un MP3. Attendu : le libellé passe à « Analyse du fichier… » puis affiche le nom et la durée réelle du fichier. Enregistrer, rouvrir le titre : le fichier est toujours rattaché. Vérifier dans Supabase Storage que le fichier est bien sous `drive/<userId>/phono/audio/`.

---

## Task 5: Types partagés du lien d'écoute

**Files:**
- Create: `src/lib/listening-types.ts`

- [ ] **Step 1: Écrire les types**

```ts
/**
 * Types partagés entre l'app (composeur, analytics) et la page publique.
 *
 * `snapshot` porte la copie de sécurité : la page publique n'interroge jamais
 * le catalogue, ce qui garantit qu'un titre modifié ou supprimé ne casse pas
 * une page déjà envoyée à un label.
 */

export interface ListeningItemSnapshot {
  title: string;
  mainArtist: string;
  guestArtists: string[];
  versionLabel?: string;
  isrc?: string;
  role?: string;
  label?: string;
  releaseDate?: string;
  genre?: string;
  cover?: string;
}

export type ListeningItemKind = "track" | "podcast";

export interface ListeningItem {
  id: string;
  position: number;
  /** Nom du projet quand l'item vient d'un album ajouté en bloc. */
  groupLabel?: string;
  kind: ListeningItemKind;
  sourceId: string;
  versionId?: string;
  snapshot: ListeningItemSnapshot;
  audioPath: string;
  durationMs: number;
  peaks: number[];
}

export interface ListeningLink {
  id: string;
  slug: string;
  title: string;
  introMessage: string;
  coverPath?: string;
  /** Jamais l'empreinte elle-même : seulement l'existence d'un mot de passe. */
  hasPassword: boolean;
  expiresAt?: string;
  allowDownload: boolean;
  presskitUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: ListeningItem[];
}

/** Charge utile envoyée à la page publique. Ne contient aucune URL audio. */
export interface PublicListeningLink {
  slug: string;
  title: string;
  introMessage: string;
  coverUrl?: string;
  artistName: string;
  requiresPassword: boolean;
  expiresAt?: string;
  allowDownload: boolean;
  presskitUrl?: string;
  items: Array<Omit<ListeningItem, "audioPath" | "sourceId" | "versionId">>;
}

export type LinkState = "ok" | "gone" | "expired" | "locked";

export interface ListeningPlayStat {
  itemId: string;
  listenedMs: number;
  maxPositionMs: number;
  playCount: number;
  completed: boolean;
  downloaded: boolean;
}

export interface ListeningSessionStat {
  id: string;
  visitorName?: string;
  createdAt: string;
  lastSeenAt: string;
  plays: ListeningPlayStat[];
}

export interface ListeningLinkStats {
  linkId: string;
  sessionCount: number;
  identifiedSessions: ListeningSessionStat[];
  anonymousSessionCount: number;
  /** Agrégat anonyme : itemId → millisecondes écoutées, tous visiteurs confondus. */
  anonymousListenedMsByItem: Record<string, number>;
  downloadCount: number;
  averageCompletion: number;
  lastPlayedAt?: string;
}

export interface ListeningInvite {
  id: string;
  linkId: string;
  contactId?: string;
  contactName: string;
  contactEmail: string;
  sentAt: string;
  firstOpenedAt?: string;
}
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit`
Attendu : aucune erreur.

---

## Task 6: CRUD côté artiste

**Files:**
- Create: `src/lib/listening-db.ts`

- [ ] **Step 1: Écrire le module**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ListeningItem,
  ListeningLink,
  ListeningLinkStats,
  ListeningPlayStat,
  ListeningSessionStat,
} from "@/lib/listening-types";

/**
 * Slug non devinable. 22 caractères base64url ≈ 128 bits d'entropie : le lien
 * ne peut pas être trouvé par balayage, ce qui est la première protection de
 * la page.
 */
export function generateListeningSlug(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function rowToItem(row: Record<string, unknown>): ListeningItem {
  return {
    id: row.id as string,
    position: (row.position as number) ?? 0,
    groupLabel: (row.group_label as string) ?? undefined,
    kind: (row.kind as ListeningItem["kind"]) ?? "track",
    sourceId: (row.source_id as string) ?? "",
    versionId: (row.version_id as string) ?? undefined,
    snapshot: (row.snapshot as ListeningItem["snapshot"]) ?? {
      title: "",
      mainArtist: "",
      guestArtists: [],
    },
    audioPath: (row.audio_path as string) ?? "",
    durationMs: (row.duration_ms as number) ?? 0,
    peaks: (row.peaks as number[]) ?? [],
  };
}

function rowToLink(row: Record<string, unknown>): ListeningLink {
  const items = ((row.user_listening_link_items as Record<string, unknown>[]) ?? [])
    .map(rowToItem)
    .sort((a, b) => a.position - b.position);

  return {
    id: row.id as string,
    slug: row.slug as string,
    title: (row.title as string) ?? "",
    introMessage: (row.intro_message as string) ?? "",
    coverPath: (row.cover_path as string) ?? undefined,
    // On n'expose jamais l'empreinte au client, seulement son existence.
    hasPassword: Boolean(row.password_hash),
    expiresAt: (row.expires_at as string) ?? undefined,
    allowDownload: Boolean(row.allow_download),
    presskitUrl: (row.presskit_url as string) ?? undefined,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    items,
  };
}

const LINK_SELECT =
  "id, slug, title, intro_message, cover_path, password_hash, expires_at, allow_download, presskit_url, is_active, created_at, updated_at, user_listening_link_items(*)";

export async function fetchListeningLinks(
  supabase: SupabaseClient,
  userId: string
): Promise<ListeningLink[]> {
  const { data, error } = await supabase
    .from("user_listening_links")
    .select(LINK_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToLink(row as Record<string, unknown>));
}

export interface ListeningLinkInput {
  title: string;
  introMessage: string;
  coverPath?: string;
  /** Mot de passe en clair. `null` retire la protection, `undefined` la laisse inchangée. */
  password?: string | null;
  expiresAt?: string | null;
  allowDownload: boolean;
  presskitUrl?: string | null;
  items: Array<Omit<ListeningItem, "id">>;
}

/**
 * Le hachage du mot de passe se fait côté serveur (`/api/listening/hash`
 * n'existe pas : on passe par la route d'écriture ci-dessous), car `scrypt`
 * n'est pas disponible dans le navigateur et un hachage client serait de
 * toute façon sans valeur.
 */
export async function createListeningLink(
  supabase: SupabaseClient,
  userId: string,
  input: ListeningLinkInput
): Promise<ListeningLink> {
  const slug = generateListeningSlug();
  const passwordHash = input.password
    ? await hashPasswordViaApi(input.password)
    : null;

  const { data: linkRow, error } = await supabase
    .from("user_listening_links")
    .insert({
      user_id: userId,
      slug,
      title: input.title,
      intro_message: input.introMessage,
      cover_path: input.coverPath ?? null,
      password_hash: passwordHash,
      expires_at: input.expiresAt ?? null,
      allow_download: input.allowDownload,
      presskit_url: input.presskitUrl ?? null,
      is_active: true,
    })
    .select(LINK_SELECT)
    .single();

  if (error) throw new Error(error.message);

  await replaceItems(supabase, linkRow.id as string, input.items);
  return (await fetchLinkById(supabase, linkRow.id as string))!;
}

export async function updateListeningLink(
  supabase: SupabaseClient,
  linkId: string,
  input: ListeningLinkInput
): Promise<ListeningLink> {
  const patch: Record<string, unknown> = {
    title: input.title,
    intro_message: input.introMessage,
    cover_path: input.coverPath ?? null,
    expires_at: input.expiresAt ?? null,
    allow_download: input.allowDownload,
    presskit_url: input.presskitUrl ?? null,
    updated_at: new Date().toISOString(),
  };

  // `undefined` = ne pas toucher au mot de passe existant ; `null` = le retirer.
  if (input.password === null) patch.password_hash = null;
  else if (typeof input.password === "string" && input.password.length > 0) {
    patch.password_hash = await hashPasswordViaApi(input.password);
  }

  const { error } = await supabase
    .from("user_listening_links")
    .update(patch)
    .eq("id", linkId);

  if (error) throw new Error(error.message);

  await replaceItems(supabase, linkId, input.items);
  return (await fetchLinkById(supabase, linkId))!;
}

async function replaceItems(
  supabase: SupabaseClient,
  linkId: string,
  items: Array<Omit<ListeningItem, "id">>
): Promise<void> {
  const { error: delError } = await supabase
    .from("user_listening_link_items")
    .delete()
    .eq("link_id", linkId);
  if (delError) throw new Error(delError.message);

  if (items.length === 0) return;

  const { error: insError } = await supabase
    .from("user_listening_link_items")
    .insert(
      items.map((item, index) => ({
        link_id: linkId,
        position: index,
        group_label: item.groupLabel ?? null,
        kind: item.kind,
        source_id: item.sourceId,
        version_id: item.versionId ?? null,
        snapshot: item.snapshot,
        audio_path: item.audioPath,
        duration_ms: item.durationMs,
        peaks: item.peaks,
      }))
    );
  if (insError) throw new Error(insError.message);
}

export async function fetchLinkById(
  supabase: SupabaseClient,
  linkId: string
): Promise<ListeningLink | null> {
  const { data, error } = await supabase
    .from("user_listening_links")
    .select(LINK_SELECT)
    .eq("id", linkId)
    .single();
  if (error) return null;
  return rowToLink(data as Record<string, unknown>);
}

export async function setListeningLinkActive(
  supabase: SupabaseClient,
  linkId: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from("user_listening_links")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", linkId);
  if (error) throw new Error(error.message);
}

/** Suppression définitive : la page devient introuvable et les stats tombent en cascade. */
export async function deleteListeningLink(
  supabase: SupabaseClient,
  linkId: string
): Promise<void> {
  const { error } = await supabase
    .from("user_listening_links")
    .delete()
    .eq("id", linkId);
  if (error) throw new Error(error.message);
}

export async function fetchListeningStats(
  supabase: SupabaseClient,
  linkId: string
): Promise<ListeningLinkStats> {
  const { data: sessions, error } = await supabase
    .from("user_listening_sessions")
    .select(
      "id, visitor_name, created_at, last_seen_at, user_listening_plays(item_id, listened_ms, max_position_ms, play_count, completed, downloaded)"
    )
    .eq("link_id", linkId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const identified: ListeningSessionStat[] = [];
  let anonymousSessionCount = 0;
  const anonymousListenedMsByItem: Record<string, number> = {};
  let downloadCount = 0;
  let completionSum = 0;
  let completionCount = 0;
  let lastPlayedAt: string | undefined;

  for (const raw of (sessions ?? []) as Record<string, unknown>[]) {
    const plays: ListeningPlayStat[] = (
      (raw.user_listening_plays as Record<string, unknown>[]) ?? []
    ).map((p) => ({
      itemId: p.item_id as string,
      listenedMs: (p.listened_ms as number) ?? 0,
      maxPositionMs: (p.max_position_ms as number) ?? 0,
      playCount: (p.play_count as number) ?? 0,
      completed: Boolean(p.completed),
      downloaded: Boolean(p.downloaded),
    }));

    for (const play of plays) {
      if (play.downloaded) downloadCount += 1;
      completionSum += play.completed ? 1 : 0;
      completionCount += 1;
    }

    const seenAt = raw.last_seen_at as string;
    if (!lastPlayedAt || seenAt > lastPlayedAt) lastPlayedAt = seenAt;

    const visitorName = (raw.visitor_name as string) ?? undefined;
    if (visitorName) {
      identified.push({
        id: raw.id as string,
        visitorName,
        createdAt: raw.created_at as string,
        lastSeenAt: seenAt,
        plays,
      });
    } else {
      anonymousSessionCount += 1;
      for (const play of plays) {
        anonymousListenedMsByItem[play.itemId] =
          (anonymousListenedMsByItem[play.itemId] ?? 0) + play.listenedMs;
      }
    }
  }

  return {
    linkId,
    sessionCount: (sessions ?? []).length,
    identifiedSessions: identified,
    anonymousSessionCount,
    anonymousListenedMsByItem,
    downloadCount,
    averageCompletion: completionCount > 0 ? completionSum / completionCount : 0,
    lastPlayedAt,
  };
}

async function hashPasswordViaApi(password: string): Promise<string> {
  const res = await fetch("/api/listening/hash-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error("Impossible de protéger le lien par mot de passe.");
  const json = (await res.json()) as { hash: string };
  return json.hash;
}
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Attendu : aucune erreur. La route `/api/listening/hash-password` n'existe pas encore — c'est un appel `fetch`, donc TypeScript ne s'en plaint pas ; elle est créée à la Task 7.

---

## Task 7: Helpers serveur et hachage du mot de passe

**Files:**
- Create: `src/lib/listening-public.ts`
- Create: `app/api/listening/hash-password/route.ts`

- [ ] **Step 1: Écrire les helpers serveur**

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { LinkState } from "@/lib/listening-types";

/**
 * Client service role : les pages publiques n'ont pas de session Supabase,
 * la RLS est donc contournée après validation du slug et de l'état du lien.
 * Même pattern que `app/api/calendar/ical/[token]/route.ts`.
 */
export function getServiceSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante.");
  }
  return createClient(url, key);
}

// ─── Mot de passe ───────────────────────────────────────────────────────────

/** Format stocké : `scrypt$<sel hex>$<empreinte hex>`. */
export function hashListeningPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyListeningPassword(
  password: string,
  stored: string
): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  // Comparaison à temps constant : une comparaison naïve laisserait fuiter
  // le mot de passe caractère par caractère.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ─── Cookie d'accès ─────────────────────────────────────────────────────────

/**
 * Le cookie ne contient aucun secret : c'est un HMAC du slug et de l'empreinte
 * du mot de passe. Changer le mot de passe invalide donc automatiquement tous
 * les cookies déjà distribués.
 */
function hmacSecret(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante.");
  return key;
}

export function accessCookieName(slug: string): string {
  return `listen_${slug.slice(0, 22)}`;
}

export function accessCookieValue(slug: string, passwordHash: string): string {
  return createHmac("sha256", hmacSecret())
    .update(`${slug}:${passwordHash}`)
    .digest("hex");
}

export function isAccessCookieValid(
  cookieValue: string | undefined,
  slug: string,
  passwordHash: string
): boolean {
  if (!cookieValue) return false;
  const expected = accessCookieValue(slug, passwordHash);
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ─── Résolution d'un lien ───────────────────────────────────────────────────

export interface LinkRow {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  intro_message: string;
  cover_path: string | null;
  password_hash: string | null;
  expires_at: string | null;
  allow_download: boolean;
  presskit_url: string | null;
  is_active: boolean;
}

export async function resolveLinkRow(
  supabase: SupabaseClient,
  slug: string
): Promise<LinkRow | null> {
  const { data, error } = await supabase
    .from("user_listening_links")
    .select(
      "id, user_id, slug, title, intro_message, cover_path, password_hash, expires_at, allow_download, presskit_url, is_active"
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as LinkRow;
}

/**
 * État d'un lien du point de vue du visiteur. `gone` couvre aussi bien le lien
 * supprimé que désactivé : la page publique ne distingue pas les deux, pour ne
 * rien révéler des intentions de l'artiste.
 */
export function linkState(row: LinkRow | null): LinkState {
  if (!row || !row.is_active) return "gone";
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return "expired";
  }
  return "ok";
}

/** Empreinte d'IP : distinguer des sessions sans conserver d'adresse en clair. */
export function hashIp(ip: string): string {
  return createHmac("sha256", hmacSecret()).update(ip).digest("hex").slice(0, 32);
}
```

- [ ] **Step 2: Écrire la route de hachage**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { hashListeningPassword } from "@/lib/listening-public";

/**
 * `scrypt` n'existe pas dans le navigateur, et hacher côté client n'aurait
 * aucune valeur de sécurité. Le composeur envoie donc le mot de passe en clair
 * sur HTTPS et reçoit l'empreinte à stocker.
 *
 * Route réservée aux utilisateurs authentifiés : sans cela, elle offrirait un
 * oracle de calcul scrypt gratuit à n'importe qui.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = (await req.json()) as { password?: string };
  const password = body.password?.trim();
  if (!password || password.length < 4) {
    return NextResponse.json(
      { error: "Mot de passe trop court (4 caractères minimum)." },
      { status: 400 }
    );
  }

  return NextResponse.json({ hash: hashListeningPassword(password) });
}
```

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Attendu : aucune erreur.

---

## Task 8: Hook `useListeningData`

**Files:**
- Create: `src/hooks/useListeningData.ts`

Suivre le pattern SWR des autres hooks du dépôt (`usePhonoData.ts`) : clé stable, `mutate` optimiste, rollback en cas d'erreur.

- [ ] **Step 1: Écrire le hook**

```ts
"use client";

import { useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase";
import {
  createListeningLink,
  deleteListeningLink,
  fetchListeningLinks,
  fetchListeningStats,
  setListeningLinkActive,
  updateListeningLink,
  type ListeningLinkInput,
} from "@/lib/listening-db";
import type { ListeningLink, ListeningLinkStats } from "@/lib/listening-types";

const KEY = "user_listening_links";

async function fetcher(): Promise<ListeningLink[]> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  return fetchListeningLinks(supabase, auth.user.id);
}

export function useListeningData() {
  const { data, error, isLoading } = useSWR<ListeningLink[]>(KEY, fetcher, {
    revalidateOnFocus: false,
  });

  const links = data ?? [];

  const createLink = useCallback(async (input: ListeningLinkInput) => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Session expirée, reconnectez-vous.");
    const created = await createListeningLink(supabase, auth.user.id, input);
    await mutate(KEY);
    return created;
  }, []);

  const updateLink = useCallback(
    async (linkId: string, input: ListeningLinkInput) => {
      const supabase = createClient();
      const updated = await updateListeningLink(supabase, linkId, input);
      await mutate(KEY);
      return updated;
    },
    []
  );

  // Le kill switch doit paraître instantané : c'est un geste de panique.
  const toggleActive = useCallback(
    async (linkId: string, isActive: boolean) => {
      const snapshot = data ?? [];
      await mutate(
        KEY,
        snapshot.map((l) => (l.id === linkId ? { ...l, isActive } : l)),
        false
      );
      try {
        await setListeningLinkActive(createClient(), linkId, isActive);
        await mutate(KEY);
      } catch (e) {
        await mutate(KEY, snapshot, false);
        throw e;
      }
    },
    [data]
  );

  const removeLink = useCallback(
    async (linkId: string) => {
      const snapshot = data ?? [];
      await mutate(KEY, snapshot.filter((l) => l.id !== linkId), false);
      try {
        await deleteListeningLink(createClient(), linkId);
        await mutate(KEY);
      } catch (e) {
        await mutate(KEY, snapshot, false);
        throw e;
      }
    },
    [data]
  );

  const loadStats = useCallback(
    async (linkId: string): Promise<ListeningLinkStats> =>
      fetchListeningStats(createClient(), linkId),
    []
  );

  return { links, isLoading, error, createLink, updateLink, toggleActive, removeLink, loadStats };
}
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Attendu : aucune erreur.

---

## Task 9: Routes API publiques

**Files:**
- Create: `app/api/listening/[slug]/route.ts`
- Create: `app/api/listening/[slug]/unlock/route.ts`
- Create: `app/api/listening/[slug]/session/route.ts`
- Create: `app/api/listening/[slug]/audio/[itemId]/route.ts`
- Create: `app/api/listening/[slug]/event/route.ts`
- Create: `app/api/listening/[slug]/download/[itemId]/route.ts`

- [ ] **Step 1: Métadonnées publiques**

`app/api/listening/[slug]/route.ts` :

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  accessCookieName,
  getServiceSupabase,
  isAccessCookieValid,
  linkState,
  resolveLinkRow,
} from "@/lib/listening-public";
import type { PublicListeningLink } from "@/lib/listening-types";
import { DRIVE_BUCKET } from "@/lib/drive-db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = getServiceSupabase();
  const row = await resolveLinkRow(supabase, slug);
  const state = linkState(row);

  // Lien mort : on ne renvoie jamais la tracklist, même partiellement.
  if (state !== "ok" || !row) {
    return NextResponse.json({ state }, { status: 200 });
  }

  if (row.password_hash) {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(accessCookieName(slug))?.value;
    if (!isAccessCookieValid(cookie, slug, row.password_hash)) {
      return NextResponse.json(
        { state: "locked" as const, title: row.title },
        { status: 200 }
      );
    }
  }

  const { data: items } = await supabase
    .from("user_listening_link_items")
    .select("id, position, group_label, kind, snapshot, duration_ms, peaks")
    .eq("link_id", row.id)
    .order("position", { ascending: true });

  // `user_presskit_profile` ne porte pas de colonne `artist_name` : le nom
  // affiché est `artist_title`, avec `streaming_artist_name` en repli.
  const { data: profile } = await supabase
    .from("user_presskit_profile")
    .select("artist_title, streaming_artist_name")
    .eq("user_id", row.user_id)
    .maybeSingle();

  let coverUrl: string | undefined;
  if (row.cover_path) {
    const { data } = supabase.storage
      .from(DRIVE_BUCKET)
      .getPublicUrl(row.cover_path);
    coverUrl = data.publicUrl;
  }

  const payload: PublicListeningLink = {
    slug,
    title: row.title,
    introMessage: row.intro_message,
    coverUrl,
    artistName:
      (() => {
        const p = profile as
          | { artist_title?: string; streaming_artist_name?: string }
          | null;
        return (
          (p?.artist_title ?? "").trim() ||
          (p?.streaming_artist_name ?? "").trim() ||
          "Artiste"
        );
      })(),
    requiresPassword: Boolean(row.password_hash),
    expiresAt: row.expires_at ?? undefined,
    allowDownload: row.allow_download,
    presskitUrl: row.presskit_url ?? undefined,
    // Aucune URL audio ici : elles sont demandées une par une au moment du play.
    items: (items ?? []).map((i) => {
      const r = i as Record<string, unknown>;
      return {
        id: r.id as string,
        position: (r.position as number) ?? 0,
        groupLabel: (r.group_label as string) ?? undefined,
        kind: (r.kind as "track" | "podcast") ?? "track",
        snapshot: r.snapshot as PublicListeningLink["items"][number]["snapshot"],
        durationMs: (r.duration_ms as number) ?? 0,
        peaks: (r.peaks as number[]) ?? [],
      };
    }),
  };

  return NextResponse.json({ state: "ok" as const, link: payload });
}
```

Colonnes vérifiées dans `supabase/migrations/00000000000000_baseline.sql:866-884`.

- [ ] **Step 2: Déverrouillage par mot de passe**

`app/api/listening/[slug]/unlock/route.ts` :

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  accessCookieName,
  accessCookieValue,
  getServiceSupabase,
  linkState,
  resolveLinkRow,
  verifyListeningPassword,
} from "@/lib/listening-public";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = (await req.json()) as { password?: string };
  const supabase = getServiceSupabase();
  const row = await resolveLinkRow(supabase, slug);

  if (linkState(row) !== "ok" || !row?.password_hash) {
    return NextResponse.json({ error: "Lien indisponible." }, { status: 404 });
  }

  if (!body.password || !verifyListeningPassword(body.password, row.password_hash)) {
    return NextResponse.json({ error: "Code incorrect." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: accessCookieName(slug),
    value: accessCookieValue(slug, row.password_hash),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // Portée limitée à cette page : déverrouiller un lien n'en déverrouille
    // aucun autre.
    path: `/ecoute/${slug}`,
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
```

Le cookie étant scopé à `/ecoute/<slug>`, il n'est pas transmis aux routes `/api/listening/...`. Les routes qui doivent le vérifier le reçoivent explicitement du client dans le corps de la requête sous la forme du jeton renvoyé par `unlock`. Pour éviter cette complication, **la route `unlock` pose deux cookies** : celui ci-dessus pour la page, et le même valeur/nom sur `path: "/api/listening/" + slug`. Ajouter donc immédiatement après le premier `res.cookies.set` :

```ts
  res.cookies.set({
    name: accessCookieName(slug),
    value: accessCookieValue(slug, row.password_hash),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/api/listening/${slug}`,
    maxAge: 60 * 60 * 24 * 30,
  });
```

- [ ] **Step 3: Création de session**

`app/api/listening/[slug]/session/route.ts` :

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  getServiceSupabase,
  hashIp,
  linkState,
  resolveLinkRow,
} from "@/lib/listening-public";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = (await req.json()) as { visitorName?: string; inviteId?: string };
  const supabase = getServiceSupabase();
  const row = await resolveLinkRow(supabase, slug);

  if (linkState(row) !== "ok" || !row) {
    return NextResponse.json({ error: "Lien indisponible." }, { status: 404 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const visitorName = body.visitorName?.trim();

  const { data, error } = await supabase
    .from("user_listening_sessions")
    .insert({
      link_id: row.id,
      invite_id: body.inviteId ?? null,
      // Chaîne vide traitée comme une écoute anonyme assumée.
      visitor_name: visitorName && visitorName.length > 0 ? visitorName : null,
      user_agent: req.headers.get("user-agent") ?? "",
      ip_hash: hashIp(ip),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Première ouverture de l'invitation : c'est ce qui éteint la règle de relance.
  if (body.inviteId) {
    await supabase
      .from("user_listening_invites")
      .update({ first_opened_at: new Date().toISOString() })
      .eq("id", body.inviteId)
      .is("first_opened_at", null);
  }

  return NextResponse.json({ sessionId: data.id as string });
}
```

- [ ] **Step 4: URL audio signée**

`app/api/listening/[slug]/audio/[itemId]/route.ts` :

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DRIVE_BUCKET } from "@/lib/drive-db";
import {
  accessCookieName,
  getServiceSupabase,
  isAccessCookieValid,
  linkState,
  resolveLinkRow,
} from "@/lib/listening-public";

/** 5 minutes : une URL interceptée et repartagée est morte avant d'arriver. */
const SIGNED_URL_TTL_SECONDS = 300;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; itemId: string }> }
) {
  const { slug, itemId } = await params;
  const supabase = getServiceSupabase();
  const row = await resolveLinkRow(supabase, slug);

  // Revérification à chaque lecture : un lien expiré ou coupé pendant la
  // session cesse immédiatement de servir de l'audio.
  if (linkState(row) !== "ok" || !row) {
    return NextResponse.json({ error: "Lien indisponible." }, { status: 404 });
  }

  if (row.password_hash) {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(accessCookieName(slug))?.value;
    if (!isAccessCookieValid(cookie, slug, row.password_hash)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
    }
  }

  const { data: item } = await supabase
    .from("user_listening_link_items")
    .select("audio_path")
    .eq("id", itemId)
    .eq("link_id", row.id)
    .maybeSingle();

  const audioPath = (item as { audio_path?: string } | null)?.audio_path;
  if (!audioPath) {
    return NextResponse.json({ error: "Titre introuvable." }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from(DRIVE_BUCKET)
    .createSignedUrl(audioPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    return NextResponse.json({ error: "Fichier indisponible." }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS });
}
```

- [ ] **Step 5: Heartbeat**

`app/api/listening/[slug]/event/route.ts` :

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase, linkState, resolveLinkRow } from "@/lib/listening-public";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = (await req.json()) as {
    sessionId?: string;
    itemId?: string;
    kind?: "play" | "progress" | "download";
    listenedMsDelta?: number;
    positionMs?: number;
    completed?: boolean;
  };

  if (!body.sessionId || !body.itemId || !body.kind) {
    return NextResponse.json({ error: "Requête incomplète." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const row = await resolveLinkRow(supabase, slug);
  if (linkState(row) !== "ok" || !row) {
    return NextResponse.json({ error: "Lien indisponible." }, { status: 404 });
  }

  // La session doit appartenir à ce lien : sans cette vérification, un
  // identifiant de session suffirait à écrire des statistiques ailleurs.
  const { data: session } = await supabase
    .from("user_listening_sessions")
    .select("id")
    .eq("id", body.sessionId)
    .eq("link_id", row.id)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "Session inconnue." }, { status: 404 });
  }

  const { error } = await supabase.rpc("listening_record_event", {
    p_session_id: body.sessionId,
    p_item_id: body.itemId,
    p_kind: body.kind,
    p_listened_ms_delta: Math.max(0, Math.round(body.listenedMsDelta ?? 0)),
    p_position_ms: Math.max(0, Math.round(body.positionMs ?? 0)),
    p_completed: Boolean(body.completed),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Téléchargement**

`app/api/listening/[slug]/download/[itemId]/route.ts` :

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DRIVE_BUCKET } from "@/lib/drive-db";
import {
  accessCookieName,
  getServiceSupabase,
  isAccessCookieValid,
  linkState,
  resolveLinkRow,
} from "@/lib/listening-public";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; itemId: string }> }
) {
  const { slug, itemId } = await params;
  const supabase = getServiceSupabase();
  const row = await resolveLinkRow(supabase, slug);

  if (linkState(row) !== "ok" || !row) {
    return NextResponse.json({ error: "Lien indisponible." }, { status: 404 });
  }

  // Le contrôle est ici, jamais côté client : masquer le bouton ne protège rien.
  if (!row.allow_download) {
    return NextResponse.json({ error: "Téléchargement désactivé." }, { status: 403 });
  }

  if (row.password_hash) {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(accessCookieName(slug))?.value;
    if (!isAccessCookieValid(cookie, slug, row.password_hash)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
    }
  }

  const { data: item } = await supabase
    .from("user_listening_link_items")
    .select("audio_path, snapshot")
    .eq("id", itemId)
    .eq("link_id", row.id)
    .maybeSingle();

  const audioPath = (item as { audio_path?: string } | null)?.audio_path;
  if (!audioPath) {
    return NextResponse.json({ error: "Titre introuvable." }, { status: 404 });
  }

  const title =
    ((item as { snapshot?: { title?: string } } | null)?.snapshot?.title ?? "titre")
      .replace(/[^a-zA-Z0-9._-]/g, "-");
  const extension = audioPath.includes(".") ? audioPath.slice(audioPath.lastIndexOf(".")) : "";

  const { data, error } = await supabase.storage
    .from(DRIVE_BUCKET)
    .createSignedUrl(audioPath, 60, { download: `${title}${extension}` });

  if (error || !data) {
    return NextResponse.json({ error: "Fichier indisponible." }, { status: 500 });
  }

  const sessionId = req.nextUrl.searchParams.get("session");
  if (sessionId) {
    await supabase.rpc("listening_record_event", {
      p_session_id: sessionId,
      p_item_id: itemId,
      p_kind: "download",
      p_listened_ms_delta: 0,
      p_position_ms: 0,
      p_completed: false,
    });
  }

  return NextResponse.redirect(data.signedUrl);
}
```

- [ ] **Step 7: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Attendu : aucune erreur.

Manuel (après la Task 11, quand un lien existera) : `curl -s http://localhost:3000/api/listening/<slug> | head -c 400`.
Attendu : un JSON `{"state":"ok","link":{...}}` **ne contenant aucune occurrence de `audio_path` ni d'URL de fichier**. Vérifier ce point explicitement — c'est l'invariant de sécurité central de la fonctionnalité.

---

## Task 10: Waveform

**Files:**
- Create: `src/modules/phono/components/listening/Waveform.tsx`

- [ ] **Step 1: Écrire le composant**

```tsx
"use client";

interface WaveformProps {
  peaks: number[];
  /** Progression de lecture entre 0 et 1. */
  progress: number;
  /** Appelé avec une position entre 0 et 1 quand le visiteur clique. */
  onSeek: (ratio: number) => void;
  height?: number;
}

/**
 * Rendu SVG des peaks pré-calculés. Aucun décodage audio ici : la forme d'onde
 * est disponible instantanément, avant même que le fichier ne soit chargé.
 */
export function Waveform({ peaks, progress, onSeek, height = 56 }: WaveformProps) {
  const count = peaks.length || 1;
  const played = Math.round(progress * count);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.min(1, Math.max(0, ratio)));
  }

  return (
    <div
      className="w-full cursor-pointer select-none"
      onClick={handleClick}
      role="slider"
      aria-label="Position de lecture"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onSeek(Math.min(1, progress + 0.05));
        if (e.key === "ArrowLeft") onSeek(Math.max(0, progress - 0.05));
      }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${count} 100`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {peaks.map((peak, i) => {
          // Hauteur minimale de 4 : un passage silencieux doit rester visible
          // comme partie du morceau, pas comme un trou dans le tracé.
          const barHeight = Math.max(4, peak * 100);
          return (
            <rect
              key={i}
              x={i}
              y={(100 - barHeight) / 2}
              width={0.7}
              height={barHeight}
              fill={i <= played ? "#F0FF00" : "rgba(245,245,245,0.25)"}
            />
          );
        })}
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Attendu : aucune erreur.

---

## Task 11: Suivi d'écoute côté client

**Files:**
- Create: `src/modules/phono/components/listening/useListeningTracker.ts`

- [ ] **Step 1: Écrire le hook**

```ts
"use client";

import { useCallback, useEffect, useRef } from "react";

/** Un heartbeat toutes les 10 s : assez fin pour un taux d'écoute juste, assez rare pour rester discret. */
const HEARTBEAT_MS = 10_000;

interface TrackerOptions {
  slug: string;
  sessionId: string | null;
}

/**
 * Accumule le temps réellement écouté et le pousse par paquets.
 *
 * On mesure le temps de lecture, pas le temps passé sur la page : un onglet
 * ouvert et en pause ne doit pas gonfler le taux d'écoute rapporté à l'artiste.
 */
export function useListeningTracker({ slug, sessionId }: TrackerOptions) {
  const pendingMs = useRef(0);
  const currentItem = useRef<string | null>(null);
  const lastPosition = useRef(0);

  const send = useCallback(
    async (
      itemId: string,
      kind: "play" | "progress",
      listenedMsDelta: number,
      positionMs: number,
      completed: boolean
    ) => {
      if (!sessionId) return;
      try {
        await fetch(`/api/listening/${slug}/event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            itemId,
            kind,
            listenedMsDelta,
            positionMs,
            completed,
          }),
        });
      } catch {
        // Un heartbeat perdu ne doit jamais interrompre l'écoute.
      }
    },
    [sessionId, slug]
  );

  const flush = useCallback(
    (completed = false) => {
      const itemId = currentItem.current;
      if (!itemId || pendingMs.current <= 0) return;
      const delta = pendingMs.current;
      pendingMs.current = 0;
      void send(itemId, "progress", delta, lastPosition.current, completed);
    },
    [send]
  );

  const onPlay = useCallback(
    (itemId: string) => {
      flush();
      currentItem.current = itemId;
      pendingMs.current = 0;
      void send(itemId, "play", 0, 0, false);
    },
    [flush, send]
  );

  /** Appelé sur `timeupdate` : accumule le temps écoulé depuis le dernier appel. */
  const onProgress = useCallback((itemId: string, positionMs: number, deltaMs: number) => {
    currentItem.current = itemId;
    lastPosition.current = positionMs;
    if (deltaMs > 0 && deltaMs < 2000) pendingMs.current += deltaMs;
  }, []);

  const onEnded = useCallback(() => flush(true), [flush]);

  useEffect(() => {
    const timer = setInterval(() => flush(), HEARTBEAT_MS);
    // Le départ du visiteur est le moment le plus important à capturer :
    // sans cela, la dernière tranche d'écoute serait systématiquement perdue.
    const onHide = () => flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      flush();
    };
  }, [flush]);

  return { onPlay, onProgress, onEnded, flush };
}
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Attendu : aucune erreur.

---

## Task 12: Portes de la page publique

**Files:**
- Create: `src/modules/phono/components/listening/PasswordGate.tsx`
- Create: `src/modules/phono/components/listening/IdentityGate.tsx`

- [ ] **Step 1: Porte mot de passe**

```tsx
"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PasswordGateProps {
  slug: string;
  title: string;
  onUnlocked: () => void;
}

export function PasswordGate({ slug, title, onUnlocked }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/listening/${slug}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Code incorrect.");
        return;
      }
      onUnlocked();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <Lock className="h-6 w-6" style={{ color: "#F0FF00" }} />
        <h1 className="text-xl font-medium">{title || "Écoute privée"}</h1>
        <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
          Cette page est protégée par un code, transmis avec le lien.
        </p>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Code d'accès"
          autoFocus
        />
        {error && <p className="text-sm" style={{ color: "#ff6b6b" }}>{error}</p>}
        <Button type="submit" disabled={busy || password.length === 0} className="w-full">
          {busy ? "Vérification…" : "Accéder à l'écoute"}
        </Button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Porte d'identification**

Le champ est pré-rempli depuis l'invitation quand le lien vient d'un envoi mail. Le passage sans identification est un vrai bouton lisible, jamais un lien caché : la spec impose que cette porte ne soit jamais bloquante.

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface IdentityGateProps {
  title: string;
  artistName: string;
  prefilledName: string;
  onSubmit: (visitorName: string | null) => void;
}

export function IdentityGate({
  title,
  artistName,
  prefilledName,
  onSubmit,
}: IdentityGateProps) {
  const [name, setName] = useState(prefilledName);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <p className="text-sm uppercase tracking-wide" style={{ color: "rgba(245,245,245,0.7)" }}>
          {artistName}
        </p>
        <h1 className="text-xl font-medium">{title || "Écoute privée"}</h1>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Votre nom ou votre structure"
          autoFocus
        />
        <p className="text-xs leading-relaxed" style={{ color: "rgba(245,245,245,0.7)" }}>
          Votre nom permet à l&apos;artiste de savoir qui a écouté. L&apos;écoute des
          titres est mesurée dans tous les cas, de façon anonyme si vous ne vous
          identifiez pas.
        </p>
        <Button
          className="w-full"
          onClick={() => onSubmit(name.trim().length > 0 ? name.trim() : null)}
        >
          Accéder à l&apos;écoute
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => onSubmit(null)}>
          Écouter sans m&apos;identifier
        </Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Attendu : aucune erreur.

---

## Task 13: Player public

**Files:**
- Create: `src/modules/phono/components/listening/ListeningPlayer.tsx`

- [ ] **Step 1: Écrire le composant**

Un seul élément `<audio>` pour toute la session, réutilisé d'un titre à l'autre. L'URL est demandée au moment du play et n'apparaît jamais dans le DOM initial.

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Download, Lock, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/audio-peaks";
import type { PublicListeningLink } from "@/lib/listening-types";
import { Waveform } from "./Waveform";
import { useListeningTracker } from "./useListeningTracker";

interface ListeningPlayerProps {
  link: PublicListeningLink;
  sessionId: string | null;
}

export function ListeningPlayer({ link, sessionId }: ListeningPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastTimeRef = useRef(0);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [openCredits, setOpenCredits] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tracker = useListeningTracker({ slug: link.slug, sessionId });

  const current = link.items.find((i) => i.id === currentId) ?? null;

  const playItem = useCallback(
    async (itemId: string) => {
      setError(null);
      const audio = audioRef.current;
      if (!audio) return;
      try {
        const res = await fetch(`/api/listening/${link.slug}/audio/${itemId}`, {
          method: "POST",
        });
        if (!res.ok) {
          setError("Ce titre n'est plus disponible.");
          return;
        }
        const { url } = (await res.json()) as { url: string };
        audio.src = url;
        lastTimeRef.current = 0;
        setPositionMs(0);
        setCurrentId(itemId);
        await audio.play();
        setIsPlaying(true);
        tracker.onPlay(itemId);
      } catch {
        setError("Lecture impossible.");
      }
    },
    [link.slug, tracker]
  );

  const toggle = useCallback(
    (itemId: string) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (currentId === itemId) {
        if (audio.paused) {
          void audio.play();
          setIsPlaying(true);
        } else {
          audio.pause();
          setIsPlaying(false);
          tracker.flush();
        }
        return;
      }
      void playItem(itemId);
    },
    [currentId, playItem, tracker]
  );

  // Lecture continue : le pro enchaîne la sélection sans intervenir.
  const playNext = useCallback(() => {
    if (!currentId) return;
    const index = link.items.findIndex((i) => i.id === currentId);
    const next = link.items[index + 1];
    tracker.onEnded();
    if (next) void playItem(next.id);
    else setIsPlaying(false);
  }, [currentId, link.items, playItem, tracker]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function onTimeUpdate() {
      if (!audio || !currentId) return;
      const now = audio.currentTime * 1000;
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      setPositionMs(now);
      tracker.onProgress(currentId, now, delta);
    }

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", playNext);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", playNext);
    };
  }, [currentId, playNext, tracker]);

  function seek(ratio: number) {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.currentTime = (ratio * current.durationMs) / 1000;
    lastTimeRef.current = audio.currentTime * 1000;
  }

  // Les items d'un même projet se suivent : on regroupe sans réordonner.
  const groups: Array<{ label: string | null; items: typeof link.items }> = [];
  for (const item of link.items) {
    const label = item.groupLabel ?? null;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  return (
    <div className="pb-28">
      <audio ref={audioRef} preload="none" />

      <header className="mb-8 flex items-start gap-4">
        {link.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={link.coverUrl}
            alt=""
            className="h-24 w-24 rounded-lg object-cover"
          />
        )}
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-wide" style={{ color: "rgba(245,245,245,0.7)" }}>
            {link.artistName}
          </p>
          <h1 className="text-2xl font-medium">{link.title}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: "rgba(245,245,245,0.7)" }}>
            <Lock className="h-3.5 w-3.5" />
            <span>
              <strong>Écoute privée</strong> — titres non publiés, merci de ne pas
              rediffuser ce lien.
            </span>
          </p>
          {link.expiresAt && (
            <p className="mt-1 text-xs" style={{ color: "rgba(245,245,245,0.7)" }}>
              Ce lien expire le{" "}
              {new Date(link.expiresAt).toLocaleDateString("fr-FR")}.
            </p>
          )}
          {link.introMessage && (
            <p className="mt-3 whitespace-pre-line text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
              {link.introMessage}
            </p>
          )}
        </div>
      </header>

      {error && <p className="mb-4 text-sm" style={{ color: "#ff6b6b" }}>{error}</p>}

      {groups.map((group, gi) => (
        <section key={gi} className="mb-6">
          {group.label && (
            <h2 className="mb-2 text-sm uppercase tracking-wide" style={{ color: "rgba(245,245,245,0.7)" }}>
              {group.label}
            </h2>
          )}
          <ul className="divide-y" style={{ borderColor: "rgba(245,245,245,0.12)" }}>
            {group.items.map((item, index) => {
              const isCurrent = item.id === currentId;
              return (
                <li key={item.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggle(item.id)}
                      aria-label={isCurrent && isPlaying ? "Pause" : `Lire ${item.snapshot.title}`}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <span className="w-6 text-sm tabular-nums" style={{ color: "rgba(245,245,245,0.7)" }}>
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{item.snapshot.title}</p>
                      {item.snapshot.guestArtists.length > 0 && (
                        <p className="truncate text-xs" style={{ color: "rgba(245,245,245,0.7)" }}>
                          feat. {item.snapshot.guestArtists.join(", ")}
                        </p>
                      )}
                    </div>
                    {item.snapshot.versionLabel && (
                      <span
                        className="rounded px-2 py-0.5 text-xs"
                        style={{
                          border: "1px solid rgba(245,245,245,0.12)",
                          color: "rgba(245,245,245,0.7)",
                        }}
                      >
                        {item.snapshot.versionLabel}
                      </span>
                    )}
                    <span className="text-sm tabular-nums" style={{ color: "rgba(245,245,245,0.7)" }}>
                      {formatDuration(item.durationMs)}
                    </span>
                    {link.allowDownload && (
                      <a
                        href={`/api/listening/${link.slug}/download/${item.id}${sessionId ? `?session=${sessionId}` : ""}`}
                        aria-label={`Télécharger ${item.snapshot.title}`}
                      >
                        <Download className="h-4 w-4" style={{ color: "rgba(245,245,245,0.7)" }} />
                      </a>
                    )}
                  </div>

                  {isCurrent && (
                    <div className="mt-3 pl-12">
                      <Waveform
                        peaks={item.peaks}
                        progress={item.durationMs > 0 ? positionMs / item.durationMs : 0}
                        onSeek={seek}
                      />
                      <button
                        type="button"
                        className="mt-2 flex items-center gap-1 text-xs"
                        style={{ color: "rgba(245,245,245,0.7)" }}
                        onClick={() =>
                          setOpenCredits(openCredits === item.id ? null : item.id)
                        }
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                        Crédits
                      </button>
                      {openCredits === item.id && (
                        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs"
                            style={{ color: "rgba(245,245,245,0.7)" }}>
                          {item.snapshot.isrc && (<><dt>ISRC</dt><dd>{item.snapshot.isrc}</dd></>)}
                          {item.snapshot.role && (<><dt>Rôle</dt><dd>{item.snapshot.role}</dd></>)}
                          {item.snapshot.label && (<><dt>Label</dt><dd>{item.snapshot.label}</dd></>)}
                          {item.snapshot.releaseDate && (<><dt>Sortie</dt><dd>{item.snapshot.releaseDate}</dd></>)}
                          {item.snapshot.genre && (<><dt>Genre</dt><dd>{item.snapshot.genre}</dd></>)}
                        </dl>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {link.presskitUrl && (
        <footer className="mt-10 border-t pt-6" style={{ borderColor: "rgba(245,245,245,0.12)" }}>
          <a href={link.presskitUrl} className="text-sm underline" style={{ color: "#F0FF00" }}>
            Voir le presskit
          </a>
        </footer>
      )}

      {current && (
        <div
          className="fixed inset-x-0 bottom-0 border-t p-3 backdrop-blur-xl"
          style={{
            borderColor: "rgba(245,245,245,0.12)",
            background: "rgba(44,44,46,0.72)",
          }}
        >
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => toggle(current.id)}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <span className="min-w-0 flex-1 truncate text-sm">{current.snapshot.title}</span>
            <span className="text-sm tabular-nums" style={{ color: "rgba(245,245,245,0.7)" }}>
              {formatDuration(positionMs)} / {formatDuration(current.durationMs)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Barre de lecture plein écran sur mobile**

La spec impose qu'un tap sur la barre l'ouvre en plein écran : un programmateur qui écoute dans le train doit pouvoir scruber sans viser une zone de 3 mm.

Ajouter l'état, avec les autres `useState` :

```ts
  const [barExpanded, setBarExpanded] = useState(false);
```

Puis remplacer le bloc de la barre ancrée (`{current && (...)}`) par :

```tsx
      {current && (
        <div
          className={
            barExpanded
              ? "fixed inset-0 z-50 flex flex-col justify-center gap-6 p-6 backdrop-blur-xl md:inset-x-0 md:inset-y-auto md:bottom-0 md:block md:p-3"
              : "fixed inset-x-0 bottom-0 border-t p-3 backdrop-blur-xl"
          }
          style={{
            borderColor: "rgba(245,245,245,0.12)",
            background: barExpanded ? "#101010" : "rgba(44,44,46,0.72)",
          }}
        >
          {barExpanded && (
            <button
              type="button"
              className="absolute right-4 top-4 md:hidden"
              onClick={() => setBarExpanded(false)}
              aria-label="Réduire le lecteur"
            >
              <ChevronDown className="h-6 w-6" />
            </button>
          )}

          <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => toggle(current.id)}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left text-sm md:cursor-default"
              onClick={() => setBarExpanded(true)}
            >
              {current.snapshot.title}
            </button>
            <span className="text-sm tabular-nums" style={{ color: "rgba(245,245,245,0.7)" }}>
              {formatDuration(positionMs)} / {formatDuration(current.durationMs)}
            </span>
          </div>

          {barExpanded && (
            <div className="mx-auto w-full max-w-3xl md:hidden">
              <Waveform
                peaks={current.peaks}
                progress={current.durationMs > 0 ? positionMs / current.durationMs : 0}
                onSeek={seek}
                height={96}
              />
            </div>
          )}
        </div>
      )}
```

Sur desktop, `md:` neutralise l'expansion : la barre garde exactement son comportement d'origine.

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Attendu : aucune erreur.

---

## Task 14: Page publique `/ecoute/[slug]`

**Files:**
- Create: `app/ecoute/[slug]/page.tsx`
- Create: `app/ecoute/[slug]/ListeningRoomClient.tsx`

- [ ] **Step 1: Entrée serveur**

```tsx
import type { Metadata } from "next";
import { ListeningRoomClient } from "./ListeningRoomClient";

// Une page d'écoute privée n'a rien à faire dans un moteur de recherche.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Écoute privée",
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ i?: string }>;
};

export default async function ListeningRoomPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { i } = await searchParams;
  return <ListeningRoomClient slug={slug} inviteId={i ?? null} />;
}
```

- [ ] **Step 2: Orchestration des trois portes**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicListeningLink } from "@/lib/listening-types";
import { IdentityGate } from "@/modules/phono/components/listening/IdentityGate";
import { PasswordGate } from "@/modules/phono/components/listening/PasswordGate";
import { ListeningPlayer } from "@/modules/phono/components/listening/ListeningPlayer";

type Phase = "loading" | "gone" | "expired" | "locked" | "identify" | "listening";

interface Props {
  slug: string;
  inviteId: string | null;
}

export function ListeningRoomClient({ slug, inviteId }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [link, setLink] = useState<PublicListeningLink | null>(null);
  const [lockedTitle, setLockedTitle] = useState("");
  const [prefilledName, setPrefilledName] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/listening/${slug}`);
    const json = (await res.json()) as {
      state: "ok" | "gone" | "expired" | "locked";
      link?: PublicListeningLink;
      title?: string;
      inviteName?: string;
    };
    if (json.state === "ok" && json.link) {
      setLink(json.link);
      setPrefilledName(json.inviteName ?? "");
      setPhase("identify");
      return;
    }
    if (json.state === "locked") {
      setLockedTitle(json.title ?? "");
      setPhase("locked");
      return;
    }
    setPhase(json.state);
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function startSession(visitorName: string | null) {
    const res = await fetch(`/api/listening/${slug}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorName, inviteId }),
    });
    if (res.ok) {
      const { sessionId: id } = (await res.json()) as { sessionId: string };
      setSessionId(id);
    }
    // Une session non créée ne doit jamais empêcher d'écouter : la mesure est
    // secondaire par rapport à l'écoute elle-même.
    setPhase("listening");
  }

  if (phase === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p style={{ color: "rgba(245,245,245,0.7)" }}>Chargement…</p>
      </main>
    );
  }

  if (phase === "gone" || phase === "expired") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-xl font-medium">Ce lien d&apos;écoute n&apos;est plus actif.</h1>
          <p className="mt-2 text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
            Contactez l&apos;artiste pour en obtenir un nouveau.
          </p>
        </div>
      </main>
    );
  }

  if (phase === "locked") {
    return <PasswordGate slug={slug} title={lockedTitle} onUnlocked={() => void load()} />;
  }

  if (!link) return null;

  if (phase === "identify") {
    return (
      <IdentityGate
        title={link.title}
        artistName={link.artistName}
        prefilledName={prefilledName}
        onSubmit={(name) => void startSession(name)}
      />
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <ListeningPlayer link={link} sessionId={sessionId} />
    </main>
  );
}
```

- [ ] **Step 3: Renvoyer le nom d'invitation depuis l'API**

Le client attend `inviteName` dans la réponse de `GET /api/listening/[slug]`. Modifier cette route pour lire le paramètre de requête `i` et joindre le nom du contact :

Dans `app/api/listening/[slug]/route.ts`, remplacer la signature `GET(_req: NextRequest, ...)` par `GET(req: NextRequest, ...)`, puis avant le `return` final :

```ts
  let inviteName: string | undefined;
  const inviteId = req.nextUrl.searchParams.get("i");
  if (inviteId) {
    const { data: invite } = await supabase
      .from("user_listening_invites")
      .select("contact_name")
      .eq("id", inviteId)
      .eq("link_id", row.id)
      .maybeSingle();
    inviteName = (invite as { contact_name?: string } | null)?.contact_name;
  }

  return NextResponse.json({ state: "ok" as const, link: payload, inviteName });
```

Et dans `ListeningRoomClient`, passer le paramètre lors du chargement : remplacer l'URL du `fetch` par

```ts
    const res = await fetch(
      `/api/listening/${slug}${inviteId ? `?i=${encodeURIComponent(inviteId)}` : ""}`
    );
```

en ajoutant `inviteId` aux dépendances du `useCallback`.

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Attendu : aucune erreur.

Manuel : créer une ligne de test dans `user_listening_links` via le SQL Editor (`insert into public.user_listening_links (user_id, slug, title) values ('<votre user id>', 'test-slug-1234', 'Test');`), puis ouvrir `http://localhost:3000/ecoute/test-slug-1234`.
Attendu : la porte d'identification s'affiche avec le titre « Test ». Cliquer sur « Écouter sans m'identifier » affiche la page d'écoute vide. Vérifier dans Supabase qu'une ligne existe dans `user_listening_sessions` avec `visitor_name` à `null`.

---

## Task 15: Page liste et états vides

**Files:**
- Create: `app/(app)/phono/liens-ecoute/page.tsx`
- Create: `src/modules/phono/components/ListeningLinksPage.tsx`
- Modify: `src/components/layout/Sidebar.tsx:61-62`

- [ ] **Step 1: Ajouter l'entrée de navigation**

Dans `src/components/layout/Sidebar.tsx`, ajouter au tableau des sous-items Phono, après la ligne « Sessions Studio » :

```ts
      { href: "/phono/liens-ecoute", label: "Liens d'écoute" },
```

- [ ] **Step 2: Créer la route**

```tsx
import { ListeningLinksPage } from "@/modules/phono/components/ListeningLinksPage";

export default function Page() {
  return <ListeningLinksPage />;
}
```

- [ ] **Step 3: Écrire la page**

Les états vides sont la partie la plus importante de cette tâche : ils décident si l'artiste comprend quoi faire ensuite. Les quatre cas de la spec sont distincts et ne doivent pas être fusionnés.

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Download, Lock, Plus, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useListeningData } from "@/hooks/useListeningData";
import { ListeningLinkComposer } from "./ListeningLinkComposer";
import { ListeningLinkStats } from "./ListeningLinkStats";
import type { ListeningLink } from "@/lib/listening-types";

export function ListeningLinksPage() {
  const { tracks, albums, podcasts } = usePhonoData();
  const { links, isLoading, toggleActive, removeLink } = useListeningData();
  const [composerLink, setComposerLink] = useState<ListeningLink | null | "new">(null);
  const [statsLink, setStatsLink] = useState<ListeningLink | null>(null);

  const catalogueIsEmpty =
    tracks.length === 0 && albums.length === 0 && podcasts.length === 0;

  // Un titre n'est diffusable que si l'une de ses versions porte un fichier.
  const hasAnyAudio = useMemo(
    () => tracks.some((t) => (t.versions ?? []).some((v) => Boolean(v.audioPath))),
    [tracks]
  );

  function copyLink(slug: string) {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    void navigator.clipboard.writeText(`${origin}/ecoute/${slug}`);
  }

  if (isLoading) {
    return <p style={{ color: "rgba(245,245,245,0.7)" }}>Chargement…</p>;
  }

  // Cas 1 — catalogue vide : le bouton de création est absent, pas désactivé.
  // Un bouton grisé laisserait croire à un blocage plutôt qu'à une étape manquante.
  if (catalogueIsEmpty) {
    return (
      <EmptyState
        title="Ajoutez d'abord des titres à votre catalogue"
        body="Un lien d'écoute se compose à partir de votre catalogue phono. Commencez par y ajouter vos titres, albums ou podcasts."
        action={
          <Link href="/phono/catalogue">
            <Button>Aller au catalogue</Button>
          </Link>
        }
      />
    );
  }

  // Cas 3 — catalogue rempli mais aucun fichier audio. Cas le plus probable
  // juste après la migration : le catalogue préexiste, l'audio non.
  if (!hasAnyAudio) {
    return (
      <EmptyState
        title="Vos titres n'ont pas encore de fichier audio"
        body="Pour composer un lien d'écoute, rattachez un fichier audio à au moins une version de vos titres, depuis la fiche du titre dans le catalogue."
        action={
          <Link href="/phono/catalogue">
            <Button>Rattacher un fichier</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Liens d&apos;écoute</h1>
        <Button onClick={() => setComposerLink("new")}>
          <Plus className="mr-2 h-4 w-4" />
          Créer un lien d&apos;écoute
        </Button>
      </div>

      {/* Cas 2 — catalogue prêt, aucun lien encore créé. */}
      {links.length === 0 ? (
        <EmptyState
          title="Aucun lien d'écoute pour l'instant"
          body="Un lien d'écoute est une page privée qui regroupe les titres de votre choix, à envoyer à un label ou un programmateur."
          action={
            <Button onClick={() => setComposerLink("new")}>
              Créer un lien d&apos;écoute
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.id}>
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setStatsLink(link)}
                  >
                    <p className="truncate font-medium">
                      {link.title || "Sans titre"}
                    </p>
                    <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
                      {link.items.length} titre{link.items.length > 1 ? "s" : ""}
                      {link.expiresAt
                        ? ` · expire le ${new Date(link.expiresAt).toLocaleDateString("fr-FR")}`
                        : ""}
                      {link.isActive ? "" : " · désactivé"}
                    </p>
                  </button>

                  {link.hasPassword && (
                    <Lock className="h-4 w-4" style={{ color: "rgba(245,245,245,0.7)" }} />
                  )}
                  {link.allowDownload && (
                    <Download className="h-4 w-4" style={{ color: "rgba(245,245,245,0.7)" }} />
                  )}

                  <Button variant="ghost" size="icon" onClick={() => copyLink(link.slug)}
                          aria-label="Copier le lien">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={link.isActive ? "Désactiver le lien" : "Réactiver le lien"}
                    onClick={() => void toggleActive(link.id, !link.isActive)}
                  >
                    <Power className="h-4 w-4" style={{ color: link.isActive ? "#F0FF00" : undefined }} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Supprimer le lien"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Supprimer ce lien ? La page devient introuvable et les statistiques d'écoute sont effacées. Pour couper l'accès en gardant l'historique, désactivez-le plutôt."
                        )
                      ) {
                        void removeLink(link.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setComposerLink(link)}>
                    Modifier
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {composerLink !== null && (
        <ListeningLinkComposer
          link={composerLink === "new" ? null : composerLink}
          onClose={() => setComposerLink(null)}
        />
      )}
      {statsLink && (
        <ListeningLinkStats link={statsLink} onClose={() => setStatsLink(null)} />
      )}
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="max-w-md text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
          {body}
        </p>
        {action}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit && npm run lint`

Attendu : deux erreurs de module introuvable sur `ListeningLinkComposer` et `ListeningLinkStats`, créés aux Tasks 16 et 17. C'est le seul échec attendu de tout ce plan ; toute autre erreur doit être corrigée immédiatement.

---

## Task 16: Composeur

**Files:**
- Create: `src/modules/phono/components/listening/ProtectionSummary.tsx`
- Create: `src/modules/phono/components/ListeningLinkComposer.tsx`

- [ ] **Step 1: Encart de confidentialité**

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";

interface ProtectionSummaryProps {
  hasPassword: boolean;
  expiresAt: string | null;
  allowDownload: boolean;
}

/**
 * Résume les protections actives du lien en cours de composition, et énonce
 * honnêtement leur limite : promettre une étanchéité totale à un artiste qui
 * envoie un album non sorti serait le pire service à lui rendre.
 */
export function ProtectionSummary({
  hasPassword,
  expiresAt,
  allowDownload,
}: ProtectionSummaryProps) {
  const [open, setOpen] = useState(false);

  const badges = [
    "Lien non devinable",
    hasPassword ? "Protégé par mot de passe" : null,
    expiresAt
      ? `Expire le ${new Date(expiresAt).toLocaleDateString("fr-FR")}`
      : null,
    allowDownload ? "Téléchargement autorisé" : "Téléchargement désactivé",
  ].filter(Boolean) as string[];

  return (
    <div
      className="rounded-lg p-3"
      style={{
        border: "1px solid rgba(245,245,245,0.12)",
        background: "rgba(44,44,46,0.72)",
      }}
    >
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#F0FF00" }} />
        <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
          {badges.join(" · ")}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-2 flex items-center gap-1 text-xs"
        style={{ color: "rgba(245,245,245,0.7)" }}
      >
        <ChevronDown className="h-3.5 w-3.5" />
        Comment ce lien est protégé
      </button>

      {open && (
        <div className="mt-2 space-y-2 text-xs leading-relaxed"
             style={{ color: "rgba(245,245,245,0.7)" }}>
          <p>
            L&apos;adresse du lien est impossible à deviner et la page n&apos;est pas
            indexée par les moteurs de recherche. Les fichiers audio sont servis
            par des adresses temporaires qui expirent au bout de quelques
            minutes : une URL copiée puis repartagée ne fonctionne plus. Vous
            pouvez désactiver le lien à tout moment.
          </p>
          <p>
            Ces protections réduisent fortement le risque de rediffusion
            accidentelle — un lien transféré, une adresse copiée. Elles ne
            remplacent pas la confiance accordée au destinataire : aucun système
            ne peut empêcher quelqu&apos;un d&apos;enregistrer un son qu&apos;il
            est autorisé à écouter.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Écrire le composeur**

Le composeur assemble les items depuis le catalogue en dénormalisant le snapshot au moment de l'ajout — c'est le point d'application de l'approche C.

```tsx
"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePhonoData } from "@/hooks/usePhonoData";
import { useListeningData } from "@/hooks/useListeningData";
import { formatDuration } from "@/lib/audio-peaks";
import type { ListeningItem, ListeningLink } from "@/lib/listening-types";
import type { Track } from "@/lib/sidekick-store";
import { ProtectionSummary } from "./listening/ProtectionSummary";

type DraftItem = Omit<ListeningItem, "id">;

interface Props {
  link: ListeningLink | null;
  onClose: () => void;
}

export function ListeningLinkComposer({ link, onClose }: Props) {
  const { tracks, albums } = usePhonoData();
  const { createLink, updateLink } = useListeningData();

  const [title, setTitle] = useState(link?.title ?? "");
  const [introMessage, setIntroMessage] = useState(link?.introMessage ?? "");
  const [password, setPassword] = useState("");
  const [removePassword, setRemovePassword] = useState(false);
  const [expiresAt, setExpiresAt] = useState(link?.expiresAt?.slice(0, 10) ?? "");
  const [allowDownload, setAllowDownload] = useState(link?.allowDownload ?? false);
  const [presskitUrl, setPresskitUrl] = useState(link?.presskitUrl ?? "");
  const [items, setItems] = useState<DraftItem[]>(
    (link?.items ?? []).map(({ id: _id, ...rest }) => rest)
  );
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Construit un item à partir d'une version précise, en figeant le snapshot. */
  function buildItem(track: Track, versionId: string, groupLabel?: string): DraftItem | null {
    const version = (track.versions ?? []).find((v) => v.id === versionId);
    if (!version?.audioPath) return null;
    return {
      position: 0,
      groupLabel,
      kind: "track",
      sourceId: track.id,
      versionId: version.id,
      snapshot: {
        title: track.title,
        mainArtist: track.mainArtist,
        guestArtists: track.guestArtists ?? [],
        versionLabel: version.label,
        isrc: track.isrc || undefined,
        role: track.role,
        label: track.label,
        releaseDate: track.releaseDate || undefined,
        genre: track.genre,
        cover: track.cover,
      },
      audioPath: version.audioPath,
      durationMs: version.durationMs ?? 0,
      peaks: version.peaks ?? [],
    };
  }

  /** Un titre n'est proposable que si au moins une version porte un fichier. */
  const playableTracks = useMemo(
    () =>
      tracks.filter((t) =>
        (t.versions ?? []).some((v) => Boolean(v.audioPath))
      ),
    [tracks]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return playableTracks;
    return playableTracks.filter((t) => t.title.toLowerCase().includes(q));
  }, [playableTracks, search]);

  function addTrack(track: Track, groupLabel?: string) {
    const firstPlayable = (track.versions ?? []).find((v) => v.audioPath);
    if (!firstPlayable) return;
    const item = buildItem(track, firstPlayable.id, groupLabel);
    if (item) setItems((prev) => [...prev, item]);
  }

  /**
   * Un album ajouté en bloc est éclaté en items partageant le même
   * `groupLabel` : c'est ce qui permet de mélanger un EP entier, deux titres
   * isolés et un podcast dans une seule page cohérente.
   */
  function addAlbum(albumId: string) {
    const album = albums.find((a) => a.id === albumId);
    if (!album) return;
    for (const trackId of album.trackIds ?? []) {
      const track = playableTracks.find((t) => t.id === trackId);
      if (track) addTrack(track, album.title);
    }
  }

  function changeVersion(index: number, versionId: string) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const track = tracks.find((t) => t.id === item.sourceId);
        if (!track) return item;
        const rebuilt = buildItem(track, versionId, item.groupLabel);
        return rebuilt ?? item;
      })
    );
  }

  function move(index: number, delta: number) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const input = {
        title,
        introMessage,
        password: removePassword ? null : password.length > 0 ? password : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        allowDownload,
        presskitUrl: presskitUrl || null,
        items: items.map((item, index) => ({ ...item, position: index })),
      };
      if (link) await updateLink(link.id, input);
      else await createLink(input);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const canPublish = items.length > 0 && items.every((i) => i.audioPath.length > 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {link ? "Modifier le lien d'écoute" : "Nouveau lien d'écoute"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Colonne gauche : la sélection */}
          <div className="space-y-3">
            <Label>Sélection</Label>
            {items.length === 0 ? (
              <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
                Aucun titre pour l&apos;instant. Cherchez dans votre catalogue
                ci-dessous pour composer votre sélection.
              </p>
            ) : (
              <ul className="space-y-2">
                {items.map((item, index) => {
                  const track = tracks.find((t) => t.id === item.sourceId);
                  const versions = (track?.versions ?? []).filter((v) => v.audioPath);
                  return (
                    <li
                      key={`${item.sourceId}-${item.versionId}-${index}`}
                      className="flex items-center gap-2 rounded p-2"
                      style={{ border: "1px solid rgba(245,245,245,0.12)" }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{item.snapshot.title}</p>
                        <p className="text-xs" style={{ color: "rgba(245,245,245,0.7)" }}>
                          {item.groupLabel ? `${item.groupLabel} · ` : ""}
                          {formatDuration(item.durationMs)}
                        </p>
                      </div>
                      {versions.length > 1 && (
                        <Select
                          value={item.versionId}
                          onValueChange={(v) => changeVersion(index, v)}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {versions.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => move(index, -1)}
                              aria-label="Monter">
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => move(index, 1)}
                              aria-label="Descendre">
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Retirer"
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}

            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher un titre dans le catalogue"
            />
            {filtered.length === 0 && (
              <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
                Aucun titre ne correspond.{" "}
                <button
                  type="button"
                  className="underline"
                  style={{ color: "#F0FF00" }}
                  onClick={() => setSearch("")}
                >
                  Effacer la recherche
                </button>
              </p>
            )}
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {filtered.map((track) => (
                <li key={track.id} className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => addTrack(track)}
                          aria-label={`Ajouter ${track.title}`}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <span className="truncate text-sm">{track.title}</span>
                </li>
              ))}
            </ul>

            {albums.length > 0 && (
              <Select onValueChange={addAlbum}>
                <SelectTrigger>
                  <SelectValue placeholder="Ajouter un projet entier" />
                </SelectTrigger>
                <SelectContent>
                  {albums.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Colonne droite : les réglages */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="lk-title">Titre</Label>
              <Input
                id="lk-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Promo EP — automne 2026"
              />
            </div>

            <div>
              <Label htmlFor="lk-intro">Mot d&apos;introduction</Label>
              <Textarea
                id="lk-intro"
                value={introMessage}
                onChange={(e) => setIntroMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="lk-pwd">Mot de passe</Label>
              <Input
                id="lk-pwd"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setRemovePassword(false);
                }}
                placeholder={link?.hasPassword ? "Inchangé" : "Aucun"}
              />
              <p className="mt-1 text-xs" style={{ color: "rgba(245,245,245,0.7)" }}>
                Un lien transféré sans le code reste inutilisable.
              </p>
              {link?.hasPassword && (
                <label className="mt-1 flex items-center gap-2 text-xs"
                       style={{ color: "rgba(245,245,245,0.7)" }}>
                  <input
                    type="checkbox"
                    checked={removePassword}
                    onChange={(e) => setRemovePassword(e.target.checked)}
                  />
                  Retirer le mot de passe
                </label>
              )}
            </div>

            <div>
              <Label htmlFor="lk-exp">Date d&apos;expiration</Label>
              <Input
                id="lk-exp"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
              <p className="mt-1 text-xs" style={{ color: "rgba(245,245,245,0.7)" }}>
                Passée cette date, la page ne diffuse plus rien, même pour ceux
                qui ont déjà le lien.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="lk-dl">Autoriser le téléchargement</Label>
                <Switch id="lk-dl" checked={allowDownload} onCheckedChange={setAllowDownload} />
              </div>
              {allowDownload && (
                <p className="mt-1 text-xs" style={{ color: "#ff6b6b" }}>
                  Le destinataire obtient le fichier. Vous perdez tout contrôle
                  dessus.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="lk-pk">Lien presskit</Label>
              <Input
                id="lk-pk"
                value={presskitUrl}
                onChange={(e) => setPresskitUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>

            <ProtectionSummary
              hasPassword={Boolean(password) || (link?.hasPassword && !removePassword) || false}
              expiresAt={expiresAt || null}
              allowDownload={allowDownload}
            />
          </div>
        </div>

        {error && <p className="text-sm" style={{ color: "#ff6b6b" }}>{error}</p>}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={() => void save()} disabled={busy || !canPublish}>
            {busy ? "Enregistrement…" : link ? "Enregistrer" : "Créer le lien"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

`Album.trackIds: string[]` est vérifié dans `src/lib/sidekick-store.ts:395`.

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Attendu : une seule erreur restante, sur `ListeningLinkStats` (Task 17).

---

## Task 17: Analytics

**Files:**
- Create: `src/modules/phono/components/ListeningLinkStats.tsx`

- [ ] **Step 1: Écrire le composant**

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDuration } from "@/lib/audio-peaks";
import { useListeningData } from "@/hooks/useListeningData";
import type { ListeningLink, ListeningLinkStats as Stats } from "@/lib/listening-types";

interface Props {
  link: ListeningLink;
  onClose: () => void;
}

export function ListeningLinkStats({ link, onClose }: Props) {
  const { loadStats } = useListeningData();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void loadStats(link.id).then(setStats);
  }, [link.id, loadStats]);

  const itemTitle = (itemId: string) =>
    link.items.find((i) => i.id === itemId)?.snapshot.title ?? "Titre retiré";

  const itemDuration = (itemId: string) =>
    link.items.find((i) => i.id === itemId)?.durationMs ?? 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{link.title || "Sans titre"}</DialogTitle>
        </DialogHeader>

        {!stats ? (
          <p style={{ color: "rgba(245,245,245,0.7)" }}>Chargement…</p>
        ) : stats.sessionCount === 0 ? (
          <div className="py-8 text-center">
            <p className="font-medium">Pas encore d&apos;écoute</p>
            <p className="mt-1 text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
              Lien créé le {new Date(link.createdAt).toLocaleDateString("fr-FR")}.
              Une tâche de relance apparaîtra automatiquement si un envoi reste
              sans ouverture.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Sessions" value={String(stats.sessionCount)} />
              <Stat
                label="Taux d'écoute moyen"
                value={`${Math.round(stats.averageCompletion * 100)} %`}
              />
              <Stat label="Téléchargements" value={String(stats.downloadCount)} />
            </div>

            <section>
              <h3 className="mb-2 text-sm uppercase tracking-wide"
                  style={{ color: "rgba(245,245,245,0.7)" }}>
                Sessions identifiées
              </h3>
              {stats.identifiedSessions.length === 0 ? (
                <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
                  Personne ne s&apos;est identifié pour l&apos;instant.
                </p>
              ) : (
                <ul className="space-y-3">
                  {stats.identifiedSessions.map((session) => (
                    <li key={session.id} className="rounded p-3"
                        style={{ border: "1px solid rgba(245,245,245,0.12)" }}>
                      <p className="text-sm font-medium">
                        {session.visitorName} ·{" "}
                        {new Date(session.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {session.plays.map((play) => {
                          const duration = itemDuration(play.itemId);
                          const percent =
                            duration > 0
                              ? Math.min(100, Math.round((play.listenedMs / duration) * 100))
                              : 0;
                          return (
                            <li key={play.itemId} className="text-xs"
                                style={{ color: "rgba(245,245,245,0.7)" }}>
                              {itemTitle(play.itemId)} — écouté à {percent} %
                              {play.completed
                                ? ""
                                : `, passé à ${formatDuration(play.maxPositionMs)}`}
                              {play.playCount > 1 ? `, réécouté ${play.playCount} fois` : ""}
                              {play.downloaded ? ", téléchargé" : ""}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm uppercase tracking-wide"
                  style={{ color: "rgba(245,245,245,0.7)" }}>
                Écoutes anonymes
              </h3>
              {stats.anonymousSessionCount === 0 ? (
                <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
                  Aucune écoute anonyme.
                </p>
              ) : (
                <>
                  <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
                    {stats.anonymousSessionCount} session
                    {stats.anonymousSessionCount > 1 ? "s" : ""} sans identification.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {Object.entries(stats.anonymousListenedMsByItem)
                      .sort((a, b) => b[1] - a[1])
                      .map(([itemId, ms]) => (
                        <li key={itemId} className="text-xs"
                            style={{ color: "rgba(245,245,245,0.7)" }}>
                          {itemTitle(itemId)} — {formatDuration(ms)} écoutées au total
                        </li>
                      ))}
                  </ul>
                </>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded p-3" style={{ border: "1px solid rgba(245,245,245,0.12)" }}>
      <p className="text-xs" style={{ color: "rgba(245,245,245,0.7)" }}>{label}</p>
      <p className="text-xl font-medium">{value}</p>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Attendu : aucune erreur. Toutes les erreurs de module introuvable des Tasks 15 et 16 sont maintenant résolues.

Manuel : `npm run dev`, ouvrir `/phono/liens-ecoute`, créer un lien avec deux titres, copier l'adresse, l'ouvrir en navigation privée, s'identifier, écouter 30 secondes d'un titre puis fermer l'onglet. Revenir sur `/phono/liens-ecoute`, cliquer sur le lien.
Attendu : une session identifiée au nom saisi, avec un pourcentage d'écoute non nul sur le titre lu.

---

## Task 18: Vue transverse par titre

**Files:**
- Modify: `src/modules/phono/components/ListeningLinksPage.tsx`

La spec demande une vue « quel morceau retient l'attention des pros », tous liens confondus. Elle se calcule à partir des statistiques déjà chargées, sans nouvelle requête serveur.

- [ ] **Step 1: Ajouter le chargement agrégé**

Dans `ListeningLinksPage`, après les hooks existants :

```ts
  const [topTracks, setTopTracks] = useState<Array<{ title: string; ms: number }>>([]);

  useEffect(() => {
    if (links.length === 0) return;
    let cancelled = false;
    void (async () => {
      const totals = new Map<string, number>();
      for (const link of links) {
        const stats = await loadStats(link.id);
        // On additionne identifiées et anonymes : la question posée ici est
        // « quel titre accroche », pas « qui l'a écouté ».
        for (const session of stats.identifiedSessions) {
          for (const play of session.plays) {
            const title =
              link.items.find((i) => i.id === play.itemId)?.snapshot.title;
            if (title) totals.set(title, (totals.get(title) ?? 0) + play.listenedMs);
          }
        }
        for (const [itemId, ms] of Object.entries(stats.anonymousListenedMsByItem)) {
          const title = link.items.find((i) => i.id === itemId)?.snapshot.title;
          if (title) totals.set(title, (totals.get(title) ?? 0) + ms);
        }
      }
      if (cancelled) return;
      setTopTracks(
        [...totals.entries()]
          .map(([title, ms]) => ({ title, ms }))
          .sort((a, b) => b.ms - a.ms)
          .slice(0, 5)
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [links, loadStats]);
```

Ajouter `useEffect` à l'import React, et `loadStats` à la déstructuration de `useListeningData()`.

- [ ] **Step 2: Afficher le classement**

Sous la liste des liens, avant les modales :

```tsx
      {topTracks.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-2 text-sm uppercase tracking-wide"
                style={{ color: "rgba(245,245,245,0.7)" }}>
              Titres les plus écoutés, tous liens confondus
            </h2>
            <ul className="space-y-1">
              {topTracks.map((t) => (
                <li key={t.title} className="flex justify-between text-sm">
                  <span className="truncate">{t.title}</span>
                  <span style={{ color: "rgba(245,245,245,0.7)" }}>
                    {formatDuration(t.ms)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
```

Ajouter `import { formatDuration } from "@/lib/audio-peaks";`.

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Attendu : aucune erreur.

---

## Task 19: Envoi par mail et invitations

**Files:**
- Modify: `src/modules/phono/components/ListeningLinksPage.tsx`
- Create: `src/lib/listening-invites.ts`

- [ ] **Step 1: Créer le module d'invitation**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ListeningInvite } from "@/lib/listening-types";

/**
 * Une invitation = un envoi nominatif. Elle porte le paramètre `?i=` du lien,
 * qui pré-remplit le nom du destinataire sans lui imposer la moindre saisie,
 * et sert de base à la règle de relance.
 */
export async function createListeningInvite(
  supabase: SupabaseClient,
  linkId: string,
  contact: { id?: string; name: string; email: string }
): Promise<ListeningInvite> {
  const { data, error } = await supabase
    .from("user_listening_invites")
    .insert({
      link_id: linkId,
      contact_id: contact.id ?? null,
      contact_name: contact.name,
      contact_email: contact.email,
    })
    .select("id, link_id, contact_id, contact_name, contact_email, sent_at, first_opened_at")
    .single();

  if (error) throw new Error(error.message);

  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    linkId: row.link_id as string,
    contactId: (row.contact_id as string) ?? undefined,
    contactName: row.contact_name as string,
    contactEmail: row.contact_email as string,
    sentAt: row.sent_at as string,
    firstOpenedAt: (row.first_opened_at as string) ?? undefined,
  };
}

export async function fetchListeningInvites(
  supabase: SupabaseClient,
  linkIds: string[]
): Promise<ListeningInvite[]> {
  if (linkIds.length === 0) return [];
  const { data, error } = await supabase
    .from("user_listening_invites")
    .select("id, link_id, contact_id, contact_name, contact_email, sent_at, first_opened_at")
    .in("link_id", linkIds);

  if (error) throw new Error(error.message);

  return (data ?? []).map((raw) => {
    const row = raw as Record<string, unknown>;
    return {
      id: row.id as string,
      linkId: row.link_id as string,
      contactId: (row.contact_id as string) ?? undefined,
      contactName: row.contact_name as string,
      contactEmail: row.contact_email as string,
      sentAt: row.sent_at as string,
      firstOpenedAt: (row.first_opened_at as string) ?? undefined,
    };
  });
}

/** URL nominative à insérer dans le corps du mail. */
export function inviteUrl(slug: string, inviteId: string, origin: string): string {
  return `${origin}/ecoute/${slug}?i=${inviteId}`;
}
```

- [ ] **Step 2: Ajouter l'action d'envoi dans la liste**

Dans `ListeningLinksPage`, ajouter un bouton « Envoyer » sur chaque ligne, qui demande nom et email puis produit l'URL nominative et l'ouvre dans le composeur mail existant :

```tsx
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const name = window.prompt("Nom du destinataire ?");
                      if (!name) return;
                      const email = window.prompt("Adresse email ?");
                      if (!email) return;
                      const supabase = createClient();
                      const invite = await createListeningInvite(supabase, link.id, {
                        name,
                        email,
                      });
                      const origin =
                        process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
                      const url = inviteUrl(link.slug, invite.id, origin);
                      await navigator.clipboard.writeText(url);
                      window.location.href = `/marketing?compose=1&to=${encodeURIComponent(
                        email
                      )}&body=${encodeURIComponent(url)}`;
                    }}
                  >
                    Envoyer
                  </Button>
```

Ajouter les imports `createClient` depuis `@/lib/supabase`, et `createListeningInvite`, `inviteUrl` depuis `@/lib/listening-invites`.

Le lien étant copié dans le presse-papiers avant la redirection, l'artiste peut le coller manuellement si le composeur mail ne lit pas les paramètres `to` et `body`. Vérifier ce point à l'implémentation dans `src/modules/marketing/components/MailingPage.tsx` : si ces paramètres ne sont pas gérés, laisser la redirection telle quelle — le presse-papiers couvre le cas — et ne pas modifier le module Marketing dans le cadre de ce plan.

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Attendu : aucune erreur.

Manuel : cliquer sur « Envoyer », saisir un nom et un email. Attendu : une ligne apparaît dans `user_listening_invites`. Ouvrir l'URL copiée : la porte d'identification est **pré-remplie** avec le nom saisi.

---

## Task 20: Règle de relance

**Files:**
- Create: `src/modules/tasks/rules/phono.ts`
- Modify: `src/modules/tasks/rules/types.ts`
- Modify: `src/modules/tasks/rules/index.ts`
- Modify: `src/modules/tasks/components/Tasks.tsx`

- [ ] **Step 1: Étendre le contexte**

Dans `src/modules/tasks/rules/types.ts`, ajouter l'import et le champ :

```ts
import type { ListeningInvite, ListeningLink } from "@/lib/listening-types";
```

et dans `RuleContext`, après `incomes` :

```ts
  phono: { links: ListeningLink[]; invites: ListeningInvite[] } | null;
```

- [ ] **Step 2: Écrire la règle**

```ts
import type { Rule } from "./types";

/** Une semaine sans ouverture : le délai au-delà duquel une relance est légitime. */
const RELANCE_AFTER_DAYS = 7;

export const phonoRules: Rule[] = [
  (ctx) => {
    if (!ctx.phono) return null;

    const threshold = Date.now() - RELANCE_AFTER_DAYS * 24 * 60 * 60 * 1000;

    const stale = ctx.phono.invites.find((invite) => {
      if (invite.firstOpenedAt) return false;
      if (new Date(invite.sentAt).getTime() > threshold) return false;
      // Un lien coupé ou expiré ne mérite pas de relance : le destinataire ne
      // pourrait de toute façon rien écouter.
      const link = ctx.phono?.links.find((l) => l.id === invite.linkId);
      if (!link || !link.isActive) return false;
      if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) return false;
      return true;
    });

    if (!stale) return null;

    const link = ctx.phono.links.find((l) => l.id === stale.linkId);
    const title = link?.title || "votre lien d'écoute";

    if (ctx.tasks.some((t) => t.title?.includes(stale.contactName))) return null;

    return {
      title: `Relancer ${stale.contactName} sur « ${title} »`,
      sector: "Phono",
      reason: `Lien envoyé il y a plus de ${RELANCE_AFTER_DAYS} jours, jamais ouvert`,
      source: "rule",
    };
  },
];
```

Vérifier que `"Phono"` est une valeur valide du type `TaskSector` défini dans `src/modules/tasks/components/TaskModal.tsx`. Si le secteur porte un autre libellé, utiliser celui-là.

- [ ] **Step 3: Agréger la règle**

Dans `src/modules/tasks/rules/index.ts` :

```ts
import { phonoRules } from "./phono";
```

et ajouter `...phonoRules,` au tableau `allRules`.

- [ ] **Step 4: Alimenter le contexte**

Dans `src/modules/tasks/components/Tasks.tsx`, importer le hook et le module d'invitations :

```ts
import { useListeningData } from "@/hooks/useListeningData";
import { fetchListeningInvites } from "@/lib/listening-invites";
import { createClient } from "@/lib/supabase";
```

Ajouter, à côté des autres hooks de module :

```ts
  const { links: listeningLinks } = useListeningData();
  const [listeningInvites, setListeningInvites] = useState<ListeningInvite[]>([]);

  useEffect(() => {
    if (listeningLinks.length === 0) {
      setListeningInvites([]);
      return;
    }
    void fetchListeningInvites(
      createClient(),
      listeningLinks.map((l) => l.id)
    ).then(setListeningInvites);
  }, [listeningLinks]);
```

Ajouter `import type { ListeningInvite } from "@/lib/listening-types";`, et dans l'objet `RuleContext` construit pour `allRules`, ajouter :

```ts
    phono: { links: listeningLinks, invites: listeningInvites },
```

- [ ] **Step 5: Vérifier**

Run: `npx tsc --noEmit && npm run lint`
Attendu : aucune erreur. Si TypeScript signale que `phono` manque dans un autre objet `RuleContext` du dépôt, l'ajouter là aussi avec la valeur `null`.

Manuel : dans le SQL Editor, antidater une invitation :
`update public.user_listening_invites set sent_at = now() - interval '10 days' where id = '<invite id>';`
Puis ouvrir `/tasks`. Attendu : une suggestion « Relancer <nom> sur « <titre> » » apparaît dans les suggestions.

---

## Task 21: Vérification de bout en bout

**Files:** aucun

- [ ] **Step 1: Build de production**

Run: `npm run build`
Attendu : build réussi, sans erreur TypeScript ni ESLint.

- [ ] **Step 2: Contrôler l'invariant de sécurité**

Avec un lien protégé par mot de passe et le serveur de dev lancé :

Run: `curl -s http://localhost:3000/api/listening/<slug>`
Attendu : `{"state":"locked","title":"…"}` — **aucune tracklist, aucun chemin de fichier**.

Run: `curl -s -X POST http://localhost:3000/api/listening/<slug>/audio/<itemId>`
Attendu : `{"error":"Accès refusé."}` avec un statut 401.

- [ ] **Step 3: Contrôler l'expiration**

Dans le SQL Editor : `update public.user_listening_links set expires_at = now() - interval '1 day' where slug = '<slug>';`

Recharger la page publique. Attendu : « Ce lien d'écoute n'est plus actif. » Relancer l'appel audio ci-dessus : statut 404.

- [ ] **Step 4: Contrôler le téléchargement**

Avec `allow_download` à `false`, ouvrir directement
`http://localhost:3000/api/listening/<slug>/download/<itemId>`.
Attendu : `{"error":"Téléchargement désactivé."}` avec un statut 403 — le contrôle tient même sans passer par l'interface.

- [ ] **Step 5: Contrôler la robustesse de l'approche C**

Supprimer du catalogue un titre présent dans un lien d'écoute, puis recharger la page publique.
Attendu : le titre s'affiche toujours et se lit normalement. C'est la vérification centrale de l'approche retenue : le catalogue et les liens envoyés sont découplés.
