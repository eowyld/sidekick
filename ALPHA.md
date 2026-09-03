# ALPHA — état et plan

Document de reprise. À lire en premier pour reprendre le chantier de mise en
vente. Mis à jour à chaque fin de journée.

**Cible : ouverture de l'alpha le lundi 14/09/2026.**
Alpha **gratuite et ouverte à tous** : inscription libre depuis la landing, sans
carte bancaire ni engagement. Pas de paiement dans le périmètre — l'objectif de
l'alpha est le volume de testeurs et le signal d'usage, pas le chiffre. La
tarification (à partir de 8 €/mois) est annoncée sur la landing comme
« après l'alpha », sans date.

---

## Périmètre de l'alpha

### Ouvert

- **Organisation** — tableau de bord, tâches, calendrier, contacts
- **Revenus** — vue d'ensemble, facturation, royalties, droits d'auteur, intermittence
- **Projets** + les trois secteurs artistiques (live, phono, édition)
- **Admin** — gestion des statuts et des démarches **uniquement**

### Fermé

| Quoi | Comment |
|---|---|
| Marketing (module entier) | cadenas « Bientôt » |
| Synchronisation (`/edition/sync`) | cadenas « Bientôt » |
| Comptabilité (`/admin/comptabilite`) | cadenas « Bientôt » |
| Contrats (`/admin/contrats`) | cadenas « Bientôt » |
| Presskit public (`/presskit/*`) | redirigé vers l'accueil par `proxy.ts` |

Un seul mécanisme, `src/lib/coming-soon.ts` : décision produit, fermée pour tous
les comptes. À ne pas confondre avec les préférences de modules
(`enabled_modules`), qui sont un choix réversible de l'utilisateur.
Rouvrir une fonctionnalité = retirer une ligne de ce fichier.

Documents (`/admin/documents`, le Drive) **reste ouvert** : jugé stable.

Les 4 routes `/api/presskit/*` restent appelables bien que les pages soient
fermées. Sans conséquence immédiate (elles sont authentifiées) — à traiter avec
le durcissement des API le 07/09.

### Argument de rétention

Les **rappels automatiques de démarches administratives** — seule fonctionnalité
qui fait revenir l'artiste sans qu'il y pense. À mettre en avant dès
l'onboarding.

---

## Onboarding

Choix du profil à l'inscription : **live / phono / édition, multi-choix**. Un
auteur-compositeur qui tourne est les trois à la fois ; un choix unique lui
apprend en dix secondes qu'on n'a pas compris son métier.

Trois bénéfices : allège l'écran d'accueil · exécute la promesse du pitch
(« SIDEKICK s'adapte à ton profil ») · donne au J14 la répartition
live/phono/édition des testeurs, soit la donnée qui dira quel secteur
approfondir ensuite.

---

## Avancement

### ✅ Vendredi 28/08 — sécurité et hygiène du dépôt

- Écriture publique non authentifiée supprimée sur `presskit_links`
- `/projects` ajouté à `proxy.ts` (c'était la seule route de l'app shell sans
  protection edge)
- 4 616 fichiers d'artefacts désindexés, `.gitignore` remis d'aplomb
- Baseline de schéma resynchronisée sur la production

### ✅ Lundi 31/08 — préférences vers Supabase (`9ab5b9f`)

- Table `user_preferences` + RLS, migration versionnée et appliquée
- `src/hooks/usePreferencesData.ts` — expose déjà `completeOnboarding()`
- 3 consommateurs basculés : `Sidebar`, `CustomizationPage`, `Tasks`
- `src/lib/migrate-preferences-to-supabase.ts`, appelée depuis `AuthGuard`
- Correctif : un module désactivé restait affiché en lien simple dans la sidebar
- `src/components/layout/ModuleGuard.tsx` — redirection des routes désactivées
  (fait en avance, c'était au programme de mardi)

Vérifié : préférence modifiée dans un navigateur, effective en fenêtre privée.
`npx tsc --noEmit` et `npm run build` verts.

### ✅ Mardi 01/09 — fermeture du périmètre

- `src/lib/coming-soon.ts` — source de vérité unique des fonctionnalités fermées
- Sidebar : entrées fermées visibles mais inertes, cadenas + infobulle
  « Disponible prochainement »
- `src/components/layout/ComingSoon.tsx` — écran affiché sur accès direct par
  URL, plutôt qu'une redirection silencieuse qui passerait pour un bug
- `/presskit/*` redirigé vers l'accueil par `proxy.ts`
- Marketing retiré de la page Personnalisation : un interrupteur sans effet
  serait trompeur
- `src/components/layout/DesktopOnlyGuard.tsx` — écran « sur ordinateur » sous
  768 px, limité à l'app shell (la landing et l'authentification restent
  utilisables sur mobile, ce sont elles qui portent la vente)

Réserve connue : l'infobulle est portée par un `div` non focusable, donc visible
au survol mais pas au clavier.

### ✅ Mercredi 02/09 — onboarding, landing, branding

Onboarding en deux temps (secteurs puis données d'exemple), écrans d'auth
refondus, identité visuelle et police Archivo, suppression de la waitlist.
Commits `0312d00`, `14d1705`, `29100ac`, `1310f93`, `380da42`, `713ce3f`.
La landing reste en cours, non commitée.

Corrigé au passage : `npm run lint` ne vérifiait plus rien depuis Next 16
(`next lint` supprimé). Le lint retrouvé signale **205 problèmes préexistants**
(80 erreurs, 125 avertissements), dont **24 `rules-of-hooks`** — la seule
catégorie qui peut casser à l'exécution. Chantier à part, non traité.

### ✅ Jeudi 03/09 — rappels de démarches par email

- `vercel.json` : cron quotidien à 7h UTC (9h Paris l'été)
- `app/api/cron/reminders/route.ts` : démarches non terminées à échéance sous
  14 jours, **regroupées par utilisateur** — un email par personne, jamais un
  par démarche
- `src/lib/brevo.ts` : envoi factorisé, `/api/notify/signup` passe dessus
- `reminders_enabled` et `reminders_last_sent_at` sur `user_preferences`,
  interrupteur en Réglages > Personnalisation
- SASU et Artiste-Auteur retirés du choix à la création d'un statut
  (`SELECTABLE_STATUS_TYPES`) : peu répandus, et une seule démarche annuelle
  chacun. `STATUS_TYPES` reste complet pour les libellés et la normalisation
  des statuts déjà enregistrés.

À faire avant le déploiement : renseigner `CRON_SECRET` et `BREVO_API_KEY`
dans les variables d'environnement Vercel. Sans `CRON_SECRET`, la route refuse
de s'exécuter.

Non vérifiable en local : les crons Vercel ne tournent qu'en production.

### ✅ Jeudi 03/09 (suite) — domaine, SMTP Brevo, templates d'auth

Domaine de production : **sidekickartists.com**, zone DNS chez **Porkbun**.
Guide complet dans `docs/email-setup.md`, templates dans `docs/email-templates/`.

DNS posés et vérifiés (`dig … @1.1.1.1`) :

- Web : `A @ 216.198.79.1`, `CNAME www → …vercel-dns…` (Vercel)
- Mail entrant : `MX 10 mx0002.neo.space`, `MX 20 mx0001.neo.space` (**Neo**)
- **SPF** fusionné, un seul TXT : `v=spf1 include:spf0001.neo.space
  include:spf.brevo.com ~all`
- **DKIM** : `neo1._domainkey` (Neo) + `brevo1` / `brevo2._domainkey` (CNAME
  Brevo)
- **DMARC** : un seul TXT `_dmarc`, `p=none`, `rua` vers `no-reply@` + report
  Brevo
- Wildcard `*` de parking Porkbun **supprimé** (il faisait résoudre tous les
  sous-domaines non définis)

Boîtes mail (Neo, 1 boîte payante) :

- `hello@sidekickartists.com` — **alias** (permet de répondre depuis cette
  adresse) ; c'est le `Reply-To` public
- `no-reply@sidekickartists.com` — **internal forwarding** ; expéditeur
  technique de l'app, les bounces reviennent dans la boîte principale

Brevo :

- Domaine authentifié (SPF + DKIM verts), sender `no-reply@sidekickartists.com`
  confirmé
- **Deux clés distinctes** : clé API `xkeysib-…` (`BREVO_API_KEY`, routes Next) ≠
  clé SMTP `xsmtpsib-…` (SMTP custom Supabase)
- Piège rencontré : le **Login SMTP** n'est pas l'email du compte — prendre la
  valeur exacte du champ « Login » de l'onglet *SMTP & API → SMTP*. Un mauvais
  login donne `535 5.7.8 Authentication failed`.
- Compte neuf : l'envoi peut être bloqué tant que Brevo n'a pas validé le compte

Supabase :

- Custom SMTP activé → `smtp-relay.brevo.com:587`, sender `no-reply@…`
- Les 4 templates brandés (`confirm-signup`, `reset-password`, `magic-link`,
  `change-email`) collés dans Authentication → Email Templates
- Test *Send password recovery* : mail reçu, lien fonctionnel (redirige vers
  `localhost:3000` car déclenché en local — normal)

**⬜ Reste sur ce chantier :**

- **Authentication → URL Configuration** : Site URL `https://sidekickartists.com`
  + Redirect URLs en allowlist (`http://localhost:3000/**`,
  `https://sidekickartists.com/**`, `https://*-<scope>.vercel.app/**`). Sans
  l'entrée prod, le lien de recovery en production redirigera mal.
- **Page « nouveau mot de passe »** côté app pour le flux `type=recovery` :
  `/auth/callback` ne gère que le code PKCE des confirmations, pas la saisie
  d'un nouveau mot de passe.
- À la bascule `claude-edits` → `main` : poser `BREVO_API_KEY` et `CRON_SECRET`
  sur Vercel (prod). La config SMTP custom est côté Supabase, projet unique,
  déjà en place.
- Resserrer le SPF `~all` → `-all` une fois `mail-tester.com` au vert et tous
  les expéditeurs connus.

### ✅ Vendredi 04/09 — récupération de mot de passe

Il n'existait aucun parcours : ni lien « oublié » sur `/login`, ni appel à
`resetPasswordForEmail`, ni page de saisie. `/auth/callback` renvoyait vers le
tableau de bord, si bien qu'un lien de récupération connectait la personne sans
jamais lui proposer de changer son mot de passe. Sans conséquence sur une alpha
sur invitation ; bloquant dès lors que l'inscription est libre.

- `app/(auth)/mot-de-passe-oublie/` — demande du lien, `redirectTo` vers
  `/auth/callback?next=/nouveau-mot-de-passe` (le lien porte un code PKCE, il
  doit passer par le callback)
- `app/(auth)/nouveau-mot-de-passe/` — saisie + confirmation, minimum 8
  caractères, et un écran « lien expiré » explicite quand la session est
  absente plutôt qu'une erreur technique
- lien « Oublié ? » à côté du champ mot de passe sur `/login`

Le template `reset-password` était déjà en place côté Supabase.

### ✅ Vendredi 04/09 (suite) — sécurité des routes API

Remonté depuis le lundi 07/09.

- **Redirection ouverte** sur `mail/track/click` : la route suivait n'importe
  quelle destination passée en paramètre. `src/lib/safe-redirect.ts` n'autorise
  plus que `http`/`https` avec un hôte réel. C'était un tremplin de hameçonnage
  portant le domaine, la veille de son ouverture.
- **`phono/apply-metadata`** : acceptait des fichiers sans authentification.
  Session exigée, et route désactivée sauf `PHONO_METADATA_ENABLED=true`.
  Le code reste fonctionnel en local.
- **Budget IA** : `force=true` contournait le cache quotidien sans borne.
  Plafond de 5 générations par jour et par compte (`generation_count`) ;
  au-delà, le dernier résultat est servi plutôt qu'une erreur.
- **`presskit/resolve-streaming-links`** : ouverte, elle offrait un relais de
  scraping gratuit. Authentification ajoutée.
- **`src/lib/rate-limit.ts`** appliqué à `mail/send` (60/h), `siret-annuaire`
  (30/min), `resolve-streaming-links` (20/min).
- **`mail/send`** : `to` n'était pas borné, un appel pouvait viser des milliers
  d'adresses. Plafond de 500 et validation du format.

**Portée assumée du limiteur** : mémoire locale à chaque instance Vercel, perdue
à froid. Garde-fou contre une boucle ou un double-clic, pas contre une attaque
distribuée. Un limiteur partagé se justifiera avec le trafic.

**Non traité** : `mail/track/open` et `record` restent publics (pixels de suivi,
publics par nature), `presskit/[id]` sert une fonctionnalité fermée, et
l'entropie des jetons iCal n'a pas pu être vérifiée — le code qui les génère
n'a pas été retrouvé. Zod n'a pas été posé sur toutes les routes : les entrées
qui comptaient sont validées à la main, le reste aurait été du volume.

### ⬜ Reste — semaine 1 (31/08 → 04/09)

| Jour | Chantier |
|---|---|
| Ven 04/09 | Rappels 2/2 : couverture par statut, opt-out, widget dashboard · **lien d'écoute Phono** · **point hebdo** |

### ⬜ Reste — semaine 2 (07/09 → 11/09)

| Jour | Chantier |
|---|---|
| Lun 07/09 | Sécurité API : auth + Zod sur les 19 routes, `apply-metadata` désactivée, rate limiting, quota IA |
| Mar 08/09 | Intermittence : corriger l'allocation · `handleMutationError()` sur les hooks |
| Mer 09/09 | Légal : CGU, CGV, mentions, confidentialité, bandeau cookies PostHog, PITR + DPA |
| Jeu 10/09 | Migration des 5 liens Projets · OAuth Outlook |
| Ven 11/09 | Recette bout-en-bout sur 2 comptes vierges dont un profil mono-secteur · **facturation électronique** (dernier chantier avant l'ouverture) |

### ⬜ Lien d'écoute Phono — vendredi 04/09

Depuis le catalogue Phono, générer un **lien d'écoute partageable** portant
toutes les informations du titre : audio, crédits, ISRC, artistes et rôles,
date de sortie, pochette.

Usage : ce qu'un artiste envoie à un label, un programmateur, un éditeur ou un
journaliste. Aujourd'hui il le fait avec un WeTransfer et un mail séparé pour
les crédits.

Décisions de conception à tenir :

- **URLs signées à durée limitée**, pas de politique de lecture publique sur le
  bucket. Un lien d'écoute est envoyé à une personne précise ; une master non
  sortie qui fuite est le pire incident possible pour un artiste. Les 4 policies
  RLS de `storage.objects` restent intactes.
- **Réutiliser l'infrastructure de slugs du presskit** (`presskit_user_slugs`)
  plutôt que d'en créer une seconde. Le presskit est fermé pour l'alpha, son
  code reste en place.
- **Révocation** depuis le catalogue : un lien doit pouvoir être coupé.
- `noindex` sur la page, et route ajoutée au matcher de `proxy.ts` en exclusion
  explicite — c'est la seule surface publique volontairement rouverte.

---

### ⬜ OAuth Outlook — jeudi 10/09

Aujourd'hui seul Google OAuth est fonctionnel (connexion à l'appli + envoi des
campagnes mailing depuis l'adresse de l'utilisateur). Ajouter le même flux pour
Microsoft / Outlook, pour ne pas exclure les artistes qui n'ont pas de compte
Google.

- Provider Azure AD côté Supabase Auth (client ID / secret, redirect URLs).
- Scopes mail : envoi via Microsoft Graph (`Mail.Send`), équivalent de ce qui
  est fait côté Gmail.
- Bouton « Continuer avec Outlook » sur `/login` et `/inscription`, à côté de
  Google.
- La landing (`ProductProof`) annonce déjà « Compte Google ou Outlook » — à
  livrer avant l'ouverture pour que ce soit vrai.

---

### ⬜ Facturation électronique — jeudi 10/09

La réforme française rend la facture électronique obligatoire pour les
indépendants. Pour l'alpha, périmètre minimal : **générer une facture au format
Factur-X** (PDF/A-3 avec XML EN 16931 embarqué) à l'export, en plus du PDF
actuel.

- Réutiliser le modèle de données `user_invoices` existant ; ajouter les champs
  manquants au regard d'EN 16931 (SIREN/SIRET émetteur et client, mentions
  légales, TVA par ligne).
- Génération de l'XML Factur-X + embarquement dans le PDF (profil *BASIC* ou
  *EN 16931* suffisant au départ).
- **Hors périmètre alpha** : transmission via une PDP / Chorus Pro, cycle de
  vie (statuts émise/reçue/encaissée normalisés), annuaire. À planifier
  après-alpha selon le calendrier officiel.
- La landing (`ProductProof`) annonce déjà « Facturation électronique — format
  Factur-X » — à livrer avant l'ouverture.

---

## Recette de déploiement — à faire en production, avant l'ouverture

Rien de ce qui suit n'est vérifiable en local : emails réels, crons Vercel,
URLs de redirection. À dérouler après la bascule `claude-edits` → `main`.

**Configuration, d'abord**

- [ ] Vercel : `BREVO_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`
      (`https://sidekickartists.com`). Sans `CRON_SECRET`, la route de rappels
      refuse de s'exécuter et le cron est silencieusement inerte.
- [ ] Supabase → Authentication → URL Configuration : Site URL
      `https://sidekickartists.com`, Redirect URLs en allowlist
      (`https://sidekickartists.com/**`, `http://localhost:3000/**`,
      `https://*-<scope>.vercel.app/**`).

**Parcours de compte**

- [ ] Inscription depuis la landing → email de confirmation reçu → le lien
      ouvre l'app connectée, pas une page d'erreur.
- [ ] Onboarding : choix des secteurs, puis données d'exemple. Vérifier que la
      carte de suppression apparaît bien dans Réglages > Personnalisation.
- [ ] Notification d'inscription reçue sur `hello@` / `SIGNUP_NOTIFY_TO`.
- [ ] **Mot de passe oublié** : demander le lien, le recevoir, le suivre,
      définir un nouveau mot de passe, se reconnecter avec. Puis rouvrir le
      même lien une seconde fois — l'écran « lien expiré » doit s'afficher, pas
      une erreur technique.
- [ ] Connexion Google.

**Rappels de démarches**

- [ ] Créer un statut avec une démarche à échéance sous 14 jours, puis
      déclencher la route à la main :
      `curl -H "Authorization: Bearer $CRON_SECRET" https://sidekickartists.com/api/cron/reminders`
      — la réponse donne `{ ok, sent, skipped }`.
- [ ] Email reçu, avec toutes les démarches regroupées dans un seul message.
- [ ] Couper l'interrupteur en Réglages, rappeler la route : `skipped` augmente,
      aucun email.
- [ ] Rappeler la route dans la même journée : `skipped` augmente
      (`reminders_last_sent_at` empêche le doublon).
- [ ] Laisser passer un vrai cycle de cron (7h UTC) et vérifier l'exécution
      dans les logs Vercel.

**Délivrabilité**

- [ ] `mail-tester.com` au vert sur un email envoyé par l'app.
- [ ] Une fois tous les expéditeurs connus, resserrer le SPF `~all` → `-all`.

---

## Décisions prises, et pourquoi

**Projets se limite à sa migration Supabase, la refonte UI attend l'après-alpha.**
Le module est ouvert dans le périmètre : il doit être *fiable*, pas *beau*. Un
projet qui disparaît au changement de navigateur tue l'alpha, un projet moche
non. PostHog dira au J14 si la refonte vaut le coup.

**Alpha gratuite et ouverte, pas de paiement du tout.** Ni tunnel Stripe, ni
Payment Link, ni invitations : l'inscription est libre depuis la landing. Une
alpha payante sur invitation testait la disposition à payer sur un produit que
personne n'a encore utilisé ; on teste d'abord l'usage. Le prix se validera après,
sur une base d'utilisateurs réels. Ça rend aussi les deux jours de tunnel de
paiement.

**`onboarding_sectors` est volontairement redondant avec `enabled_modules`.**
Il fige le choix d'inscription, pour que la répartition au J14 ne soit pas
faussée par quelqu'un qui aura bricolé ses réglages entre-temps.

**Pas de trigger sur `auth.users` pour créer la ligne de préférences.**
On upsert à la première écriture. Les triggers sur `auth.users` ne sont pas
capturés par `supabase db dump` — un objet de moins hors schéma `public` est un
piège de moins (cf. section Pièges).

**`ModuleGuard` est une garde d'affichage, pas de sécurité.** Elle est côté
client, donc contournable. La protection des données reste `proxy.ts` et la RLS.

**Un seul fournisseur d'email : Brevo.** `app/api/notify/signup` l'utilise déjà
(notification fondateur). Les rappels de démarches et le SMTP des mails d'auth
Supabase passeront par le même compte : une intégration à maintenir, une seule
authentification DNS (SPF/DKIM/DMARC) à faire sur le domaine. Resend n'est pas
retenu. Deux clés distinctes côté Brevo : la **clé API** (`BREVO_API_KEY`, pour
l'API transactionnelle appelée depuis les routes Next) et une **clé SMTP** (pour
le relais SMTP renseigné dans Supabase Auth) — ce ne sont pas les mêmes.

---

## Pièges connus

**La baseline a un appendice écrit à la main.** `supabase/migrations/00000000000000_baseline.sql`
se termine par un bloc marqué `-- Objets hors schéma "public" (non capturés par
'supabase db dump')` : extension `pg_net`, bucket `drive`, 4 policies RLS sur
`storage.objects` qui isolent les fichiers entre utilisateurs, 2 triggers sur
`auth.users`. **`supabase db dump` ne les capture pas.** À chaque régénération de
la baseline, ce bloc doit être recollé — sinon un `supabase db reset` produit une
base sans isolation Drive.

**`pg_dump` n'est pas installé sur la machine.** Utiliser `supabase db dump --linked`
(qui passe par Docker, donc Docker doit tourner). Une redirection `> fichier` avec
une commande absente tronque le fichier avant d'échouer.

**`enabledModules.x !== false` : une clé absente vaut « activé ».** Sémantique
historique, préservée par `mergeEnabled()` dans le hook. Conséquence :
`completeOnboarding()` doit écrire `false` **explicitement** pour les secteurs non
cochés, jamais omettre la clé.

**Pas de `supabase/config.toml`.** Le lien CLI vit dans `supabase/.temp`, donc sur
cette machine uniquement. Sur une autre machine : refaire `supabase link`.

**`Tasks.tsx` lit encore `data.calendar.events` depuis localStorage** alors que le
calendrier est migré vers Supabase. Non traité, hors périmètre du jour.

---

## Dette identifiée, non bloquante pour l'alpha

- 18 hooks sur 20 sans `catch` : les erreurs Supabase font un rollback silencieux,
  sans message à l'utilisateur (10 `toast.error` dans tout le code)
- `app/api/phono/apply-metadata/route.ts` : upload non authentifié, chemin ffmpeg
  codé en dur — déjà cassé en production, à désactiver
- `IntermittenceDashboard.tsx` : l'allocation est un forfait 35 % codé en dur, sans
  AEM ni SJR. Le seuil des 507 h, lui, est correct
- Refontes UI par module (Projets, Phono/Sessions, Édition/Catalogue, Live,
  Marketing, Admin) : 13 à 20 semaines, à faire après l'alpha en suivant PostHog

---

## Conventions du dépôt

- Pas de `git add` ni `git push` intermédiaire. Commit uniquement sur demande
  explicite, après vérification en dev local.
- Migrations : un fichier versionné dans `supabase/migrations/`, jamais du SQL
  collé dans le dashboard (c'est ce qui avait produit la dérive de schéma).
  Toujours `npx supabase db push --linked --dry-run` avant d'appliquer.
- Design dark-only. Accent `#F0FF00`, fond `#101010`. Lucide uniquement.
- Toute nouvelle page ou module : ajouter le lien dans `Sidebar.tsx`.
