-- Projets Hub — Phase 1 : table user_projects + colonnes de rattachement.
-- À exécuter dans le SQL Editor Supabase (Dashboard → SQL Editor).

-- 1. Table des projets
create table if not exists public.user_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  status text not null default 'idea',         -- idea|in_progress|paused|done|archived
  cover text default '',
  images jsonb not null default '[]'::jsonb,    -- string[]
  sectors jsonb not null default '[]'::jsonb,   -- ('phono'|'edition'|'live')[]
  members jsonb not null default '[]'::jsonb,   -- ProjectMember[]
  linked_albums jsonb not null default '[]'::jsonb,
  linked_tracks jsonb not null default '[]'::jsonb,
  linked_sessions jsonb not null default '[]'::jsonb,
  linked_works jsonb not null default '[]'::jsonb,
  linked_tour_dates jsonb not null default '[]'::jsonb,
  linked_rehearsals jsonb not null default '[]'::jsonb,
  linked_statut_ids jsonb not null default '[]'::jsonb,  -- string[] -> user_admin_statuses.id (phase 4)
  key_dates jsonb not null default '[]'::jsonb,          -- KeyDate[] (temps forts, phase 3)
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_user_projects_user_id on public.user_projects(user_id);

alter table public.user_projects enable row level security;

drop policy if exists "Users can manage own projects" on public.user_projects;
create policy "Users can manage own projects"
  on public.user_projects for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 2. Colonnes project_id sur les entités rattachables (exploitées en phases 2-4)
alter table public.user_invoices
  add column if not exists project_id uuid references public.user_projects(id) on delete set null;
alter table public.user_royalties_manual
  add column if not exists project_id uuid references public.user_projects(id) on delete set null;
alter table public.user_mailing_campaigns
  add column if not exists project_id uuid references public.user_projects(id) on delete set null;
alter table public.user_marketing_events
  add column if not exists project_id uuid references public.user_projects(id) on delete set null;
alter table public.contracts
  add column if not exists project_id uuid references public.user_projects(id) on delete set null;

create index if not exists idx_user_invoices_project_id on public.user_invoices(project_id);
create index if not exists idx_user_royalties_manual_project_id on public.user_royalties_manual(project_id);
create index if not exists idx_user_mailing_campaigns_project_id on public.user_mailing_campaigns(project_id);
create index if not exists idx_user_marketing_events_project_id on public.user_marketing_events(project_id);
create index if not exists idx_contracts_project_id on public.contracts(project_id);
