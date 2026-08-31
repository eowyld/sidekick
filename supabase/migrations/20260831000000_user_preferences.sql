-- Préférences utilisateur : visibilité des modules + état de l'onboarding.
-- Remplace le stockage localStorage `sidekick-data-{userId}.preferences`,
-- qui ne survivait pas à un changement de navigateur et rendait la
-- répartition des secteurs illisible côté produit.
--
-- Écrite pour être rejouable : un premier passage interrompu laisse la table
-- créée sans ses policies, le fichier doit pouvoir repartir de n'importe quel
-- état intermédiaire.

create table if not exists public.user_preferences (
    user_id uuid not null primary key,
    -- Visibilité des modules. Clé absente = module activé (sémantique
    -- historique `enabledModules.x !== false`, conservée par le hook).
    enabled_modules jsonb not null default '{}'::jsonb,
    -- Horodatage de fin d'onboarding. NULL = onboarding à présenter.
    onboarding_completed_at timestamptz,
    -- Secteurs déclarés à l'inscription (live / phono / edition).
    -- Redondant avec enabled_modules, mais fige le choix initial : c'est
    -- cette colonne qui donne la répartition des testeurs au J14, sans
    -- être polluée par les changements de réglages ultérieurs.
    onboarding_sectors text[] not null default '{}'::text[],
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'user_preferences_user_id_fkey'
    ) then
        alter table only public.user_preferences
            add constraint user_preferences_user_id_fkey
            foreign key (user_id) references auth.users(id) on delete cascade;
    end if;
end
$$;

alter table public.user_preferences enable row level security;

drop policy if exists "Users can manage own preferences" on public.user_preferences;
create policy "Users can manage own preferences" on public.user_preferences
    using ((user_id = auth.uid()))
    with check ((user_id = auth.uid()));

grant all on table public.user_preferences to anon;
grant all on table public.user_preferences to authenticated;
grant all on table public.user_preferences to service_role;
