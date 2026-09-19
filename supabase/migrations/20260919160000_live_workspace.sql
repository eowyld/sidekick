-- Live: reusable shows / DJ sets / independent tours, event-specific preparation.
alter table public.user_tour_dates add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.user_rehearsals add column if not exists details jsonb not null default '{}'::jsonb;
create table if not exists public.user_live_productions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  kind text not null check (kind in ('show', 'dj', 'tour')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.user_live_productions enable row level security;
create policy "Users manage own live productions" on public.user_live_productions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.user_live_productions to authenticated;
create index if not exists user_live_productions_user_id_idx on public.user_live_productions(user_id);
