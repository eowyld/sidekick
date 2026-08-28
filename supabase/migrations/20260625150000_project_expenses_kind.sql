-- Projets Hub — Phase 2b : ajouter kind sur user_project_expenses
-- Permet d'enregistrer des revenus manuels dans le même tableau.
-- À exécuter dans le SQL Editor Supabase (Dashboard → SQL Editor).

alter table public.user_project_expenses
  add column if not exists kind text not null default 'expense';

comment on column public.user_project_expenses.kind is
  '''expense'' | ''income'' — distingue charges réelles et revenus manuels';
