-- Modules « Mes contrats » : templates, contrats spécifiques et signatures.
-- Exécuter dans le SQL Editor du projet Supabase.

-- -----------------------------------------------------------------------------
-- Contract templates
-- -----------------------------------------------------------------------------
create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  html_content text not null default '',
  variable_keys jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_contract_templates_user_id on public.contract_templates(user_id);

alter table public.contract_templates enable row level security;

drop policy if exists "Users can manage own contract templates" on public.contract_templates;
create policy "Users can manage own contract templates"
  on public.contract_templates for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Signature library per user
-- -----------------------------------------------------------------------------
create table if not exists public.user_contract_signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Signature',
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint,
  is_active boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_user_contract_signatures_user_id on public.user_contract_signatures(user_id);
create unique index if not exists user_contract_signatures_active_unique
  on public.user_contract_signatures(user_id)
  where is_active = true;

alter table public.user_contract_signatures enable row level security;

drop policy if exists "Users can manage own contract signatures" on public.user_contract_signatures;
create policy "Users can manage own contract signatures"
  on public.user_contract_signatures for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Contracts (instances)
-- -----------------------------------------------------------------------------
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.contract_templates(id) on delete cascade,
  title text not null,

  -- Variables (valeurs) utilisées pour générer le contenu.
  variables jsonb not null default '{}'::jsonb,

  -- Contenu HTML final (editable) après substitution.
  html_content text not null default '',

  -- Statut machine : draft | sent | signed
  status text not null default 'draft',
  status_updated_at timestamptz not null default now(),
  signed_at timestamptz,
  sent_at timestamptz,

  -- Signature utilisée pour ce contrat (freezes à la signature).
  signature_id uuid references public.user_contract_signatures(id) on delete set null,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_contracts_user_id on public.contracts(user_id);
create index if not exists idx_contracts_template_id on public.contracts(template_id);
create index if not exists idx_contracts_status on public.contracts(user_id, status);

alter table public.contracts enable row level security;

drop policy if exists "Users can manage own contracts" on public.contracts;
create policy "Users can manage own contracts"
  on public.contracts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

