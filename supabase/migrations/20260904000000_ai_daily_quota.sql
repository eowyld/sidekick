-- Quota quotidien des suggestions IA.
--
-- Le cache par jour évitait déjà les appels répétés, mais `force=true` le
-- contournait sans limite : un compte authentifié pouvait relancer la
-- génération en boucle et consommer le budget Anthropic.
--
-- On compte les générations réelles de la journée pour pouvoir les borner.

alter table public.task_suggestions
    add column if not exists generation_count integer not null default 1;
