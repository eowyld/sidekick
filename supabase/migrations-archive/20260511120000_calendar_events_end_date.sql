-- Plage de dates pour les événements (dont personnalisés) : fin inclusive.
alter table public.calendar_events
  add column if not exists end_date date;

update public.calendar_events
  set end_date = date
  where end_date is null;

alter table public.calendar_events
  alter column end_date set not null;

comment on column public.calendar_events.end_date is 'Date de fin inclusive ; égale à date pour un événement d’un jour.';
