-- Live : une entrée de prospection peut être rattachée à une tournée
-- (user_live_productions.id, kind = 'tour'). Pas de clé étrangère : les liens
-- Live (details.productionId / tourId) n'en ont pas non plus, et une tournée
-- supprimée ne doit pas emporter l'historique de démarchage.
alter table public.user_live_prospection add column if not exists tour_id text;
