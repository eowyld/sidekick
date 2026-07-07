-- Onglet Création : ajout de la phase (creation | production | sortie) aux étapes.
-- À exécuter dans le SQL Editor Supabase (Dashboard → SQL Editor).

alter table public.user_project_creation_steps
  add column if not exists phase text not null default 'creation';

-- Reset one-shot (dev, pré-beta) : le modèle passe de « templates par secteur »
-- à « templates ventilés par phase ». On repart propre pour re-seeder correctement.
delete from public.user_project_creation_steps;
update public.user_projects set creation_seeded_sectors = '[]'::jsonb;
