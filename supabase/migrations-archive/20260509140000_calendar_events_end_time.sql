alter table public.calendar_events
  add column if not exists end_time time null;

comment on column public.calendar_events.end_time is 'Heure de fin (événements avec time ; défaut +1h si non renseigné côté app).';

update public.calendar_events
set end_time = (time + interval '1 hour')::time
where time is not null and end_time is null;
