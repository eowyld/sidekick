-- Table des campagnes mailing pour historique, tracking ouvertures et clics
create table if not exists public.mailing_campaigns (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  date_envoi timestamptz,
  envoyes int not null default 0,
  from_email text,
  subject text,
  accroche text,
  content_html text,
  ouverts int not null default 0,
  pct_ouverture numeric(5,2) default 0,
  clics int not null default 0,
  pct_clics numeric(5,2) default 0,
  updated_at timestamptz default now()
);

-- Index pour filtrer par utilisateur
create index if not exists idx_mailing_campaigns_user_id on public.mailing_campaigns(user_id);

-- RLS : l'utilisateur ne voit que ses campagnes
alter table public.mailing_campaigns enable row level security;

create policy "Users can manage own mailing campaigns"
  on public.mailing_campaigns
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
