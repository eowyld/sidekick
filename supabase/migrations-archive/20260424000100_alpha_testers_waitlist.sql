  create table if not exists public.alpha_testers_waitlist (
    id bigint generated always as identity primary key,
    last_name text not null,
    first_name text not null,
    email text not null unique,
    status text not null,
    source text not null default 'sidekick-landing',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint alpha_testers_waitlist_status_check
      check (
        status in (
          'Artiste indépendant',
          'Professionnel de l''industrie musicale',
          'Proche',
          'Etudiant',
          'Développeur'
        )
      )
  );

  create index if not exists alpha_testers_waitlist_created_at_idx
    on public.alpha_testers_waitlist (created_at desc);

  alter table public.alpha_testers_waitlist enable row level security;
