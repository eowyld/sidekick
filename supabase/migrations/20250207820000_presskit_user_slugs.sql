-- Un lien unique par utilisateur : slug stable, page mise à jour à chaque enregistrement
create table if not exists public.presskit_user_slugs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slug text unique not null,
  payload jsonb not null,
  updated_at timestamptz default now()
);

alter table public.presskit_user_slugs enable row level security;

create policy "Anyone can read presskit user slugs"
  on public.presskit_user_slugs
  for select
  using (true);

create policy "Users can insert own presskit slug"
  on public.presskit_user_slugs
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own presskit slug"
  on public.presskit_user_slugs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
