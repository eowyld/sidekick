alter table public.user_phono_sessions
  add column if not exists end_time text not null default '',
  add column if not exists status text not null default 'planned',
  add column if not exists album_ids text[] not null default '{}',
  add column if not exists track_ids text[] not null default '{}',
  add column if not exists mix_ids text[] not null default '{}',
  add column if not exists studio_cost numeric not null default 0,
  add column if not exists other_costs numeric not null default 0,
  add column if not exists presence_enabled boolean not null default false,
  add column if not exists producer jsonb not null default '{}'::jsonb;

comment on column public.user_phono_sessions.participants is
  'Participants, contacts liés et informations facultatives de fiche de présence.';
