-- Lie les missions intermittentes à un statut juridique (user_admin_statuses).
-- Colonne nullable : les missions existantes restent valides sans lien.
alter table user_intermittence_missions
  add column if not exists statut_juridique_id text references user_admin_statuses(id) on delete set null;

create index if not exists user_intermittence_missions_statut_idx
  on user_intermittence_missions (statut_juridique_id);
