-- Jetons OAuth mail (Gmail, Outlook) hors de `user_metadata`.
--
-- `raw_user_meta_data` est lisible et modifiable depuis le navigateur : un
-- refresh token `gmail.send` y était exposé à tout script de la page. Ici, la
-- colonne `refresh_token` n'est accordée ni à `anon` ni à `authenticated` :
-- seules les routes serveur, avec la clé de service, la lisent.
--
-- Additive et rejouable. Le code du 21/09 écrit dans la table ET dans les
-- métadonnées, et lit la table en premier avec repli sur les métadonnées : il
-- fonctionne avant comme après cette migration. Le nettoyage des métadonnées
-- est une étape séparée (voir docs/superpowers/plans/2026-09-21-mail-tokens-table.md).

create table if not exists public.user_mail_connections (
    user_id uuid not null references auth.users(id) on delete cascade,
    provider text not null check (provider in ('gmail', 'outlook')),
    email text,
    refresh_token text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (user_id, provider)
);

alter table public.user_mail_connections enable row level security;

drop policy if exists "Users read own mail connections" on public.user_mail_connections;
create policy "Users read own mail connections"
    on public.user_mail_connections for select to authenticated
    using (user_id = auth.uid());

drop policy if exists "Users delete own mail connections" on public.user_mail_connections;
create policy "Users delete own mail connections"
    on public.user_mail_connections for delete to authenticated
    using (user_id = auth.uid());

-- Privilèges de colonne : le jeton n'est jamais lisible côté navigateur.
revoke all on public.user_mail_connections from anon, authenticated;
grant select (user_id, provider, email, created_at, updated_at)
    on public.user_mail_connections to authenticated;
grant delete on public.user_mail_connections to authenticated;

-- Reprise des connexions existantes. Les faux jetons (`ya29.`, access tokens
-- stockés par l'ancien /auth/callback) ne sont pas repris : ils n'ont jamais
-- permis d'envoyer quoi que ce soit.
insert into public.user_mail_connections (user_id, provider, email, refresh_token)
select id, 'gmail',
       coalesce(raw_user_meta_data->>'gmail_email', raw_user_meta_data->>'mail_from'),
       raw_user_meta_data->>'gmail_refresh_token'
from auth.users
where coalesce(raw_user_meta_data->>'gmail_refresh_token', '') <> ''
  and raw_user_meta_data->>'gmail_refresh_token' not like 'ya29.%'
on conflict (user_id, provider) do nothing;

insert into public.user_mail_connections (user_id, provider, email, refresh_token)
select id, 'outlook',
       coalesce(raw_user_meta_data->>'outlook_email', raw_user_meta_data->>'mail_from'),
       raw_user_meta_data->>'outlook_refresh_token'
from auth.users
where coalesce(raw_user_meta_data->>'outlook_refresh_token', '') <> ''
on conflict (user_id, provider) do nothing;
