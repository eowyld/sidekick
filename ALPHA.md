# ALPHA — état et plan

Document de reprise. À lire en premier pour reprendre le chantier de mise en
vente. Mis à jour à chaque fin de journée.

**Après l'ouverture du 21/09, la suite se prépare dans `BETA.md`** : bêta
payante visée le lundi 16/11/2026 (Stripe, CGV, Iopole, réouverture du
périmètre fermé).

**Cible : ouverture de l'alpha le lundi 21/09/2026.**
*(repoussée du 14/09 — semaine du 09 au 13/09 perdue, voir Avancement)*
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
| Facturation électronique (Factur-X) | pas de code, rien à cadenasser : reporté à la bêta le 16/09 |

Un seul mécanisme, `src/lib/coming-soon.ts` : décision produit, fermée pour tous
les comptes. À ne pas confondre avec les préférences de modules
(`enabled_modules`), qui sont un choix réversible de l'utilisateur.
Rouvrir une fonctionnalité = retirer une ligne de ce fichier.

Le Drive (`/drive`, page autonome hors Admin) **reste ouvert** : jugé stable.

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

### ✅ Lundi 07 et mardi 08/09 — Projets et Revenus

**Non commité.** Ces deux journées, plus la refonte Phono du 04 au 06/09, vivent
encore dans l'arbre de travail : 106 fichiers modifiés ou non suivis, dernier
commit `9aba31a` du 06/09. `npx tsc --noEmit` est vert.

- **Projets** — `useProjectsData` est passé sur `user_projects` (SWR + Supabase),
  avec migration one-shot `migrateProjectsToSupabase()` appelée depuis
  `ProjectsPage`. Le module lui-même ne lit plus localStorage.
- **Revenus / facturation** — migration `20260908000000_facturation_supabase.sql` :
  `invoice_template` et `invoice_footer_note` sur `user_preferences`,
  `statut_juridique_id` sur `user_invoices`. Reprise par
  `src/lib/migrate-facturation-to-supabase.ts`, idempotente et non destructrice.
- **Légal, en avance** — `/confidentialite` et `/faq` écrites (non commitées).

### ⛔ Mercredi 09 → dimanche 13/09 — semaine perdue

Aucun travail. Trois jours ouvrés du planning sautent : Admin + légal (09/09),
Édition / Calendrier (10/09), dette + Factur-X + Outlook (11/09), et la recette
du samedi.

**L'ouverture est repoussée au lundi 21/09.** Pas au vendredi 18 : ouvrir une
alpha un vendredi soir fait tomber les premiers retours de testeurs pendant un
week-end où personne ne répond.

### ✅ Mardi 15/09 — Admin (statuts & démarches), simplifié

Formulaire de statut recentré sur ce qui sert vraiment, plus un bug de fond sur
les rappels de démarches — l'argument de rétention de l'alpha.

- **Catalogue déclaratif** — `src/modules/admin/data/procedure-templates.ts`
  décrit maintenant les 11 démarches types (libellé, organisme, récurrence,
  première échéance, cochée par défaut ou non) pour AE, association 1901 et
  intermittent. Les trois libs `ae-demarches.ts` (conservée, encore utilisée
  par `ae-compta.ts` sous `/admin/comptabilite`, fermé pour l'alpha),
  `association-demarches.ts` et `intermittent-demarches.ts` (supprimées, plus
  aucun appelant) sont remplacées par
  `src/modules/admin/lib/procedure-builder.ts` : construction à la création,
  synchronisation à l'édition, et lecture rétrocompatible des statuts déjà
  enregistrés (`readDemarchesSelection`) — aucune migration SQL nécessaire.
- **Formulaire de statut** (`StatutEditPage.tsx`, 1 564 → ~940 lignes) — les
  trois panneaux « Personnalisation des démarches » (heuristique BIC/BNC
  déduite de l'APE, plafonds micro, exonération CFE, jauge 507 h dupliquée de
  Revenus > Intermittence…) sont remplacés par une seule section « Démarches
  à suivre » : une liste de cases à cocher en langage clair, plus une seule
  vraie question (la cadence de déclaration AE). La date anniversaire
  intermittent devient facultative — elle n'active que la case « Vérifier les
  507 h », elle ne bloque plus la création de la fiche.
- **Bug corrigé — rappels par mail faux pour qui n'ouvre jamais l'app.** Le
  report des échéances récurrentes (`applyAllRecurringRollovers`) ne
  s'exécutait qu'au montage de `/admin/demarches`, côté client. Extrait sans
  React dans `src/modules/admin/lib/procedure-recurrence.ts` et appelé
  depuis `app/api/cron/reminders/route.ts` avant la composition du digest :
  les dates avancent maintenant même pour l'artiste qui n'ouvre jamais la
  page. La page n'applique plus le rollover qu'à l'affichage (`useMemo`),
  jamais en écriture.
- **Deux bugs silencieux corrigés au passage** : la récurrence `biannual`
  (visite médicale CMB) n'avait pas de branche dans le calcul de date et ne
  roulait donc jamais ; la clé de série ignorait l'identifiant du statut, donc
  deux statuts du même type fusionnaient leurs séries de démarches.
- **`StatutsPage.tsx`** — retrait du bloc « Contrats en cours », qui pointait
  vers `/admin/contrats`, fermé pour l'alpha (`coming-soon.ts`).

Vérifié en dev : création d'un statut de chaque type, cases par défaut
conformes au catalogue, cadence AE qui se répercute sur les libellés,
ouverture d'un statut créé avant la refonte (cases reconstituées depuis les
anciens blobs). `npx tsc --noEmit` et `npm run build` verts.

**Non vérifié** : le cron en conditions réelles (Vercel ne le déclenche qu'en
production) — testé en local via un appel direct à la route avec
`CRON_SECRET`. Édition catalogue UI/UX, prévue le même jour, non traitée :
reste à faire.

### 🟡 Mardi 15/09 (suite) — légal, avancé du 16/09

Tout est dans `docs/legal/README.md` (checklist d'ouverture incluse).

- Pages `/mentions-legales`, `/cgu` (avec annexe de sous-traitance art. 28),
  `/confidentialite` refondue, liées au footer et au sitemap. Identité de
  l'éditeur centralisée dans `src/lib/legal.ts`. **Éditeur retenu : la SAS.**
- Mention d'acceptation des CGU + âge minimum 18 ans sur `/inscription` et
  `/login` ; version des CGU stockée dans les métadonnées du compte (email).
- FAQ corrigée (presskit fermé, import de fiches de paie inexistant,
  artiste-auteur non sélectionnable, TVA absente des démarches) + 4 questions.
- Landing : Factur-X retiré de `ProductProof`, remis le même jour après
  réintégration au périmètre, puis **retiré définitivement le 16/09** au profit
  des clés de répartition SACEM (voir la section « Facturation électronique »).
- Adresse de contact `contact@` (inexistante) remplacée par `hello@`.
- Page d'écoute : lien vers l'information des visiteurs.
- PostHog : plus d'écriture sessionStorage avant consentement.
- Migration `20260915120000_user_fk_cascade.sql` **appliquée en production**
  (vérifié le 16/09) : supprimer un compte efface enfin ses données par cascade.
- Registre RGPD et procédures : `docs/legal/registre-rgpd.md`. CGV en brouillon
  non publié : `docs/legal/CGV-brouillon.md`.
- **Durées de conservation tranchées le 16/09** : une seule règle, les données
  vivent ce que vit le compte, suppression après 3 ans d'inactivité. Quatre
  exceptions subies (journaux, audience, emails de support, délai de 30 jours).
  Décision et reste à faire dans `docs/legal/passation-durees-conservation.md`.
  📅 **Les échéances datées sont dans `docs/legal/echeances.md`** — dont le
  premier checkup des comptes inactifs, **septembre 2029**. Rien à coder avant.

**Bloquant avant ouverture** : `TODO_` de `src/lib/legal.ts` (données Kbis).

### ⬜ Reste — semaine 3 (14/09 → 18/09), ouverture le lundi 21/09

Mêmes deux règles qu'avant : la donnée avant l'interface, et les blocages
juridiques avant la recette. Le commit passe en tête — deux jours de travail sur
un seul disque, c'est le vrai risque du moment, avant n'importe quelle
fonctionnalité.

| Jour | Chantier |
|---|---|
| Lun 14/09 | **Commit du chantier en cours** (106 fichiers, `tsc` vert) après vérification en dev · **Projets 2/2** : les 5 liens localStorage résiduels (voir ci-dessous) · **Phono** : trancher `ffmpeg`, trancher le bucket public, vérifier les liens d'écoute de bout en bout |
| Mar 15/09 | ~~**Admin** (gros) — simplification du module, statuts et démarches~~ fait (voir Avancement) · **Édition catalogue** UI/UX — reste à faire |
| Mer 16/09 | **Légal** — CGU, CGV, mentions légales (`/confidentialite` et `/faq` sont écrites, à relire + compléter le `sameAs` du JSON-LD) · bandeau cookies PostHog · PITR + DPA · **Calendrier** : vue semaine et densité |
| Jeu 17/09 | `handleMutationError()` sur les 20 hooks (**0 occurrence dans le code aujourd'hui**) · Configuration de prod : variables Vercel, URL Configuration Supabase, **Supabase Pro** + plafond du bucket |
| Ven 18/09 | **Recette de déploiement** (section dédiée) sur 2 comptes vierges dont un profil mono-secteur · correctifs |
| Lun 21/09 | **Purge PostHog**, puis ouverture |

**Ajouté le 15/09** : mettre en place un premier service client, et une procédure
d'aide pour l'utilisateur qui perd l'accès à son compte (plus accès à sa boîte
mail, donc pas de lien de récupération possible). À caler dans la semaine 3,
avant l'ouverture à tous le 21/09 — c'est le jour où ce cas commence à pouvoir
arriver.

**Coupé du périmètre : OAuth Outlook, et Factur-X.**

Factur-X avait été réintégré le 15/09, pour livraison les 16 et 17. Ressorti le
16/09 : rien n'était écrit, le planning de la semaine était déjà pris par le
légal, et l'obligation d'émission pour les TPE et PME ne tombe qu'au 1er
septembre 2027. Aucun utilisateur n'en a besoin pour l'alpha. Le chantier part
à la bêta (`BETA.md`, chantier 2, avec Iopole).

La carte `ProductProof` qui l'annonçait est remplacée par les clés de
répartition SACEM, qui existent vraiment. C'était le seul endroit du produit à
promettre Factur-X, et le laisser aurait été une pratique commerciale trompeuse
(art. L121-2 C. conso).

`handleMutationError()` est placé après les refontes UI volontairement : les
composants auront bougé, autant poser les messages d'erreur une seule fois, à
la fin.

### 🟡 Projets — liens localStorage résiduels, lundi 14/09

La donnée est migrée ; restaient des points qui lisaient ou écrivaient encore
`data.projects.projects` dans le blob localStorage. Il y en avait **six**, pas
cinq — le recensement initial avait manqué une seconde écriture morte.

| Fichier | Nature | État |
|---|---|---|
| `src/hooks/useIncomesOverview.ts` | lecture — table id → titre de projet | ✅ `useProjectsData` |
| `src/modules/dashboard/components/DashboardPage.tsx` | lecture — liste id/titre du contexte IA | ✅ `useProjectsData` |
| `src/modules/edition/components/WorksPage.tsx` | lecture projets + **écriture morte** `linkedWorks` + lecture `data.phono.tracks` | ✅ `useProjectsData` / `patchProjectLinks` / `usePhonoData` |
| `src/modules/phono/components/tracks/TracksTab.tsx:193` | **écriture morte** — le titre créé depuis un projet n'est jamais rattaché | ⬜ fichier en cours de modification |
| `src/modules/phono/components/CatalogPage.tsx:138` | lecture — projets passés au catalogue | ⬜ fichier en cours de modification |

Les deux derniers sont dans le chantier Phono en cours ; à faire en même temps
que lui, avec `patchProjectLinks` (`useProjectLinks` fait déjà exactement ça
pour les sections de Projets).

`ProjectsPage.tsx:27` lit aussi le blob, mais c'est la migration one-shot : à
garder telle quelle.

**Trouvé au passage, corrigé** : `DashboardPage` lisait ses modules activés
depuis `data.preferences.enabledModules` (localStorage) alors qu'il appelait
déjà `usePreferencesData` pour l'onboarding. Les préférences étant en base
depuis le 31/08, un module activé ou coupé dans les réglages ne changeait rien
au tableau de bord.

### ⬜ Purge des données PostHog — lundi 21/09, avant l'ouverture

`instrumentation-client.ts` portait une initialisation PostHog **sans garde
localhost**, et c'est elle qui l'emportait sur celle de `PostHogProvider`
(posthog-js ignore tout `init` suivant pour un même token). Résultat : depuis la
mise en place de l'instrumentation, les événements de développement sont partis
dans le projet de production, mélangés aux vrais.

Corrigé le 03/09 — une seule initialisation, dans `instrumentation-client.ts`,
avec la garde localhost, le masquage des champs de saisie et
`capture_pageview: false`. Vérifié : zéro requête analytics en local.
`NEXT_PUBLIC_ENABLE_POSTHOG_DEV=true` réactive l'envoi pour tester.

Reste à faire **le jour de l'ouverture**, pour que les métriques d'alpha partent
d'une base propre :

- Supprimer les événements antérieurs au 21/09 dans le projet PostHog EU.
- Vérifier au passage que les enregistrements de session d'avant le 03/09 ne
  contiennent pas de contenu de champ non masqué — le masquage n'était pas
  appliqué avant le correctif. Les supprimer si c'est le cas.

**Durées de conservation, vérifiées le 16/09** : les trois durées annoncées en
section 5 de la politique sont tenues. Cookie figé à 365 jours dans
`instrumentation-client.ts` ; événements à 1 an et replays à 30 jours, imposés
par le plan gratuit, tous deux sous les plafonds annoncés.
🔴 **Piège** : la rétention des événements n'est pas réglable à la baisse chez
PostHog. Elle passe à **7 ans dès le premier euro de plan payant**, ce qui
rendrait la section 5 fausse sans qu'aucun écran permette de la corriger. Voir
`docs/legal/echeances.md`.

### 🟡 Lien d'écoute Phono — écrit le 03/09, à vérifier le lundi 14/09

**Le code existe et n'a jamais été vérifié ni commité** : `app/ecoute/`,
`app/api/listening/`, `app/(app)/phono/liens-ecoute/`, `src/lib/listening-*.ts`,
`src/hooks/useListeningData.ts`, migration `20260903100000_listening_links.sql`.
Recette de bout en bout à faire avant de le compter comme acquis — et la
question du bucket public ci-dessous le concerne directement.


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

### ✂️ OAuth Outlook — coupé du périmètre alpha (reporté après l'ouverture)

Aujourd'hui seul Google OAuth est fonctionnel (connexion à l'appli + envoi des
campagnes mailing depuis l'adresse de l'utilisateur). Ajouter le même flux pour
Microsoft / Outlook, pour ne pas exclure les artistes qui n'ont pas de compte
Google.

- Provider Azure AD côté Supabase Auth (client ID / secret, redirect URLs).
- Scopes mail : envoi via Microsoft Graph (`Mail.Send`), équivalent de ce qui
  est fait côté Gmail.
- Bouton « Continuer avec Outlook » sur `/login` et `/inscription`, à côté de
  Google.
- ⚠️ La landing (`ProductProof`) annonce « Compte Google ou Outlook ». La
  fonctionnalité étant coupée, **c'est la phrase qu'il faut corriger** avant
  l'ouverture, le mercredi 16/09 : « Compte Google ».

---

### ✂️ Facturation électronique — coupée du périmètre alpha le 16/09

Réintégrée le 15/09, ressortie le 16/09. Aucun code n'existait : la seule
occurrence de « Factur-X » dans tout le dépôt était la carte de la landing.

**La landing est corrigée** : `ProductProof` annonçait « Factur-X, tes factures
au format imposé par la réforme française » sans qu'aucun export n'existe, ce
qui est une pratique commerciale trompeuse (art. L121-2 du Code de la
consommation). La carte est remplacée par les **clés de répartition SACEM**
(DEP et DRM), calculées pour de vrai dans `WorksPage.tsx`, page ouverte à
l'alpha. Même argument de différenciation française, mais vérifiable.

**Ce que ça ne coûte pas** : l'obligation d'**émission** en facture
électronique ne s'impose aux TPE et PME qu'au **1er septembre 2027**. Depuis le
1er septembre 2026, seule la **réception** est obligatoire. Les utilisateurs
n'ont donc besoin de rien avant un an, et le sujet a toute sa place à la bêta.

Le chantier lui-même est repris dans `BETA.md` (chantier 2, Iopole). Périmètre
tel qu'il était pensé, à reprendre là-bas :

- Réutiliser `user_invoices` ; ajouter les champs manquants au regard d'EN 16931
  (SIREN/SIRET émetteur et client, mentions légales, TVA par ligne).
- Génération de l'XML Factur-X + embarquement dans le PDF/A-3 (profil *BASIC*
  ou *EN 16931*).
- Transmission via une plateforme agréée, cycle de vie des statuts, annuaire.
- ⚠️ Conséquence RGPD à traiter dans le même lot : une PA archive les factures
  avec ses propres durées, donc supprimer un compte cesse de les effacer. Voir
  `docs/legal/echeances.md`.
- Recette : générer une facture Factur-X depuis un compte vierge et la passer
  dans un validateur (FNFE-MPE / validateur Factur-X) : XML conforme et PDF/A-3
  valide.

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

**Abonnement Supabase Pro — stockage audio, et surtout sauvegardes**

🔴 **Deuxième raison, découverte le 16/09 et plus critique que le stockage : le
plan gratuit ne fait aucune sauvegarde.** Aucune sauvegarde quotidienne, pas de
PITR (réservé aux plans payants). Une base perdue est perdue, et l'alpha avec.
Le plan Pro apporte 7 jours de sauvegardes quotidiennes, ce qui reste sous les
30 jours promis par la politique de confidentialité pour l'effacement
« sauvegardes comprises ». À souscrire **avant** d'ouvrir à des utilisateurs
réels, pas quand le quota de stockage se remplira.

L'hébergement des fichiers audio du catalogue Phono (un fichier par version de
titre, masters WAV inclus) ne rentre pas dans les limites du plan Free. Un WAV
44,1 kHz / 24 bits de 4 minutes pèse ~64 Mo, au-dessus du plafond d'upload de
50 Mo ; un catalogue de 24 titres × 3 versions approche 3,6 Go, contre 1 Go de
quota. Le code est écrit pour les gros fichiers dès l'alpha et piloté par
variables d'environnement : le jour du basculement, aucun redéploiement n'est
nécessaire.

- [ ] Souscrire **Supabase Pro** (~25 $/mois, 100 Go de stockage inclus).
- [ ] Relever le plafond du **bucket** `drive` lui-même, pas seulement celui du
      projet. Vérifié le 05/09 : le bucket porte `file_size_limit = 52428800`
      (50 Mo), posé par `supabase/scripts/setup_drive_bucket.sql`. Tant qu'il
      n'est pas relevé, Supabase refuse le fichier **avant** que le code ne le
      voie, et `NEXT_PUBLIC_MAX_AUDIO_MB` ne sert à rien :
      `update storage.buckets set file_size_limit = 209715200 where id = 'drive';`
- [ ] Vercel : `NEXT_PUBLIC_MAX_AUDIO_MB=200` et
      `NEXT_PUBLIC_STORAGE_QUOTA_GB=20`. Sans ces variables, l'app retombe sur
      les valeurs Free (50 Mo / 1 Go) et refuse les masters 24 bits avec un
      message explicite.
- [ ] Vérifier après bascule : uploader un WAV 24 bits de plus de 50 Mo sur une
      version de titre — l'upload doit aboutir et la waveform s'afficher.

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

## ⚠️ L'export de métadonnées ne fonctionne pas en production

`app/api/phono/apply-metadata/route.ts` appelle un binaire `ffmpeg` local
(`FFMPEG_PATH`, défaut `/usr/local/bin/ffmpeg`). Il n'existe pas sur Vercel. La
route est donc désactivée derrière `PHONO_METADATA_ENABLED` et répond 503 par
défaut — le commentaire du fichier dit que la fonctionnalité « y est cassée
depuis toujours ».

La refonte du catalogue a rebranché tout l'export dessus : portée par version,
par titre ou par album, source au choix entre le fichier hébergé et un dépôt
ponctuel, et aperçu des tags avant écriture. Le dialog **affiche honnêtement**
le 503 (« L'écriture des métadonnées n'est pas disponible sur cet
environnement. ») et s'arrête au premier appel au lieu d'en enchaîner douze.
En local, tout fonctionne avec `PHONO_METADATA_ENABLED=true`.

Trois issues, à trancher :

- [ ] **`ffmpeg-static`** en dépendance npm : le binaire est embarqué dans le
      bundle serverless. Le plus simple, mais ajoute ~80 Mo et frôle la limite
      de taille des fonctions Vercel.
- [ ] **`@ffmpeg/ffmpeg` (WASM) côté navigateur** : plus de serveur du tout,
      l'écriture se fait chez l'artiste. Le fichier n'a plus à transiter, mais
      c'est lent sur un WAV et le travail de rebranchement est réel.
- [ ] **Assumer que c'est une fonctionnalité locale** : documenter qu'elle ne
      sert qu'en développement, et retirer les boutons en production plutôt que
      d'afficher un message d'indisponibilité.

## 🟡 Bucket `drive` passé en privé — code fait le 16/09, migration à appliquer

**Décision prise le 16/09 : bucket privé + URL signées partout.** La protection
des masters et des contrats est un argument de confiance central pour les
artistes (fuite avant sortie, vol) ; le statu quo n'était pas défendable.

Fait :

- `app/api/drive/file/route.ts` — ouverture d'un fichier : session + premier
  segment du chemin = id du compte, puis redirection 302 vers une URL signée de
  60 s (`Cache-Control: no-store`). Utilisable en `href` comme en `src`.
- `driveFileHref()` dans `src/lib/drive-db.ts` remplace tous les
  `getPublicUrl` : Drive (liste, upload), signatures de contrats. Les documents
  en base qui portent une ancienne URL publique sont relus via leur
  `storage_path`.
- Pochette des liens d'écoute : URL signée 1 h côté serveur.
- Plus aucun `getPublicUrl` dans le code.
- Baseline et `supabase/scripts/setup_drive_bucket.sql` alignés sur
  `public = false`.
- Politique de confidentialité (section 6) et FAQ décrivent la protection.

Vérifié en dev : route refusée sans session (401). **Non vérifié** : ouverture
par le propriétaire et refus sur le fichier d'un autre compte (403) — le mot de
passe du compte démo de `.env.local` est refusé, à mettre à jour puis tester.

**Ordre de mise en production, impératif :**

1. Déployer le code (sinon le Drive affiche des liens morts).
2. `npx supabase db push --linked` → `20260916090000_drive_bucket_private.sql`.
3. Vérifier : une ancienne URL `…/storage/v1/object/public/drive/…` répond
   400/404 ; un fichier s'ouvre depuis le Drive ; un lien d'écoute lit l'audio
   et affiche la pochette. Le CDN Supabase peut servir une copie en cache
   jusqu'à 1 h (`cacheControl: 3600` à l'upload).
✅ **Étape 2 faite le 16/09, avant l'étape 1.** L'ordre a été inversé
volontairement, après avoir mesuré ce que cela cassait : le bucket ne contenait
qu'un `Demo.mp3` et il n'existait **aucun lien d'écoute**. Refermer un accès
public aux masters et aux contrats valait mieux qu'attendre un déploiement pour
préserver un lien mort sur un seul compte.

Vérifié : `public: false`, et l'ancienne URL publique répond 400.

⚠️ **Conséquence jusqu'au déploiement** : la production tourne encore sur `main`
(183 commits de retard) et n'a donc pas `/api/drive/file`. Les fichiers du Drive
ne s'ouvrent pas depuis le site en ligne dans l'intervalle. C'est attendu, et
cela se résout en déployant `claude-edits`. Reste donc à faire, dans cet ordre :

1. Déployer le code.
2. Vérifier qu'un fichier s'ouvre depuis le Drive et qu'un lien d'écoute lit
   l'audio et affiche la pochette. Le CDN Supabase peut servir une copie en
   cache jusqu'à 1 h (`cacheControl: 3600` à l'upload).
3. Les pages légales peuvent partir dans le même déploiement : la contrainte
   qui l'interdisait est levée.

### Historique — pourquoi c'était un problème

Vérifié le 05/09 auprès de l'API Storage : le bucket `drive` a `public = true`.
`supabase/scripts/setup_drive_bucket.sql` le crée ainsi et le README du dossier
demande explicitement « Public bucket : ON ».

Les 4 policies RLS sur `storage.objects` donnent une fausse impression de
cloisonnement : elles protègent l'accès **authentifié**, pas la route publique
`/storage/v1/object/public/drive/…`, qui sert les fichiers sans aucune
vérification. Toute URL de fichier qui circule reste valable indéfiniment, et
les chemins sont prévisibles (`{userId}/phono/audio/{nom du fichier}`).

Ça concerne tout le bucket : documents d'administration, contrats signés,
et désormais les masters audio du catalogue, que la feature « liens d'écoute »
est précisément faite pour diffuser **de façon contrôlée**.

Passer le bucket en privé n'est pas un changement anodin : le module Drive
(`DocumentsPage.tsx`) ouvre chaque fichier via son URL publique, et il faudrait
lui faire consommer des URL signées. Le catalogue Phono, lui, est déjà prêt —
son lecteur passe par `/api/phono/signed-audio`, qui vérifie le propriétaire.

- [x] Décidé le 16/09 : bucket privé + URL signées partout (voir ci-dessus).

## Dette identifiée, non bloquante pour l'alpha

- 18 hooks sur 20 sans `catch` : les erreurs Supabase font un rollback silencieux,
  sans message à l'utilisateur (10 `toast.error` dans tout le code)
- Refonte UI de Live et Marketing : hors périmètre alpha. Marketing est fermé,
  Live est jugé utilisable en l'état. À reprendre après l'ouverture en suivant
  ce que PostHog montrera.

Traité dans le planning, plus de la dette :

- **Intermittence** — l'allocation de `IntermittenceDashboard.tsx` est un forfait
  de 35 % codé en dur, sans AEM ni SJR ; le seuil des 507 h, lui, est correct.
  Fait partie du chantier **Revenus du 08/09**, ce n'est pas un sujet séparé.
- `app/api/phono/apply-metadata/route.ts` : traité le 04/09 (authentification
  exigée, route désactivée par défaut).
- Messages d'erreur des 20 hooks : planifié le 11/09, après les refontes UI.

---

## Conventions du dépôt

- Pas de `git add` ni `git push` intermédiaire. Commit uniquement sur demande
  explicite, après vérification en dev local.
- Migrations : un fichier versionné dans `supabase/migrations/`, jamais du SQL
  collé dans le dashboard (c'est ce qui avait produit la dérive de schéma).
  Toujours `npx supabase db push --linked --dry-run` avant d'appliquer.
- Design dark-only. Accent `#F0FF00`, fond `#101010`. Lucide uniquement.
- Toute nouvelle page ou module : ajouter le lien dans `Sidebar.tsx`.
