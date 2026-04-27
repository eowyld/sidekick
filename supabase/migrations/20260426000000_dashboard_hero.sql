-- supabase/migrations/20260426000000_dashboard_hero.sql

create table public.user_dashboard_hero (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phrase text not null,
  accent text,
  kind text not null check (kind in ('urgence','event','question','fallback')),
  generated_at timestamptz not null default now()
);

alter table public.user_dashboard_hero enable row level security;

create policy "Users select their own hero phrase"
  on public.user_dashboard_hero for select
  using (auth.uid() = user_id);

create policy "Users insert their own hero phrase"
  on public.user_dashboard_hero for insert
  with check (auth.uid() = user_id);

create policy "Users update their own hero phrase"
  on public.user_dashboard_hero for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
