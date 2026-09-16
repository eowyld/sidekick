alter table public.user_projects
  add column if not exists target_date date,
  add column if not exists pinned boolean not null default false,
  add column if not exists pinned_order integer not null default 0,
  add column if not exists manual_milestones jsonb not null default '{"editionWritingCompositionDone":false,"liveConceptDone":false,"liveSetlistDone":false,"liveTeamDone":false}'::jsonb,
  add column if not exists objectives jsonb not null default '[]'::jsonb,
  add column if not exists milestone_states jsonb not null default '{}'::jsonb;

comment on column public.user_projects.target_date is
  'Date objectif manuelle, utilisée si aucun jalon lié au projet n''est à venir.';
comment on column public.user_projects.manual_milestones is
  'Jalons projet impossibles à déduire automatiquement des modules.';

create or replace function public.create_project_with_links(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  project_id uuid := coalesce(nullif(payload->>'id', '')::uuid, gen_random_uuid());
  album jsonb;
  work jsonb;
  album_ids jsonb := coalesce(payload->'linkedAlbumIds', '[]'::jsonb);
  work_ids jsonb := coalesce(payload->'linkedWorkIds', '[]'::jsonb);
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if btrim(coalesce(payload->>'title', '')) = '' then raise exception 'title_required'; end if;

  for album in select value from jsonb_array_elements(coalesce(payload->'newAlbums', '[]'::jsonb)) loop
    insert into public.user_phono_albums (
      id, user_id, title, type, status, artist, release_date, upc_ean,
      track_ids, notes, cover, guests
    ) values (
      album->>'id', uid, album->>'title', album->>'type', 'en_production',
      coalesce(album->>'artist', ''), coalesce(album->>'releaseDate', ''), '',
      '{}', '', nullif(album->>'cover', ''), '[]'::jsonb
    );
    album_ids := album_ids || jsonb_build_array(album->>'id');
  end loop;

  for work in select value from jsonb_array_elements(coalesce(payload->'newWorks', '[]'::jsonb)) loop
    insert into public.user_edition_works (
      id, user_id, artist_name, title, status, persons, dep_repartition,
      drm_repartition, splits_authors, splits_composers, self_published,
      external_publishers, iswc, first_exploitation_date, genre, duration,
      files, exploitation_types, first_broadcaster, worldwide_rights,
      territories, notes, linked_track_ids
    ) values (
      work->>'id', uid, coalesce(work->>'artistName', ''), work->>'title',
      'in-progress', '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, '[]'::jsonb,
      '[]'::jsonb, true, '[]'::jsonb, '', '', '', '', '{}'::jsonb,
      '{}', '', true, '{}', '', '{}'
    );
    work_ids := work_ids || jsonb_build_array(work->>'id');
  end loop;

  insert into public.user_projects (
    id, user_id, title, description, status, cover, sectors, linked_albums,
    linked_tracks, linked_works, linked_tour_dates, target_date, objectives,
    milestone_states
  ) values (
    project_id, uid, btrim(payload->>'title'), coalesce(payload->>'description', ''),
    coalesce(payload->>'status', 'in_progress'), coalesce(payload->>'cover', ''),
    coalesce(payload->'sectors', '[]'::jsonb), album_ids,
    coalesce(payload->'linkedTrackIds', '[]'::jsonb), work_ids,
    coalesce(payload->'linkedTourDateIds', '[]'::jsonb),
    nullif(payload->>'targetDate', '')::date,
    coalesce(payload->'objectives', '[]'::jsonb),
    coalesce(payload->'milestoneStates', '{}'::jsonb)
  );

  return project_id;
end;
$$;

grant execute on function public.create_project_with_links(jsonb) to authenticated;
