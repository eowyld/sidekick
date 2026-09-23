-- Logo d'artiste : deux versions (fonds clairs, fonds sombres) et un
-- interrupteur par export. Il fait partie de l'identité de l'artiste, à côté
-- de `artist_name`, et n'est plus un réglage du modèle de facture.
--
-- Reprise : le logo déjà importé dans `invoice_template.logoDataUrl` devient
-- la version claire (il était fait pour la facture blanche). La clé n'est
-- PAS retirée du modèle ici : la version déployée la lit encore, la retirer
-- ferait perdre le logo des factures jusqu'au déploiement. Le nouveau code
-- l'ignore et l'efface à la prochaine écriture du modèle.
--
-- Rejouable : `if not exists` et reprise limitée aux lignes sans logo.

alter table public.user_preferences
  add column if not exists artist_logo text,
  add column if not exists artist_logo_dark text,
  add column if not exists artist_logo_exports jsonb not null
    default '{"invoices": true, "technical": true, "listening": true}'::jsonb;

update public.user_preferences
   set artist_logo = invoice_template->>'logoDataUrl'
 where artist_logo is null
   and invoice_template ? 'logoDataUrl'
   and coalesce(invoice_template->>'logoDataUrl', '') <> '';

comment on column public.user_preferences.artist_logo is
  'Logo pour fonds clairs (PDF), data URL PNG. NULL = pas de logo.';
comment on column public.user_preferences.artist_logo_dark is
  'Logo pour fonds sombres (lien d''écoute, mail d''invitation), data URL PNG. NULL = repli sur artist_logo.';
comment on column public.user_preferences.artist_logo_exports is
  'Interrupteurs d''affichage : {invoices, technical, listening}. Clé absente = affiché.';
