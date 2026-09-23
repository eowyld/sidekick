-- Limiteur de débit partagé entre les instances Vercel.
--
-- `src/lib/rate-limit.ts` compte en mémoire : chaque instance a son compteur,
-- perdu à froid. Cette table donne un compteur unique. Le code du 21/09
-- (`rate-limit-shared.ts`) l'appelle via la clé de service et retombe sur le
-- compteur en mémoire si la fonction n'existe pas : migration additive, sans
-- ordre imposé avec le déploiement.

create table if not exists public.rate_limits (
    key text primary key,
    count integer not null,
    reset_at timestamptz not null
);

-- RLS sans aucune policy : seul le rôle de service (qui la contourne) y accède.
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_ms integer)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
    r public.rate_limits;
begin
    -- Fenêtre fixe, atomique : l'upsert verrouille la ligne, deux instances
    -- simultanées ne peuvent pas lire le même compteur.
    insert into public.rate_limits as rl (key, count, reset_at)
    values (p_key, 1, now() + make_interval(secs => p_window_ms / 1000.0))
    on conflict (key) do update
        set count    = case when rl.reset_at <= now() then 1 else rl.count + 1 end,
            reset_at = case when rl.reset_at <= now() then excluded.reset_at else rl.reset_at end
    returning * into r;

    -- Purge opportuniste des fenêtres expirées depuis plus d'un jour.
    if random() < 0.01 then
        delete from public.rate_limits where reset_at < now() - interval '1 day';
    end if;

    allowed := r.count <= p_limit;
    retry_after := case
        when allowed then 0
        else greatest(1, ceil(extract(epoch from (r.reset_at - now())))::integer)
    end;
    return next;
end
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
