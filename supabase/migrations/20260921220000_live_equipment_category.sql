-- Live : chaque matériel de l'inventaire a une catégorie (Son, Lumière, Scène et
-- implantation, Autre). Les lignes existantes passent en « other » : l'artiste les
-- reclasse depuis le module Matériel. Le `check` est posé avec la colonne, donc la
-- migration reste rejouable (la colonne existe déjà = rien ne se passe).
alter table public.user_equipment_inventory
  add column if not exists category text not null default 'other'
  check (category in ('sound', 'light', 'stage', 'other'));
