# Migration complète localStorage → Supabase — Design Spec

**Date:** 2026-04-10  
**Objectif:** Migrer tous les modules restants de localStorage vers Supabase, module par module, en suivant le pattern établi avec `tasks`.

---

## Modules à migrer (ordre croissant de complexité)

| # | Module | Tables SQL | Complexité |
|---|--------|-----------|-----------|
| 1 | `contacts` | `user_contacts`, `user_prospection` | Flat, pas de relations |
| 2 | `calendar` | `user_calendar_events` | Flat |
| 3 | `admin` | `user_admin_statuses`, `user_admin_structures`, `user_admin_procedures`, `user_admin_documents`, `user_admin_document_folders` | Flat, 5 tables |
| 4 | `live` | `user_tour_dates`, `user_rehearsals`, `user_equipment`, `user_live_prospection` | Nested JSON pour sous-tableaux |
| 5 | `marketing` | `user_marketing_events`, `user_marketing_settings`, `user_mailing_campaigns`, `user_mailing_contacts`, `user_mailing_segments`, `user_presskit_profile` | Nested JSON, settings en JSONB |
| 6 | `projects` | `user_projects` | Relations cross-module en text[] |
| 7 | `phono` | `user_albums`, `user_tracks`, `user_sessions`, `user_podcasts` | Relations album↔tracks |
| 8 | `edition` | `user_works`, `user_sync_data` | Le plus complexe |
| 9 | `dashboard` | `user_profiles` | Single row par user |
| 10 | `incomes` | `user_intermittence_missions`, `user_invoices`, `user_royalties_imports`, `user_royalties_manual` | Actuellement en localStorage dédié |

---

## SQL Migrations

### Migration 1 — Contacts

```sql
-- user_contacts
create table user_contacts (
  id           text primary key,
  user_id      uuid references auth.users not null,
  first_name   text not null default '',
  last_name    text not null default '',
  role         text not null default '',
  city         text not null default '',
  email        text not null default '',
  instagram    text not null default '',
  phone        text not null default '',
  notes        text not null default '',
  created_at   text
);

alter table user_contacts enable row level security;
create policy "Users manage own contacts"
  on user_contacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_prospection (stub pour l'instant)
create table user_prospection (
  id           text primary key,
  user_id      uuid references auth.users not null,
  label        text not null default '',
  data         jsonb not null default '{}'
);

alter table user_prospection enable row level security;
create policy "Users manage own prospection"
  on user_prospection for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Migration 2 — Calendar

```sql
create table user_calendar_events (
  id           text primary key,
  user_id      uuid references auth.users not null,
  title        text not null,
  start        text not null,
  "end"        text,
  data         jsonb not null default '{}'
);

alter table user_calendar_events enable row level security;
create policy "Users manage own calendar events"
  on user_calendar_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Migration 3 — Admin

```sql
create table user_admin_statuses (
  id           text primary key,
  user_id      uuid references auth.users not null,
  nom          text not null default '',
  type         text not null default 'autre',
  actif        boolean not null default true,
  date_debut   text,
  date_fin     text,
  notes        text,
  data         jsonb not null default '{}'
);

alter table user_admin_statuses enable row level security;
create policy "Users manage own admin statuses"
  on user_admin_statuses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table user_admin_structures (
  id           text primary key,
  user_id      uuid references auth.users not null,
  name         text not null default '',
  data         jsonb not null default '{}'
);

alter table user_admin_structures enable row level security;
create policy "Users manage own admin structures"
  on user_admin_structures for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table user_admin_procedures (
  id           text primary key,
  user_id      uuid references auth.users not null,
  label        text not null default '',
  data         jsonb not null default '{}'
);

alter table user_admin_procedures enable row level security;
create policy "Users manage own admin procedures"
  on user_admin_procedures for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table user_admin_documents (
  id           text primary key,
  user_id      uuid references auth.users not null,
  title        text not null default '',
  data         jsonb not null default '{}'
);

alter table user_admin_documents enable row level security;
create policy "Users manage own admin documents"
  on user_admin_documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table user_admin_document_folders (
  id           text primary key,
  user_id      uuid references auth.users not null,
  name         text not null default ''
);

alter table user_admin_document_folders enable row level security;
create policy "Users manage own admin document folders"
  on user_admin_document_folders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Migration 4 — Live

```sql
create table user_tour_dates (
  id           text primary key,
  user_id      uuid references auth.users not null,
  city         text not null default '',
  venue        text not null default '',
  date         text not null default '',
  status       text not null default 'Confirmée',
  note         text not null default '',
  data         jsonb not null default '{}'
);

alter table user_tour_dates enable row level security;
create policy "Users manage own tour dates"
  on user_tour_dates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table user_rehearsals (
  id            text primary key,
  user_id       uuid references auth.users not null,
  label         text not null default '',
  date          text not null default '',
  time          text not null default '',
  location      text not null default '',
  city          text not null default '',
  address       text not null default '',
  note          text not null default '',
  remunerations jsonb not null default '[]',
  equipments    jsonb not null default '[]'
);

alter table user_rehearsals enable row level security;
create policy "Users manage own rehearsals"
  on user_rehearsals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table user_equipment (
  id           text primary key,
  user_id      uuid references auth.users not null,
  name         text not null default '',
  quantity     integer not null default 1,
  condition    text not null default 'Bon',
  comment      text
);

alter table user_equipment enable row level security;
create policy "Users manage own equipment"
  on user_equipment for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Prospection live (venues à démarcher)
create table user_live_prospection (
  id           text primary key,
  user_id      uuid references auth.users not null,
  venue        text not null default '',
  city         text not null default '',
  contact      text not null default '',
  email        text not null default '',
  status       text not null default 'À contacter',
  notes        text not null default ''
);

alter table user_live_prospection enable row level security;
create policy "Users manage own live prospection"
  on user_live_prospection for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Migration 5 — Marketing

```sql
-- Calendrier éditorial
create table user_marketing_events (
  id             text primary key,
  user_id        uuid references auth.users not null,
  title          text not null default '',
  date           text not null default '',
  time           text not null default '',
  status         text not null default 'idee',
  platforms      jsonb not null default '[]',
  content_types  jsonb not null default '[]',
  text           text not null default '',
  attachments    jsonb not null default '[]',
  notes          text not null default ''
);

alter table user_marketing_events enable row level security;
create policy "Users manage own marketing events"
  on user_marketing_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Settings marketing (platforms et contentTypes custom par user)
create table user_marketing_settings (
  user_id                 uuid primary key references auth.users not null,
  editorial_platforms     jsonb not null default '[]',
  editorial_content_types jsonb not null default '[]'
);

alter table user_marketing_settings enable row level security;
create policy "Users manage own marketing settings"
  on user_marketing_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Mailing — campagnes
create table user_mailing_campaigns (
  id                 text primary key,
  user_id            uuid references auth.users not null,
  name               text not null default '',
  date_envoi         text not null default '',
  envoyes            integer not null default 0,
  ouverts            integer not null default 0,
  pct_ouverture      numeric not null default 0,
  clics              integer not null default 0,
  pct_clics          numeric not null default 0,
  details            text,
  subject            text,
  accroche           text,
  content_html       text,
  target_segment_ids jsonb not null default '[]',
  from_email         text
);

alter table user_mailing_campaigns enable row level security;
create policy "Users manage own mailing campaigns"
  on user_mailing_campaigns for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Mailing — contacts
create table user_mailing_contacts (
  id           text primary key,
  user_id      uuid references auth.users not null,
  nom          text not null default '',
  prenom       text not null default '',
  mail         text not null default '',
  date_ajout   text not null default '',
  segment_ids  jsonb not null default '[]'
);

alter table user_mailing_contacts enable row level security;
create policy "Users manage own mailing contacts"
  on user_mailing_contacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Mailing — segments
create table user_mailing_segments (
  id           text primary key,
  user_id      uuid references auth.users not null,
  name         text not null default ''
);

alter table user_mailing_segments enable row level security;
create policy "Users manage own mailing segments"
  on user_mailing_segments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Presskit profile (une ligne par user)
create table user_presskit_profile (
  user_id                uuid primary key references auth.users not null,
  artist_title           text not null default '',
  hook                   text not null default '',
  artist_logo_url        text,
  artist_logo_file_name  text,
  artist_display_mode    text not null default 'name',
  main_photo_url         text not null default '',
  main_photo_file_name   text,
  bio                    text not null default '',
  socials                jsonb not null default '{"instagram":"","facebook":""}',
  contact                jsonb not null default '{"email":"","whatsapp":""}',
  streaming_artist_name  text not null default '',
  streaming_links        jsonb not null default '{}',
  custom_streaming_links jsonb not null default '[]',
  covers                 jsonb not null default '[]',
  latest                 jsonb not null default '[]'
);

alter table user_presskit_profile enable row level security;
create policy "Users manage own presskit profile"
  on user_presskit_profile for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Migration 6 — Projects

```sql
create table user_projects (
  id                  text primary key,
  user_id             uuid references auth.users not null,
  title               text not null default '',
  description         text not null default '',
  status              text not null default 'idea',
  cover               text not null default '',
  images              jsonb not null default '[]',
  sectors             jsonb not null default '[]',
  members             jsonb not null default '[]',
  linked_albums       jsonb not null default '[]',
  linked_tracks       jsonb not null default '[]',
  linked_sessions     jsonb not null default '[]',
  linked_works        jsonb not null default '[]',
  linked_tour_dates   jsonb not null default '[]',
  linked_rehearsals   jsonb not null default '[]',
  notes               text not null default '',
  created_at          text not null default '',
  updated_at          text not null default ''
);

alter table user_projects enable row level security;
create policy "Users manage own projects"
  on user_projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Migration 7 — Phono

```sql
create table user_tracks (
  id             text primary key,
  user_id        uuid references auth.users not null,
  title          text not null default '',
  main_artist    text not null default '',
  role           text not null default 'artiste_principal',
  guest_artists  jsonb not null default '[]',
  isrc           text not null default '',
  release_date   text not null default '',
  self_produced  boolean not null default true,
  label          text,
  editor         text,
  versions       jsonb not null default '[]',
  genre          text,
  distribution   text,
  notes          text not null default '',
  status         text,
  cover          text,
  linked_work_id text,
  data           jsonb not null default '{}'
);

alter table user_tracks enable row level security;
create policy "Users manage own tracks"
  on user_tracks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table user_albums (
  id           text primary key,
  user_id      uuid references auth.users not null,
  title        text not null default '',
  type         text not null default 'album',
  status       text not null default 'en_production',
  artist       text not null default '',
  release_date text not null default '',
  upc_ean      text not null default '',
  track_ids    jsonb not null default '[]',
  label        text,
  genre        text,
  editor       text,
  distribution text,
  notes        text not null default '',
  cover        text,
  guests       jsonb not null default '[]',
  data         jsonb not null default '{}'
);

alter table user_albums enable row level security;
create policy "Users manage own albums"
  on user_albums for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table user_sessions (
  id           text primary key,
  user_id      uuid references auth.users not null,
  title        text not null default '',
  date         text,
  data         jsonb not null default '{}'
);

alter table user_sessions enable row level security;
create policy "Users manage own sessions"
  on user_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table user_podcasts (
  id           text primary key,
  user_id      uuid references auth.users not null,
  title        text not null default '',
  artists      text not null default '',
  published_on text not null default '',
  is_video     boolean not null default false,
  is_live      boolean not null default false,
  status       text not null default 'en_production',
  release_date text not null default '',
  tracklist    jsonb not null default '[]',
  cover        text,
  data         jsonb not null default '{}'
);

alter table user_podcasts enable row level security;
create policy "Users manage own podcasts"
  on user_podcasts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Migration 8 — Edition

```sql
create table user_works (
  id                    text primary key,
  user_id               uuid references auth.users not null,
  artist_name           text not null default '',
  title                 text not null default '',
  status                text not null default 'in-progress',
  persons               jsonb not null default '[]',
  dep_repartition       jsonb not null default '{"authors":33.33,"composers":33.33,"publishers":33.33}',
  drm_repartition       jsonb not null default '{"authors":25,"composers":25,"publishers":50}',
  splits_authors        jsonb not null default '[]',
  splits_composers      jsonb not null default '[]',
  self_published        boolean not null default true,
  external_publishers   jsonb not null default '[]',
  iswc                  text not null default '',
  first_exploitation_date text not null default '',
  genre                 text not null default '',
  duration              text not null default '',
  files                 jsonb not null default '{}',
  exploitation_types    jsonb not null default '[]',
  first_broadcaster     text not null default '',
  worldwide_rights      boolean not null default true,
  territories           jsonb not null default '[]',
  notes                 text not null default '',
  linked_track_ids      jsonb not null default '[]'
);

alter table user_works enable row level security;
create policy "Users manage own works"
  on user_works for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table user_sync_data (
  work_id         text not null,
  user_id         uuid references auth.users not null,
  status          text not null default 'not-ready',
  moods           jsonb not null default '[]',
  tempo           text not null default '',
  pitch_short     text not null default '',
  usage_context   text not null default '',
  themes          jsonb not null default '[]',
  private_links   jsonb not null default '[]',
  exploitants     jsonb not null default '[]',
  primary key (user_id, work_id)
);

alter table user_sync_data enable row level security;
create policy "Users manage own sync data"
  on user_sync_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Migration 9 — Dashboard / Profile

```sql
create table user_profiles (
  user_id      uuid primary key references auth.users not null,
  display_name text,
  data         jsonb not null default '{}'
);

alter table user_profiles enable row level security;
create policy "Users manage own profile"
  on user_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## Pattern hooks (identique pour chaque module)

Chaque module suit le même pattern que `useTasksData` :

```ts
// src/hooks/use<Module>Data.ts
export function use<Module>Data() {
  const [items, setItemsState] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chargement initial
  useEffect(() => { /* select from supabase */ }, []);

  // Écriture optimiste avec diff et rollback
  const setItems = useCallback((fn: (prev: Entity[]) => Entity[]) => {
    let snapshot: Entity[] = [];
    let next: Entity[] = [];
    setItemsState((prev) => { snapshot = prev; next = fn(prev); return next; });
    // async: upsert / delete + rollback on error
  }, []);

  return { items, setItems, loading, error };
}
```

### Migration 10 — Revenus (Incomes)

Ces modules utilisent déjà des clés localStorage dédiées (pas `sidekick-data`), mais doivent être migrés vers Supabase pour la beta.

```sql
-- Missions intermittence (anciennement dans admin, maintenant dans revenus)
create table user_intermittence_missions (
  id           text primary key,
  user_id      uuid references auth.users not null,
  date         text not null default '',
  employer     text not null default '',
  type         text not null default 'Spectacle',
  hours        numeric not null default 0,
  gross_amount numeric not null default 0,
  charges      numeric not null default 0,
  net_amount   numeric not null default 0,
  notes        text not null default ''
);

alter table user_intermittence_missions enable row level security;
create policy "Users manage own intermittence missions"
  on user_intermittence_missions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Factures
create table user_invoices (
  id           text primary key,
  user_id      uuid references auth.users not null,
  number       text not null default '',
  client       text not null default '',
  amount       text not null default '',
  due_date     text not null default '',
  status       text not null default 'en_attente',
  lines        jsonb not null default '[]'
);

alter table user_invoices enable row level security;
create policy "Users manage own invoices"
  on user_invoices for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Royalties — imports CSV (une ligne par distributeur par import)
create table user_royalties_imports (
  user_id      uuid references auth.users not null,
  distributor  text not null,
  data         jsonb not null default '{}',
  primary key (user_id, distributor)
);

alter table user_royalties_imports enable row level security;
create policy "Users manage own royalties imports"
  on user_royalties_imports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Royalties — entrées manuelles
create table user_royalties_manual (
  id           text primary key,
  user_id      uuid references auth.users not null,
  data         jsonb not null default '{}'
);

alter table user_royalties_manual enable row level security;
create policy "Users manage own royalties manual entries"
  on user_royalties_manual for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## Hors scope

- `preferences` — reste en localStorage (enabledModules, aiTaskInstructions)
- Supabase Realtime
