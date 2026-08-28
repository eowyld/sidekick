-- calendar_events: source de vérité centralisée pour tous les événements
create table if not exists public.calendar_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  time         time null,
  label        text not null,
  sub_label    text null,
  sector       text not null,
  type         text not null,
  place        text null,
  source_module text not null,
  source_id    text null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists idx_calendar_events_user_id on public.calendar_events(user_id);
create unique index if not exists idx_calendar_events_source
  on public.calendar_events(user_id, source_module, source_id)
  where source_id is not null;

alter table public.calendar_events enable row level security;

drop policy if exists "Users can manage own calendar events" on public.calendar_events;
create policy "Users can manage own calendar events"
  on public.calendar_events for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ical_tokens: un token par utilisateur, avec secteurs activés
create table if not exists public.ical_tokens (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade unique,
  token            uuid not null default gen_random_uuid() unique,
  enabled_sectors  text[] not null default '{live,phono,admin,marketing,edition,other}',
  created_at       timestamptz default now()
);

alter table public.ical_tokens enable row level security;

drop policy if exists "Users can manage own ical token" on public.ical_tokens;
create policy "Users can manage own ical token"
  on public.ical_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- La route API /api/calendar/ical/[token] tourne côté serveur sans auth JWT
-- Elle a besoin de lire ical_tokens et calendar_events via service role uniquement
-- (pas de politique anon nécessaire — le token secret remplace l'auth)
