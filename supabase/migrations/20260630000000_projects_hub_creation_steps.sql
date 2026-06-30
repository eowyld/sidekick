-- Projets Hub — Création : étapes de pipeline + brainstorming
-- À exécuter dans le SQL Editor Supabase (Dashboard → SQL Editor).

-- 1. Table des étapes de création
create table if not exists public.user_project_creation_steps (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.user_projects(id) on delete cascade,
  sector             text not null default 'general',
  label              text not null,
  status             text not null default 'todo',
  order_index        int  not null default 0,
  target_date        date null,
  assignee           text not null default '',
  linked_entity_type text not null default '',
  linked_entity_id   text not null default '',
  links              jsonb not null default '[]'::jsonb,
  task_id            uuid null,
  created_at         timestamptz default now()
);

create index if not exists idx_creation_steps_project_id
  on public.user_project_creation_steps(project_id);

alter table public.user_project_creation_steps enable row level security;

drop policy if exists "Users can manage own creation steps"
  on public.user_project_creation_steps;
create policy "Users can manage own creation steps"
  on public.user_project_creation_steps for all
  using (
    project_id in (
      select id from public.user_projects where user_id = auth.uid()
    )
  )
  with check (
    project_id in (
      select id from public.user_projects where user_id = auth.uid()
    )
  );

-- 2. Colonnes sur user_projects
alter table public.user_projects
  add column if not exists brainstorm text not null default '',
  add column if not exists creation_seeded_sectors jsonb not null default '[]'::jsonb;
