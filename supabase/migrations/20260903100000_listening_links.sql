-- Liens d'écoute : pages privées composées depuis le catalogue phono et
-- envoyées à des labels / programmateurs.
--
-- Principe « référence vivante + copie de sécurité » : un item pointe vers le
-- catalogue par `source_id`, mais `snapshot` fige à l'ajout tout ce que la page
-- publique affiche. Supprimer un titre du catalogue ne casse donc jamais une
-- page déjà chez un label.
--
-- Écrite pour être rejouable : un premier passage interrompu doit pouvoir
-- repartir de n'importe quel état intermédiaire.

create table if not exists public.user_listening_links (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    -- Slug aléatoire non devinable : c'est la première ligne de défense.
    slug text not null unique,
    title text not null default '',
    intro_message text not null default '',
    cover_path text,
    -- NULL = pas de mot de passe. Format scrypt$sel$empreinte.
    password_hash text,
    -- NULL = pas d'expiration. Modifiable à tout moment.
    expires_at timestamptz,
    allow_download boolean not null default false,
    presskit_url text,
    -- Kill switch : coupe la page en conservant l'historique d'écoute,
    -- contrairement à la suppression qui efface tout en cascade.
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.user_listening_link_items (
    id uuid primary key default gen_random_uuid(),
    link_id uuid not null references public.user_listening_links(id) on delete cascade,
    position integer not null default 0,
    -- Nom du projet quand un album a été ajouté en bloc : la page publique en
    -- fait un intertitre de section. NULL pour un titre isolé.
    group_label text,
    kind text not null default 'track',
    source_id text not null default '',
    version_id text,
    -- Copie de sécurité : titre, artiste, invités, version, ISRC, crédits.
    snapshot jsonb not null default '{}'::jsonb,
    audio_path text not null default '',
    duration_ms integer not null default 0,
    peaks jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists user_listening_link_items_link_id_idx
    on public.user_listening_link_items (link_id, position);

create table if not exists public.user_listening_invites (
    id uuid primary key default gen_random_uuid(),
    link_id uuid not null references public.user_listening_links(id) on delete cascade,
    contact_id text,
    contact_name text not null default '',
    contact_email text not null default '',
    sent_at timestamptz not null default now(),
    first_opened_at timestamptz
);

create index if not exists user_listening_invites_link_id_idx
    on public.user_listening_invites (link_id);

create table if not exists public.user_listening_sessions (
    id uuid primary key default gen_random_uuid(),
    link_id uuid not null references public.user_listening_links(id) on delete cascade,
    invite_id uuid references public.user_listening_invites(id) on delete set null,
    -- NULL = le pro a choisi « écouter sans m'identifier ».
    visitor_name text,
    user_agent text,
    -- Empreinte, jamais l'IP en clair : on veut distinguer des sessions,
    -- pas constituer un fichier d'adresses.
    ip_hash text,
    created_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now()
);

create index if not exists user_listening_sessions_link_id_idx
    on public.user_listening_sessions (link_id, created_at desc);

create table if not exists public.user_listening_plays (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.user_listening_sessions(id) on delete cascade,
    item_id uuid not null references public.user_listening_link_items(id) on delete cascade,
    listened_ms integer not null default 0,
    max_position_ms integer not null default 0,
    play_count integer not null default 0,
    completed boolean not null default false,
    downloaded boolean not null default false,
    updated_at timestamptz not null default now(),
    unique (session_id, item_id)
);

-- Clé étrangère vers auth.users posée séparément pour rester rejouable.
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'user_listening_links_user_id_fkey'
    ) then
        alter table only public.user_listening_links
            add constraint user_listening_links_user_id_fkey
            foreign key (user_id) references auth.users(id) on delete cascade;
    end if;
end
$$;

-- RLS : l'artiste ne voit que ses liens. Les visiteurs n'ont aucun accès
-- direct — les routes publiques passent par le service role après avoir
-- validé le slug et l'état du lien.
alter table public.user_listening_links enable row level security;
alter table public.user_listening_link_items enable row level security;
alter table public.user_listening_invites enable row level security;
alter table public.user_listening_sessions enable row level security;
alter table public.user_listening_plays enable row level security;

drop policy if exists "Users manage own listening links" on public.user_listening_links;
create policy "Users manage own listening links" on public.user_listening_links
    using ((user_id = auth.uid()))
    with check ((user_id = auth.uid()));

drop policy if exists "Users manage own listening items" on public.user_listening_link_items;
create policy "Users manage own listening items" on public.user_listening_link_items
    using (exists (
        select 1 from public.user_listening_links l
        where l.id = link_id and l.user_id = auth.uid()
    ))
    with check (exists (
        select 1 from public.user_listening_links l
        where l.id = link_id and l.user_id = auth.uid()
    ));

drop policy if exists "Users manage own listening invites" on public.user_listening_invites;
create policy "Users manage own listening invites" on public.user_listening_invites
    using (exists (
        select 1 from public.user_listening_links l
        where l.id = link_id and l.user_id = auth.uid()
    ))
    with check (exists (
        select 1 from public.user_listening_links l
        where l.id = link_id and l.user_id = auth.uid()
    ));

drop policy if exists "Users read own listening sessions" on public.user_listening_sessions;
create policy "Users read own listening sessions" on public.user_listening_sessions
    using (exists (
        select 1 from public.user_listening_links l
        where l.id = link_id and l.user_id = auth.uid()
    ))
    with check (exists (
        select 1 from public.user_listening_links l
        where l.id = link_id and l.user_id = auth.uid()
    ));

drop policy if exists "Users read own listening plays" on public.user_listening_plays;
create policy "Users read own listening plays" on public.user_listening_plays
    using (exists (
        select 1
        from public.user_listening_sessions s
        join public.user_listening_links l on l.id = s.link_id
        where s.id = session_id and l.user_id = auth.uid()
    ))
    with check (exists (
        select 1
        from public.user_listening_sessions s
        join public.user_listening_links l on l.id = s.link_id
        where s.id = session_id and l.user_id = auth.uid()
    ));

-- Agrégation atomique d'un heartbeat. Un read-modify-write applicatif
-- perdrait des incréments quand deux requêtes se croisent.
create or replace function public.listening_record_event(
    p_session_id uuid,
    p_item_id uuid,
    p_kind text,
    p_listened_ms_delta integer default 0,
    p_position_ms integer default 0,
    p_completed boolean default false
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.user_listening_plays as p (
        session_id, item_id, listened_ms, max_position_ms,
        play_count, completed, downloaded, updated_at
    )
    values (
        p_session_id, p_item_id, greatest(p_listened_ms_delta, 0), greatest(p_position_ms, 0),
        case when p_kind = 'play' then 1 else 0 end,
        p_completed,
        p_kind = 'download',
        now()
    )
    on conflict (session_id, item_id) do update set
        listened_ms = p.listened_ms + greatest(p_listened_ms_delta, 0),
        max_position_ms = greatest(p.max_position_ms, greatest(p_position_ms, 0)),
        play_count = p.play_count + case when p_kind = 'play' then 1 else 0 end,
        completed = p.completed or p_completed,
        downloaded = p.downloaded or (p_kind = 'download'),
        updated_at = now();

    update public.user_listening_sessions
        set last_seen_at = now()
        where id = p_session_id;
end;
$$;

grant all on table public.user_listening_links to anon, authenticated, service_role;
grant all on table public.user_listening_link_items to anon, authenticated, service_role;
grant all on table public.user_listening_invites to anon, authenticated, service_role;
grant all on table public.user_listening_sessions to anon, authenticated, service_role;
grant all on table public.user_listening_plays to anon, authenticated, service_role;
grant execute on function public.listening_record_event(uuid, uuid, text, integer, integer, boolean) to service_role;
