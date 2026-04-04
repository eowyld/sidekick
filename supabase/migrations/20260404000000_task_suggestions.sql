create table task_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  suggestions jsonb not null default '[]',
  created_at timestamptz default now(),
  unique (user_id, date)
);

alter table task_suggestions enable row level security;

create policy "Users manage own suggestions"
  on task_suggestions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
