-- Suppression de la liste d'attente alpha.
--
-- L'inscription est ouverte : plus rien ne met personne en attente, et
-- conserver un fichier d'adresses sans finalité est une conservation de
-- données personnelles sans base légale.
--
-- ⚠️  EXPORTE LA TABLE AVANT DE JOUER CETTE MIGRATION.
--     Ces adresses sont les premiers inscrits, et la suppression est
--     définitive. Depuis le dashboard Supabase :
--     Table Editor > alpha_testers_waitlist > Export > CSV.
--
-- Le code applicatif correspondant (app/api/waitlist, src/lib/waitlist.ts,
-- le formulaire de la landing) a été supprimé dans le même lot.

drop table if exists public.alpha_testers_waitlist;
