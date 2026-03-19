-- Table pour les shortlinks presskit (payload stocké côté serveur)
create table if not exists public.presskit_links (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz default now()
);

-- Lecture publique pour permettre d'afficher un presskit partagé sans être connecté
alter table public.presskit_links enable row level security;

create policy "Anyone can read presskit links"
  on public.presskit_links
  for select
  using (true);

-- Tout le monde peut créer un shortlink (création depuis l'app, pas de données sensibles)
create policy "Anyone can insert presskit links"
  on public.presskit_links
  for insert
  with check (true);
