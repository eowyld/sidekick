-- Versions retenues sur un album.
--
-- `track_ids` dit quels titres composent l'album et dans quel ordre, mais pas
-- quelle version de chacun part sur la sortie. Faute de cette information,
-- tout ce qui lit un album prenait « la première version pourvue d'un
-- fichier » (`pickVersion`, la file du lecteur, le composeur de liens
-- d'écoute) : un choix arbitraire, invisible et impossible à corriger depuis
-- l'interface.
--
-- La colonne associe à chaque `trackId` la liste ordonnée des `versionId`
-- retenus. Une liste, pas un identifiant unique : un album porte couramment
-- deux déclinaisons d'un même titre (Master et Radio Edit), qui y comptent
-- pour deux pistes distinctes.
--
-- Trois états, volontairement distincts :
--   * clé absente     → album d'avant cette colonne : le repli historique
--                       s'applique (première version avec fichier).
--   * liste vide      → choix explicite de n'inclure aucune version de ce
--                       titre pour l'instant (audio pas encore prêt).
--   * liste remplie   → les versions retenues, dans l'ordre d'écoute.
--
-- Rien à migrer sur l'existant : le défaut `{}` laisse chaque album déjà
-- enregistré sur le repli historique, donc au comportement d'aujourd'hui.

alter table public.user_phono_albums
  add column if not exists track_versions jsonb not null default '{}'::jsonb;
