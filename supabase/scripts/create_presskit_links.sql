-- Crée la table presskit_links si elle n'existe pas.
-- À exécuter dans Supabase Dashboard > SQL Editor > New query.

create table if not exists public.presskit_links (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz default now()
);

alter table public.presskit_links enable row level security;

drop policy if exists "Anyone can read presskit links" on public.presskit_links;
create policy "Anyone can read presskit links"
  on public.presskit_links
  for select
  using (true);

drop policy if exists "Authenticated users can insert presskit links" on public.presskit_links;
drop policy if exists "Anyone can insert presskit links" on public.presskit_links;
create policy "Anyone can insert presskit links"
  on public.presskit_links
  for insert
  with check (true);
