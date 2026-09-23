-- Interrupteur du logo par lien d'écoute, à côté du choix de la cover.
-- Indépendant de artist_logo_exports.listening (le réglage de compte) : les
-- deux doivent être vrais pour que le logo apparaisse sur un lien donné.
alter table public.user_listening_links
  add column if not exists show_logo boolean not null default true;
