-- Accord de répartition d'une œuvre, validé en ligne par chaque co-auteur.
--
-- Un accord est une version figée (`snapshot`) de la répartition d'une œuvre.
-- Modifier la répartition crée la version suivante ; l'ancienne passe
-- `superseded` et reste consultable. Un seul accord actif par œuvre.
--
-- Chaque signataire reçoit un lien personnel. Le jeton n'est jamais stocké en
-- clair : seule son empreinte SHA-256 l'est.
--
-- RLS en lecture seule pour le propriétaire : toutes les écritures passent par
-- les routes API (clé service). C'est ce qui garantit qu'une validation vient
-- bien du co-auteur et non de l'artiste qui aurait coché à sa place.
--
-- Écrite pour être rejouable.

create table if not exists public.user_edition_agreements (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    work_id text not null references public.user_edition_works(id) on delete cascade,
    version integer not null default 1,
    snapshot jsonb not null default '{}'::jsonb,
    status text not null default 'pending'
        check (status in ('pending', 'validated', 'contested', 'superseded', 'cancelled')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists user_edition_agreements_user_idx
    on public.user_edition_agreements (user_id, work_id);

-- Un seul accord actif par œuvre.
create unique index if not exists user_edition_agreements_one_active
    on public.user_edition_agreements (work_id)
    where status in ('pending', 'validated', 'contested');

create table if not exists public.user_edition_agreement_signers (
    id uuid primary key default gen_random_uuid(),
    agreement_id uuid not null references public.user_edition_agreements(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    person_id text not null,
    display_name text not null default '',
    token_hash text not null unique,
    email text,
    status text not null default 'pending'
        check (status in ('pending', 'validated', 'contested')),
    -- Ce que le co-auteur a complété : nom civil, pseudonyme, IPI, sociétaire.
    info jsonb,
    comment text,
    is_owner boolean not null default false,
    sent_at timestamptz,
    opened_at timestamptz,
    responded_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists user_edition_agreement_signers_agreement_idx
    on public.user_edition_agreement_signers (agreement_id);

alter table public.user_edition_agreements enable row level security;
alter table public.user_edition_agreement_signers enable row level security;

drop policy if exists "Users read own edition agreements" on public.user_edition_agreements;
create policy "Users read own edition agreements" on public.user_edition_agreements
    for select using ((user_id = auth.uid()));

drop policy if exists "Users read own edition agreement signers" on public.user_edition_agreement_signers;
create policy "Users read own edition agreement signers" on public.user_edition_agreement_signers
    for select using ((user_id = auth.uid()));

-- L'empreinte du jeton ne sort jamais vers le navigateur, même celui du
-- propriétaire : la colonne est retirée du droit de lecture.
revoke select on public.user_edition_agreement_signers from anon, authenticated;
grant select (
    id, agreement_id, user_id, person_id, display_name, email, status, info,
    comment, is_owner, sent_at, opened_at, responded_at, created_at
) on public.user_edition_agreement_signers to authenticated;
