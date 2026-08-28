-- Projets Hub — Phase 2 : budget prévisionnel + dépenses réelles.
-- À exécuter dans le SQL Editor Supabase (Dashboard → SQL Editor).

-- 1. Postes du budget prévisionnel
create table if not exists public.user_project_budget_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.user_projects(id) on delete cascade,
  kind text not null default 'expense',   -- 'expense' | 'income'
  category text not null default '',
  label text not null,
  amount_planned numeric(12,2) not null default 0,
  created_at timestamptz default now()
);

create index if not exists idx_budget_lines_project_id on public.user_project_budget_lines(project_id);

alter table public.user_project_budget_lines enable row level security;

drop policy if exists "Users can manage own budget lines" on public.user_project_budget_lines;
create policy "Users can manage own budget lines"
  on public.user_project_budget_lines for all
  using (
    project_id in (
      select id from public.user_projects where user_id = auth.uid()
    )
  )
  with check (
    project_id in (
      select id from public.user_projects where user_id = auth.uid()
    )
  );

-- 2. Dépenses réelles
create table if not exists public.user_project_expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.user_projects(id) on delete cascade,
  label text not null,
  category text not null default '',
  amount numeric(12,2) not null default 0,
  date date not null,
  notes text default '',
  created_at timestamptz default now()
);

create index if not exists idx_expenses_project_id on public.user_project_expenses(project_id);

alter table public.user_project_expenses enable row level security;

drop policy if exists "Users can manage own project expenses" on public.user_project_expenses;
create policy "Users can manage own project expenses"
  on public.user_project_expenses for all
  using (
    project_id in (
      select id from public.user_projects where user_id = auth.uid()
    )
  )
  with check (
    project_id in (
      select id from public.user_projects where user_id = auth.uid()
    )
  );
