-- Manifeste des données d'exemple insérées à l'onboarding.
--
-- Forme : { "user_tasks": ["id1", "id2"], "user_tour_dates": [...], ... }
-- Chaque clé est un nom de table, chaque valeur la liste des identifiants créés
-- par le seed. La suppression depuis les réglages relit ce manifeste et n'efface
-- que ces lignes — ce que l'utilisateur a saisi lui-même n'est jamais touché.
--
-- Ce choix évite d'ajouter une colonne `is_demo` sur la vingtaine de tables
-- métier, avec la migration et les adaptations de code que cela impliquerait.
--
-- Rejouable : un premier passage interrompu doit pouvoir repartir.

alter table public.user_preferences
    add column if not exists demo_seed jsonb;

comment on column public.user_preferences.demo_seed is
    'Identifiants des lignes créées par le seed de démonstration, par table. NULL = aucune donnée d''exemple.';
