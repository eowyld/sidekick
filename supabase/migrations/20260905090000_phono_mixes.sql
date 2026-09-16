-- Renomme user_phono_podcasts en user_phono_mixes et remplace le booléen
-- is_live par un champ format explicite.
--
-- L'onglet « Podcasts » désignait en réalité des longs formats de DJ. Le modèle
-- le montrait déjà : une tracklist { artist, label, time } est le format de
-- déclaration exigé par Mixcloud, Resident Advisor et la SACEM, pas la
-- structure d'un podcast. Ces objets n'ont ni ISRC, ni version, ni
-- distributeur ; leur valeur juridique tient à leur tracklist, qui détermine la
-- répartition des droits vers les ayants droit des titres joués.
--
-- is_video n'est pas touché : il est orthogonal au format. Un live set peut
-- être filmé, c'est même le cas de la plupart des captations diffusées.
--
-- ALTER TABLE ... RENAME conserve policies, index et contraintes.

do $$
begin
  if to_regclass('public.user_phono_podcasts') is not null
     and to_regclass('public.user_phono_mixes') is null then
    alter table public.user_phono_podcasts rename to user_phono_mixes;
  end if;
end $$;

alter table public.user_phono_mixes
  add column if not exists format text not null default 'dj_set';

-- Backfill avant toute suppression : un live set était le seul cas que
-- l'ancien modèle distinguait. Le reste devient dj_set, reclassable à la main
-- depuis l'interface.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_phono_mixes'
      and column_name = 'is_live'
  ) then
    -- SQL dynamique : une référence statique à is_live échoue dès l'analyse
    -- quand une tentative précédente a déjà retiré cette colonne.
    execute $sql$
      update public.user_phono_mixes
      set format = case when is_live then 'live_set' else 'dj_set' end
    $sql$;
  end if;
end $$;

alter table public.user_phono_mixes
  drop constraint if exists user_phono_mixes_format_check;

alter table public.user_phono_mixes
  add constraint user_phono_mixes_format_check
  check (format in ('dj_set', 'live_set', 'mix', 'podcast'));

alter table public.user_phono_mixes
  drop column if exists is_live;

-- La policy a survécu au renommage de la table, mais son nom mentionne encore
-- « podcasts » : une policy mal nommée est un piège pour qui auditera les
-- accès plus tard.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_phono_mixes'
      and policyname = 'user owns podcasts'
  ) and not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_phono_mixes'
      and policyname = 'user owns mixes'
  ) then
    alter policy "user owns podcasts" on public.user_phono_mixes
      rename to "user owns mixes";
  end if;
end $$;
