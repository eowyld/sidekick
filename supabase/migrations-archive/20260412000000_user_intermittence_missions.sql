create table if not exists user_intermittence_missions (
  id           text primary key,
  user_id      uuid references auth.users not null,
  date         text not null,
  employer     text not null,
  type         text not null,
  hours        numeric not null default 0,
  gross_amount numeric not null default 0,
  charges      numeric not null default 0,
  net_amount   numeric not null default 0,
  notes        text,
  created_at   timestamptz not null default now()
);

alter table user_intermittence_missions enable row level security;

drop policy if exists "Users manage own intermittence missions" on user_intermittence_missions;
create policy "Users manage own intermittence missions"
  on user_intermittence_missions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
