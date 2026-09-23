# Jetons OAuth mail : sortir de `user_metadata`

**Statut : étape 2 (double écriture) codée le 21/09. Migration écrite (`supabase/migrations/20260921200000_user_mail_connections.sql`), non appliquée. Étape 3 à faire.**
À décider après l'ouverture du 24/09, ou avant si tu veux fermer le point.

## Le problème

`gmail_refresh_token` et `outlook_refresh_token` vivent dans
`auth.users.raw_user_meta_data`. Cette zone est :

- **lisible depuis le navigateur** : `MailSettingsPage` et `ListeningLinksPage`
  appellent `supabase.auth.getUser()` côté client et y lisent les jetons ;
- **modifiable par l'utilisateur** (`auth.updateUser({ data })`), donc un
  script injecté (XSS) peut lire ou remplacer le jeton ;
- un refresh token Gmail donne le droit d'envoyer des mails **depuis la boîte
  de l'artiste**, sans limite de durée tant qu'il n'est pas révoqué.

Ce n'est pas une faille exploitable aujourd'hui (pas de XSS connu), mais c'est
le seul secret longue durée du produit qui est exposé au navigateur.

## Cible

Table `user_mail_connections`, jeton **illisible pour `anon` et `authenticated`**
(privilège de colonne, pas seulement RLS). Le navigateur ne voit que l'adresse
connectée ; seules les routes serveur, avec la clé de service, lisent le jeton.

```sql
create table if not exists public.user_mail_connections (
    user_id uuid not null references auth.users(id) on delete cascade,
    provider text not null check (provider in ('gmail', 'outlook')),
    email text,
    refresh_token text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (user_id, provider)
);

alter table public.user_mail_connections enable row level security;

drop policy if exists "Users read own mail connections" on public.user_mail_connections;
create policy "Users read own mail connections"
    on public.user_mail_connections for select to authenticated
    using (user_id = auth.uid());

drop policy if exists "Users delete own mail connections" on public.user_mail_connections;
create policy "Users delete own mail connections"
    on public.user_mail_connections for delete to authenticated
    using (user_id = auth.uid());

-- Le jeton n'est jamais lisible depuis le navigateur.
revoke all on public.user_mail_connections from anon, authenticated;
grant select (user_id, provider, email, created_at, updated_at)
    on public.user_mail_connections to authenticated;
grant delete on public.user_mail_connections to authenticated;

-- Reprise des connexions existantes. `metadata` n'est PAS nettoyée ici.
insert into public.user_mail_connections (user_id, provider, email, refresh_token)
select id, 'gmail',
       coalesce(raw_user_meta_data->>'gmail_email', raw_user_meta_data->>'mail_from'),
       raw_user_meta_data->>'gmail_refresh_token'
from auth.users
where coalesce(raw_user_meta_data->>'gmail_refresh_token', '') <> ''
on conflict (user_id, provider) do nothing;

insert into public.user_mail_connections (user_id, provider, email, refresh_token)
select id, 'outlook',
       coalesce(raw_user_meta_data->>'outlook_email', raw_user_meta_data->>'mail_from'),
       raw_user_meta_data->>'outlook_refresh_token'
from auth.users
where coalesce(raw_user_meta_data->>'outlook_refresh_token', '') <> ''
on conflict (user_id, provider) do nothing;
```

## Séquence (trois déploiements, jamais un seul)

1. **Migration additive** (ci-dessus). Aucun effet sur le code actuel, qui lit
   toujours `user_metadata`. Réversible : `drop table`.
2. **Code en double lecture** : les callbacks Google/Outlook écrivent dans la
   table (client de service, après vérification de la session), la route
   `mail/send` lit la table puis retombe sur `user_metadata`, les deux écrans
   lisent l'adresse connectée depuis la table (colonne `email`). Le bouton
   « Déconnecter » supprime la ligne.
3. **Nettoyage**, une fois vérifié en production : retirer
   `gmail_refresh_token`, `outlook_refresh_token` de `raw_user_meta_data`, et
   supprimer le repli dans le code. C'est l'étape irréversible : la faire
   séparément, après avoir envoyé un vrai mail depuis la table.

## Fichiers à toucher (étape 2)

- `app/api/mail/oauth/google/callback/route.ts`, `.../outlook/callback/route.ts`
- `app/api/mail/send/route.ts`
- `src/modules/settings/components/MailSettingsPage.tsx`
- `src/modules/phono/components/ListeningLinksPage.tsx` (`useConnectedSenders`)
- `src/modules/marketing/components/MailingPage.tsx`
- `app/(auth)/auth/callback/route.ts` (à relire : il référence ces clés)

Le client de service (`SUPABASE_SERVICE_ROLE_KEY`) n'est aujourd'hui utilisé que
par le cron et deux routes publiques : `mail/send` et les callbacks deviennent
les nouveaux consommateurs, à garder derrière une session vérifiée.

## À ne pas oublier

- Le registre RGPD (`docs/legal/registre-rgpd.md`, traitement T7) parle de
  « jetons OAuth `gmail.send` » : la suppression de compte doit les emporter.
  `on delete cascade` s'en charge pour la table, mais pas tant que les jetons
  restent aussi dans `user_metadata`.
- Les utilisateurs déjà connectés gardent leur jeton : pas de reconnexion à
  imposer si la reprise SQL est jouée avant le déploiement de l'étape 2.
