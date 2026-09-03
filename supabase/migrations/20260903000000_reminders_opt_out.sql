-- Rappels de démarches par email : interrupteur par utilisateur.
--
-- Un envoi récurrent doit pouvoir être arrêté par son destinataire, sinon on
-- transforme l'argument de rétention en nuisance. Le défaut est `true` :
-- les rappels sont la promesse du produit, pas une option à découvrir.

alter table public.user_preferences
    add column if not exists reminders_enabled boolean not null default true;

-- Trace du dernier envoi, pour ne pas répéter le même digest si le cron est
-- rejoué dans la journée.
alter table public.user_preferences
    add column if not exists reminders_last_sent_at timestamptz;
