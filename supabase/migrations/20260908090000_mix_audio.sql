-- Hébergement audio des mixes.
--
-- Les longs formats (DJ set, live set, mix, émission) n'avaient que des
-- métadonnées et une tracklist : rien à lire. Ils reçoivent ici les mêmes
-- colonnes qu'une version de titre, pour entrer dans la file du lecteur.
--
-- Le fichier lui-même vit dans le bucket `drive`, comme pour les versions :
-- ces colonnes n'en stockent que la référence.

alter table public.user_phono_mixes
  add column if not exists audio_path text,
  add column if not exists audio_source text,
  add column if not exists audio_name text,
  add column if not exists duration_ms bigint,
  add column if not exists size_bytes bigint,
  -- Les peaks sont ~400 flottants pré-calculés au navigateur : stockés en
  -- JSON, la forme d'onde s'affiche sans décoder le fichier.
  add column if not exists peaks jsonb;

alter table public.user_phono_mixes
  drop constraint if exists user_phono_mixes_audio_source_check;

alter table public.user_phono_mixes
  add constraint user_phono_mixes_audio_source_check
  check (audio_source is null or audio_source in ('upload', 'drive'));
