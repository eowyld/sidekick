create table if not exists user_tasks (
  id           text primary key,
  user_id      uuid references auth.users not null,
  title        text not null,
  status       text not null default 'todo',
  today_focus  boolean not null default false,
  description  text,
  deadline     text,
  sector       text,
  created_at   text,
  subtasks     jsonb not null default '[]'
);

alter table user_tasks enable row level security;

drop policy if exists "Users manage own tasks" on user_tasks;
create policy "Users manage own tasks"
  on user_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
