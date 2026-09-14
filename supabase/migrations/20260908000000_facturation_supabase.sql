-- Facturation : sortie des dernières données de localStorage.
--
-- Deux choses restaient hors base :
--   1. le modèle de facture et le pied de page réutilisé (préférences) ;
--   2. le rattachement d'une facture à un statut juridique, qui vivait dans la
--      clé localStorage `incomes:invoice-status-scope-map`. C'est lui qui
--      décide de quelle entité relève une facture : perdu au changement de
--      navigateur, les totaux par statut de la Comptabilité deviennent faux.

-- ─── Préférences de facturation ──────────────────────────────────────────────

alter table public.user_preferences
  -- Modèle visuel du PDF (couleur d'accent, police, logo en data URL, CGV).
  -- NULL = l'utilisateur n'a jamais touché aux réglages, on sert le défaut.
  add column if not exists invoice_template jsonb,
  -- Pied de facture mémorisé à la première saisie et proposé aux suivantes.
  add column if not exists invoice_footer_note text;

-- ─── Rattachement facture → statut juridique ─────────────────────────────────

alter table public.user_invoices
  add column if not exists statut_juridique_id text
    references public.user_admin_statuses(id) on delete set null;

create index if not exists user_invoices_statut_juridique_id_idx
  on public.user_invoices (statut_juridique_id);

-- ─── Filet : même colonne côté missions ──────────────────────────────────────
--
-- `useIncomesData.missionToRow` écrit déjà `statut_juridique_id` sur les
-- missions d'intermittence, mais la colonne est absente de la baseline
-- resynchronisée sur la production le 28/08 — elle n'existe que dans
-- `supabase/migrations-archive/20260625140000_…`. Si elle manque vraiment en
-- production, tout enregistrement de mission y échoue. `if not exists` rend la
-- ligne inoffensive dans le cas contraire.

alter table public.user_intermittence_missions
  add column if not exists statut_juridique_id text
    references public.user_admin_statuses(id) on delete set null;

create index if not exists user_intermittence_missions_statut_juridique_id_idx
  on public.user_intermittence_missions (statut_juridique_id);
