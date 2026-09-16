-- Droit à l'effacement : la suppression d'un compte doit emporter ses données.
--
-- Une vingtaine de tables (user_contacts, user_admin_*, user_equipment_*,
-- user_intermittence_missions, user_live_prospection, user_marketing_*,
-- task_suggestions…) référencent auth.users sans ON DELETE : Postgres refuse
-- alors la suppression de l'utilisateur (« Database error deleting user »),
-- et une demande RGPD ne peut pas être honorée depuis le dashboard.
--
-- On ne touche qu'aux clés en NO ACTION / RESTRICT. Celles déjà en CASCADE ou
-- en SET NULL sont laissées telles quelles : un SET NULL est un choix explicite.
-- La boucle lit le catalogue plutôt qu'une liste en dur, pour couvrir aussi les
-- tables créées après la baseline.
--
-- Ne couvre pas Supabase Storage : les fichiers du bucket `drive` sous
-- `{userId}/` se suppriment à part, voir docs/legal/registre-rgpd.md.

do $$
declare
  r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl, pg_get_constraintdef(c.oid) as def
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where c.contype = 'f'
      and c.confrelid = 'auth.users'::regclass
      and n.nspname = 'public'
      and c.confdeltype in ('a', 'r')
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format(
      'alter table %s add constraint %I %s on delete cascade',
      r.tbl,
      r.conname,
      regexp_replace(r.def, '\s+on delete (no action|restrict)', '', 'i')
    );
    raise notice 'cascade: %.%', r.tbl, r.conname;
  end loop;
end
$$;
