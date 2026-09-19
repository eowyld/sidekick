# ALPHA — état et plan

Document de reprise. À lire en premier pour reprendre le chantier de mise en
vente. Mis à jour à chaque fin de journée.

**Après l'ouverture du 24/09, la suite se prépare dans `BETA.md`** : bêta
payante visée le lundi 16/11/2026 (Stripe, CGV, Iopole, réouverture du
périmètre fermé).

**Cible : ouverture de l'alpha le jeudi 24/09/2026.**
*(repoussée du 14/09, du 21/09 puis du 23/09 — voir Avancement)*
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

### ✅ Mardi 15 et mercredi 16/09 — légal, terminé

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

Le seul `TODO_` restant dans `src/lib/legal.ts` est `LEGAL_MEDIATOR` : le
médiateur de la consommation est écarté du périmètre alpha (voir `BETA.md`), et
`app/cgu/page.tsx` masque le paragraphe tant que le nom commence par `TODO_`.
**Ce n'est donc plus un bloquant.** La mention Kbis, elle, est renseignée.

### 🟡 Mercredi 16/09 — Phono et Projets, en cours dans l'arbre de travail

Le chantier des 04 au 15/09 est commité (`713ce3f`), ainsi que le bucket privé
(`346e79b`) et tout le légal. **Ce qui reste non commité, ce sont 24 fichiers de
la page album du catalogue Phono en cours d'écriture** : `AlbumEditPage`,
`AlbumEditForm`, `AlbumEditAside`, la route `app/(app)/phono/catalogue/album/`,
la suppression de `AlbumDialog`, plus `CatalogPage` et les onglets. Plan et
spéc dans `docs/superpowers/plans/2026-09-16-catalogue-albums-page.md`.

Conséquence pour le déploiement : **ce travail en cours n'est pas dans
`claude-edits`**, donc déployer la branche ne l'embarque pas et ne le perturbe
pas. Les deux peuvent avancer en parallèle.

### ✅ Vendredi 18/09 — les fichiers sortent de notre domaine, plus de Supabase

Jeudi 17/09 : aucun travail.

Le bucket privé marchait, mais chaque fichier était servi en renvoyant le
navigateur sur une URL signée `…supabase.co/storage/v1/object/sign/…`. Elle
s'affichait dans la barre d'adresse à l'ouverture d'un document, elle partait
dans le `src` du lecteur audio, et elle restait rejouable telle quelle par
n'importe qui le temps de sa validité — donc sans repasser ni par le mot de
passe d'un lien d'écoute, ni par sa révocation.

`src/lib/storage-stream.ts` signe l'URL, la consomme côté serveur et ne laisse
ressortir que les octets. L'en-tête `Range` est relayé et la réponse amont
rendue telle quelle : le déplacement dans un titre fonctionne, et un WAV ne se
retélécharge pas en entier à chaque clic sur la forme d'onde.

Cinq points de fuite traités : `/api/drive/file` (302 → flux),
`/api/phono/signed-audio` (rend l'adresse `/api/drive/file`, et vérifie encore
propriétaire et existence avant lecture), `/api/listening/[slug]/audio/[itemId]`
(le `POST` rend l'adresse, un `GET` sert les octets),
`/api/listening/[slug]/download/[itemId]` (302 → flux + `Content-Disposition`),
et la pochette, désormais servie par `/api/listening/[slug]/cover`. Plus aucune
URL Supabase n'atteint le navigateur.

Vérifié en dev sur le compte démo, lien d'écoute temporaire créé puis supprimé :
charge utile publique sans aucune occurrence de `supabase.co`, audio en 206 avec
`Content-Range`, pochette et téléchargement servis sans redirection. `npx tsc
--noEmit` et `npm run build` verts.

### ✅ Vendredi 18/09 (suite) — page contact

`/contact`, publique : email `hello@sidekickartists.com`, Instagram
**@sidekick.artists**, **LinkedIn**, et un formulaire qui envoie dans la même
boîte via Brevo. Ajoutée au footer (colonne Ressources) et au sitemap.
`src/lib/social.ts` centralise les comptes publics, sur le modèle de
`src/lib/legal.ts` — le `sameAs` du JSON-LD lira d'ici.

⬜ **L'URL LinkedIn porte l'identifiant numérique de la page**
(`/company/143617034/`), faute d'URL personnalisée réclamée. Elle restera
valable, mais elle vaut d'être remplacée le jour où la page en a une : un lien
lisible se partage, un matricule non.

C'est la seule route publique qui déclenche un envoi d'email, donc la seule
porte par laquelle un inconnu consomme le quota Brevo. Trois gardes : champ
piège (réponse 200 pour ne rien apprendre au robot), 3 messages par 10 minutes
et par IP, bornes de longueur. L'adresse de l'expéditeur part en `Reply-To`,
jamais en `From` : usurper le `From` casserait l'alignement SPF/DKIM du domaine
et la délivrabilité de tous les autres emails de l'app.

Vérifié en dev : page 200 en desktop et en mobile, champs vides → 400, adresse
invalide → 400, champ piège rempli → 200 sans envoi, et **envoi réel reçu dans
`hello@`** (événements Brevo : `requests` → `delivered` → `opened`). Reste à
vérifier la limite de débit, qui ne se déclenche qu'après un envoi valide.

### 🟡 Vendredi 18/09 (suite) — Sessions studio Phono

Refonte alpha en cours dans l'arbre de travail : synthèse et chronologie,
édition sur une page dédiée, rattachement multiple aux albums, titres et mixes,
participants issus des Contacts, coûts studio agrégés automatiquement dans les
projets partageant un album ou un titre, et fiche de présence avancée repliée
avec impression PDF. La signature numérique est reportée au chantier Contrats
de la bêta (`BETA.md`). Migration additive :
`20260918120000_studio_sessions_alpha.sql`.

### 🔴 Vendredi 18/09 — aucun email ne partait, et rien ne le disait

Découvert en testant le formulaire de contact : le message n'arrivait pas, et
l'app renvoyait quand même un succès.

**Cause** : `src/lib/brevo.ts` prenait `BREVO_FROM`, non renseignée, et
retombait sur `eliott.matton@gmail.com`. Cette adresse n'est pas un expéditeur
vérifié côté Brevo — les seuls vérifiés sont `hello@` et
`no-reply@sidekickartists.com`. Brevo **accepte** alors l'appel API (2xx avec un
`messageId`), puis rejette l'envoi de façon asynchrone :
« Sending has been rejected because the sender you used … is not valid ».
`sendEmail` renvoyait donc `{ ok: true }`, aucune erreur nulle part, et rien
n'arrivait.

**Portée : les trois envois de l'app**, pas seulement le formulaire. La
notification d'inscription et surtout **les rappels de démarches** passent par
la même fonction. L'argument de rétention de l'alpha n'aurait envoyé aucun
email, sans le moindre signal. Les crons ne tournant qu'en production, ça se
serait vu au mieux au bout de plusieurs jours.

**Correctif** : la valeur de repli est désormais `no-reply@sidekickartists.com`,
l'adresse technique du domaine, authentifiée SPF/DKIM. `sendEmail` journalise
en plus le `messageId` accepté et l'expéditeur utilisé, pour qu'un message
manquant se relie à son événement Brevo. `.env.example` documente le piège.

**Vérifié** : envoi rejoué après correctif, `delivered` puis `opened` dans les
événements Brevo. **Rien à poser sur Vercel** : le repli du code suffit, et
`BREVO_FROM` reste disponible pour surcharger.

⚠️ **À vérifier dans la recette du 24** : le compte Brevo est en plan gratuit,
**300 emails par jour**. Un rappel de démarches par utilisateur et par jour
tient largement pour une alpha, mais c'est un plafond à surveiller au J14.

⚠️ **Contrepartie assumée** : les octets transitent maintenant par les fonctions
Vercel au lieu d'aller directement au CDN Supabase. Sur des masters WAV et
plusieurs auditeurs simultanés, c'est de la bande passante et du temps de
fonction en plus. À surveiller au J14 ; la sortie propre serait un domaine
personnalisé sur le Storage, qui est une option payante.

### 🟡 Samedi 19/09 — dernier lien localStorage, et une migration qui ne finissait jamais

- **`CatalogPage` est passée sur `useProjectsData`** — c'était le dernier point
  du dépôt à lire `data.projects` dans le blob localStorage. Le module Phono
  n'appelle plus `useSidekickData` du tout. Lecture seule (les pastilles de
  projet sur une ligne de titre), donc le chargement des projets ne retarde pas
  le catalogue : tant qu'il n'a pas répondu, les pastilles sont absentes.
  `ProjectsPage.tsx:48` continue de lire le blob, c'est la migration one-shot,
  à garder telle quelle.

- **Bug trouvé en vérifiant, corrigé — `migratePhonoAudioFolder` ne se
  terminait jamais.** Deux requêtes Storage en 400 à chaque montage du
  catalogue. Cause : `list()` matche le préfixe **sans tenir compte de la
  casse**, `move()` résout la clé **exactement**. Un fichier rangé sous
  `Phono/Catalogue` ressort donc du listage de `phono/catalogue`, et la
  migration essayait de le déplacer sur lui-même → `NoSuchKey`. Le `return` sur
  erreur faisait que **le drapeau `phono_audio_folder_migrated_v3` n'était
  jamais posé** : la migration rejouait à chaque chargement, pour tous les
  comptes, et surtout la passe de répercussion des chemins en base (titres,
  mixes, items de liens d'écoute), placée après la boucle de déplacement,
  n'était jamais atteinte. Un compte réellement à moitié migré serait resté
  cassé indéfiniment. Correctif : on saute le déplacement quand source et
  destination ne diffèrent que par la casse, et une source absente n'est plus
  une erreur bloquante.

Vérifié en dev sur le compte de `.env.local` : catalogue chargé, **aucune
requête en échec**, drapeau posé à `done`. `npx tsc --noEmit` et `npm run build`
verts.

- **Bug trouvé et corrigé — le calendrier global ignorait les modules coupés.**
  `GlobalCalendarPage` lisait `enabledModules` dans
  `sidekickData.preferences`, c'est-à-dire le **localStorage**, alors que les
  préférences vivent dans `user_preferences` depuis le 31/08. Les défauts du
  blob étant tous à `true`, un module désactivé dans les Réglages continuait
  d'afficher ses événements **et** sa pastille de filtre. Exactement le bug
  déjà corrigé sur `DashboardPage` le 14/09, dans un second fichier. Passé sur
  `usePreferencesData`, `preferencesReady` compris — celui de `useSidekickData`
  ne signalait que la relecture du localStorage sous la bonne clé, pas un
  chargement de préférences.

  ⬜ **Reste dans ce fichier** : `GlobalCalendarPage:984` lit encore
  `sidekickData.calendar.events` pour les événements d'Édition. C'est le même
  résidu que `Tasks.tsx:140`, et il n'était pas recensé. À traiter avec la
  refonte Édition de lundi, pas avant — il faut d'abord savoir où ces
  événements vivent côté Supabase.

- **`ffmpeg` tranché et livré** — on garde l'export de métadonnées et il marche
  désormais en production. Trois murs, dont deux que personne n'avait vus (le
  jeton `/ROOT/` du bundler, et le plafond de 4,5 Mo des corps de requête et de
  réponse Vercel). Détail complet dans la section « Export de métadonnées »
  ci-dessous.

⬜ Reste de la journée : finalisation des **mixes**.

### ✅ Semaine 3 (14/09 → 18/09)

Mêmes deux règles qu'avant : la donnée avant l'interface, et les blocages
juridiques avant la recette. Le légal est fini. **Ce qui passe en tête
maintenant, c'est le déploiement** : la migration du bucket privé est appliquée
en production alors que le code qui va avec ne l'est pas (voir la section du
bucket `drive`), donc le Drive en ligne est cassé jusqu'à la bascule.

| Jour | Chantier |
|---|---|
| Lun 14/09 | ~~**Commit du chantier en cours** (106 fichiers, `tsc` vert)~~ fait · **Projets 2/2** : les liens localStorage résiduels — **il n'en reste qu'un** (voir ci-dessous) · **Phono** : ~~trancher le bucket public~~ fait · trancher `ffmpeg` et vérifier les liens d'écoute de bout en bout — reste à faire |
| Mar 15/09 | ~~**Admin** (gros) — simplification du module, statuts et démarches~~ fait (voir Avancement) · **Édition catalogue** UI/UX — reste à faire |
| Mer 16/09 | ~~**Légal** — CGU, CGV, mentions légales, `/confidentialite`, `/faq`~~ fait (voir Avancement) · ~~bandeau cookies PostHog~~ fait (`src/components/analytics/CookieBanner.tsx`) · ~~**Calendrier** : vue semaine et densité~~ fait (confirmé le 18/09) |
| Jeu 17/09 | Rien — journée non travaillée |
| Ven 18/09 | ~~Variables Vercel + URL Configuration Supabase~~ fait · ~~**Déploiement `claude-edits` → `main`**, vérifié en ligne~~ fait (voir la section du bucket `drive`) · ~~plafond du bucket~~ fait · ~~**URL Supabase exposées** dans le Drive et les liens d'écoute~~ fait (voir Avancement) · ~~compte démo de `.env.local`~~ vérifié, il fonctionne |

### ⬜ Semaine 4 (19/09 → 24/09) — refontes, onboarding, puis ouverture

**L'ouverture passe du lundi 21 au jeudi 24/09.** Deux motifs. Trois modules
(Live, Édition, Revenus) restent au-dessous du niveau de qualité des autres, et
Phono / Projets ne sont pas terminés : un testeur qui ouvre six modules et en
trouve trois inégaux conclut sur le produit entier, pas sur le module. Et
l'onboarding mérite une journée pleine à lui seul (voir ci-dessous). Le
dimanche 20 reste non travaillé.

La règle de la semaine : **les refontes d'abord, l'onboarding ensuite, la
recette en dernier**. Une recette passée avant les refontes est à refaire
après, puisque ce sont les écrans qui bougent ; et un onboarding écrit avant
les refontes fait visiter des écrans qui n'existent plus.

| Jour | Chantier |
|---|---|
| Sam 19/09 | **Finir Phono et Projets** — ~~page album~~ faite · ~~dernier lien localStorage `CatalogPage.tsx:185`~~ fait · **mixes** en finalisation · **trancher `ffmpeg`** au passage, la refonte du catalogue s'appuie dessus |
| Dim 20/09 | Repos |
| Lun 21/09 | **Refonte Live** · **refonte Édition** (le catalogue était déjà au programme du 15/09, non traité) |
| Mar 22/09 | **Refonte Revenus** · **mini-refonte de la landing** · `handleMutationError()` sur les 20 hooks — c'est le bon moment, les composants ont fini de bouger |
| Mer 23/09 | **Journée entière : onboarding, compte démo, tutoriel** (section dédiée ci-dessous) |
| Jeu 24/09 | **Matin** : Supabase Pro, DPA, service client, **finalisation et vérification des surveys** · **recette de déploiement** sur 2 comptes vierges dont un mono-secteur · **purge PostHog** · **ouverture** |

🔴 **Ce qui bloque l'ouverture, et rien d'autre** : l'abonnement **Supabase Pro**
(sans lui, aucune sauvegarde de la base), la **recette de déploiement** sur
comptes vierges, le **service client / procédure de perte d'accès**, et les
**DPA Supabase et Vercel**. Les refontes et l'onboarding, eux, ne bloquent pas :
ils décident de la date.

⚠️ **Le jeudi 24 est chargé** : il finalise et il ouvre le même jour. Si la
journée déborde, ce qui saute est l'ouverture, pas la recette. Une recette non
passée se paie sur les premiers comptes réels, une ouverture décalée d'un jour
ne coûte rien à personne.

### ⬜ Mercredi 23/09 — onboarding, compte démo, tutoriel

**Pari produit, posé le 18/09 : les premiers testeurs découvriront SIDEKICK par
le compte démo, pas par un compte vide.** Un artiste qui arrive sur six modules
vides ne sait pas ce qu'il regarde ; les données d'exemple sont donc le vrai
premier écran du produit, et elles ont aujourd'hui le statut d'une option de
fin d'onboarding. La journée les remet au centre.

Trois chantiers :

- **Personnaliser le compte démo selon le profil.** Les secteurs sont déjà
  demandés à l'inscription (`onboarding_sectors`) et servent à masquer des
  modules ; ils ne changent pas encore le contenu des données d'exemple. Un
  artiste live doit tomber sur des dates de tournée et du matériel, pas sur un
  catalogue phonographique qui ne lui parle pas. Le nom d'artiste saisi peut
  aussi peupler les jeux de données plutôt que des libellés génériques.
- **Tutoriel accompagné** au premier passage : un parcours guidé qui montre où
  sont les choses, plutôt qu'une visite laissée à la curiosité. Mettre en avant
  les **rappels de démarches** au passage, c'est l'argument de rétention de
  l'alpha et rien ne le présente aujourd'hui.
- **Sortie du compte démo** : effacer les données d'exemple et repartir propre
  doit rester évident et sans perte. La carte existe en Réglages >
  Personnalisation, elle doit survivre aux refontes des trois modules.

⚠️ **Dépendance** : cette journée vient après les refontes Live, Édition et
Revenus. L'ordre n'est pas négociable, un tutoriel écrit sur des écrans qui
bougent est à réécrire.

**Trois rappels pour les refontes** — les mêmes erreurs sont déjà arrivées :

- **Ce que la landing promet doit exister** dans le module refondu. C'est
  l'épisode Factur-X. À revérifier après la mini-refonte, dans les deux sens.
- **L'écran vide est le premier écran d'un testeur** qui refuse les données
  d'exemple à l'onboarding. Il fait partie de la refonte, pas du reste.
- **Les données d'exemple** de l'onboarding doivent encore correspondre aux
  écrans refondus, sinon elles montrent un produit qui n'existe plus.

**Reporté après l'ouverture** : le `sameAs` du JSON-LD (`app/layout.tsx:105`)
attend que les profils publics existent, ce n'est pas un travail de code.

**Par où un testeur signale un bug — résolu le 18/09.** Deux canaux, chacun
pour un usage :

- **Surveys PostHog**, mis en place côté produit : le retour à chaud, dans
  l'écran où la personne bute. **À finaliser et vérifier le jeudi 24/09** :
  déclenchement réel sur un compte neuf, et surtout comportement quand la
  mesure d'audience est refusée au bandeau cookies — un survey qui ne part
  jamais pour la moitié des testeurs vaut mieux su que découvert au J14.
- **Page `/contact`** (écrite le 18/09) : le message long, et le seul canal qui
  marche sans consentement analytics.

**Ajouté le 15/09** : mettre en place un premier service client, et une procédure
d'aide pour l'utilisateur qui perd l'accès à son compte (plus accès à sa boîte
mail, donc pas de lien de récupération possible). À caler dans la semaine 3,
avant l'ouverture à tous le 24/09 — c'est le jour où ce cas commence à pouvoir
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
| `src/modules/phono/components/tracks/TracksTab.tsx` | **écriture morte** — le titre créé depuis un projet n'est jamais rattaché | ✅ supprimée, plus aucun appel à `useSidekickData` dans le fichier |
| `src/modules/phono/components/CatalogPage.tsx:185` | lecture — projets passés au catalogue (`data.projects?.projects ?? []`) | ✅ `useProjectsData` (19/09) |

**Terminé le samedi 19/09.** Plus aucun appel à `useSidekickData` dans le module
Phono, et plus aucune lecture de `data.projects` dans tout le dépôt.

`ProjectsPage.tsx:27` lit aussi le blob, mais c'est la migration one-shot : à
garder telle quelle.

**Trouvé au passage, corrigé** : `DashboardPage` lisait ses modules activés
depuis `data.preferences.enabledModules` (localStorage) alors qu'il appelait
déjà `usePreferencesData` pour l'onboarding. Les préférences étant en base
depuis le 31/08, un module activé ou coupé dans les réglages ne changeait rien
au tableau de bord.

### ⬜ Purge des données PostHog — jeudi 24/09, avant l'ouverture

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

- Supprimer les événements antérieurs au 24/09 dans le projet PostHog EU.
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
      ⏸️ **Reporté le 18/09**, le produit n'étant pas prêt à ouvrir : tant que
      les comptes sont les nôtres, une base sans sauvegarde n'engage que nous.
      🔴 **Le report s'arrête au 24/09** : l'ouverture, c'est précisément le
      premier inscrit extérieur, donc le premier jour où une base perdue est un
      dommage subi par quelqu'un d'autre. À souscrire le matin même, **avant** la
      recette, pas après.
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

## ✅ Export de métadonnées — remis en état le samedi 19/09

**Tranché : on garde la fonctionnalité et on la fait marcher en production**
(option `ffmpeg-static`). Trois murs, pas un seul :

1. **Le binaire.** La route appelait `/usr/local/bin/ffmpeg`, un ffmpeg posé par
   Homebrew sur la machine de développement. Il n'existe pas sur Vercel, et il
   n'y a pas de machine à provisionner. `ffmpeg-static` était **déjà** dans
   `package.json` (`^5.3.0`, avec `fluent-ffmpeg`) et n'était importé nulle
   part. La route s'en sert maintenant.
2. **Le bundle `/ROOT/`.** `ffmpeg-static` déduit le chemin de son binaire de
   `__dirname` ; bundlé par Turbopack, ce `__dirname` devient un jeton `/ROOT/`
   et le spawn échoue en `ENOENT`. `serverExternalPackages: ["ffmpeg-static"]`
   dans `next.config.mjs` le laisse en `require` réel. `outputFileTracingIncludes`
   force en plus le binaire dans la trace, que l'analyse statique ne voyait pas.
3. **Le plafond de 4,5 Mo.** Le corps d'une requête ou d'une réponse de fonction
   Vercel est plafonné à 4,5 Mo (413 `FUNCTION_PAYLOAD_TOO_LARGE`). La route
   renvoyait `fs.readFile()` dans un `Buffer`, donc une réponse tamponnée :
   **aucun fichier audio réel n'aurait pu passer** (MP3 320 kbps de 4 min
   ≈ 9,6 Mo, WAV 24 bits ≈ 64 Mo). Corrigé par une réponse **en flux**
   (`Readable.toWeb(createReadStream(...))`), qui échappe au plafond — c'est
   déjà ce que fait `storage-stream.ts`, non concerné. Côté requête, le flux ne
   sauve rien : le **dépôt ponctuel** monte donc d'abord au Storage
   (`stageLocalAudio` dans `metadata-export.ts`) et la route le télécharge par
   `audioPath`. Le fichier déposé est retiré en fin d'export, et un onglet fermé
   en cours de route est rattrapé par `pruneOrphanAudio` (même dossier
   `Phono/Catalogue`, aucune référence, délai de grâce d'une heure).

Deux pièges laissés en commentaire dans le code : le `finally` ne doit plus
supprimer le fichier de sortie (le flux n'est pas encore drainé, on servirait du
vide — la suppression est portée par la fin du flux), et le `catch` journalise
désormais le `stderr` de ffmpeg. Un 500 muet est ce qui rendait cette route
indébogable.

La route est **active par défaut** (`PHONO_METADATA_ENABLED=false` reste un
coupe-circuit). Rien à poser sur Vercel.

**Vérifié en dev**, compte de `.env.local` :

| Contrôle | Résultat |
|---|---|
| Export d'un fichier hébergé | 200, **8 201 436 octets** (au-delà des 4,5 Mo), `Content-Length` posé |
| Intégrité du fichier rendu | 3:21 complètes, décodage sans erreur — pas de troncature |
| Tags écrits | titre, artiste, album, `publisher`, `composer`, `TSRC`/`ISRC`, date |
| Dépôt ponctuel de 6,8 Mo par l'interface | zip de 13 Mo téléchargé |
| Fichier temporaire après export | supprimé, aucun résidu dans `Phono/Catalogue` |
| Binaire dans le bundle | **1 fonction sur 109** (`.nft.json`), pas toutes |

`npx tsc --noEmit` et `npm run build` verts.

🔴 **Non vérifiable en local, à contrôler à la première mise en production :**

- Le plafond de 4,5 Mo n'est **pas appliqué par `next dev`** : seule la prod dira
  si le flux le contourne vraiment. Faire un export réel après déploiement.
- Le binaire de `ffmpeg-static` est téléchargé au `postinstall`, pour la
  plateforme de build (Linux x64 chez Vercel). C'est une **dépendance réseau au
  moment du build** : si GitHub est indisponible, le build casse.
- Le **bit exécutable** du binaire doit survivre au bundling. Si l'export
  répond 500 en production, c'est le premier point à regarder (`EACCES` dans le
  `stderr` désormais journalisé).

`fluent-ffmpeg` reste dans `package.json` sans aucun appelant — à retirer.

### Historique — pourquoi c'était cassé

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

Trois issues étaient ouvertes :

- [x] **`ffmpeg-static`** en dépendance npm — **retenue le 19/09**. L'objection
      de taille était fausse : le binaire pèse 45,5 Mo (pas 80), la limite est
      de 250 Mo par fonction, et il n'entre que dans **une** fonction sur 109
      (Next trace les dépendances route par route). Vercel a par ailleurs ouvert
      des « large functions » jusqu'à 5 Go si ça coinçait un jour.
- [ ] **`@ffmpeg/ffmpeg` (WASM) côté navigateur** — reportée à la bêta, mais
      c'est la bonne cible : plus de serveur, le fichier ne transite pas, donc
      ni plafond de 4,5 Mo, ni bande passante, ni attente sans jauge.
- [x] ~~Assumer que c'est une fonctionnalité locale~~ — écartée, Eliott la juge
      structurante pour le produit.

**Contrepartie assumée** : chaque export fait voyager le fichier deux fois
(Supabase → Vercel → navigateur). Un WAV de 64 Mo = 128 Mo de trafic, un album
de 12 titres ≈ 1,5 Go par export. Même nature que la contrepartie des liens
d'écoute du 18/09, en plus concentré. À surveiller au J14. Le calcul, lui, est
négligeable : ffmpeg tourne en `-c copy`, c'est un remux sans réencodage, et
Vercel facture le CPU actif.

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

Vérifié en dev le 18/09, de bout en bout : ouverture par le propriétaire (200,
`audio/mpeg`, 8,2 Mo servis), refus sur le fichier d'un autre compte (403),
refus sans session (401), `Range` honoré (206 + `Content-Range`), et
`download=1` qui pose bien le `Content-Disposition`.

Le mot de passe du compte démo de `.env.local` **fonctionne** : la note
précédente était fausse, la connexion passe sans rien changer.

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

✅ **Étape 1 faite le vendredi 18/09 — la production est à jour.** Le décalage
entre la migration (16/09) et le code est refermé : `main` est passé de
`2800c3b` à `f0d8956`, soit les 185 commits d'avance de `claude-edits`.
Les pages légales sont parties dans le même déploiement.

Vérifié en production, après build :

| Contrôle | Résultat |
|---|---|
| `/mentions-legales`, `/cgu`, `/confidentialite`, `/faq` | 200 |
| `/api/drive/file` sans session | **401** — la garde fonctionne |
| Ancienne URL `…/storage/v1/object/public/drive/…` | **400** — le bucket est bien fermé |
| `/`, `/login`, `/inscription` | 200 |

⚠️ Le domaine sert depuis **`www.sidekickartists.com`** : l'apex renvoie un 308
vers `www`. À garder en tête pour toute vérification en ligne, et à vérifier
dans les URL de redirection Supabase (une allowlist qui ne couvrirait que
l'apex laisserait tomber les liens de confirmation).

**Reste à vérifier, avec une session réelle** (non testable en `curl`) :

1. Un fichier s'ouvre depuis le Drive, et le fichier d'un autre compte est
   refusé en 403.
2. Un lien d'écoute lit l'audio et affiche la pochette. Le CDN Supabase peut
   servir une copie en cache jusqu'à 1 h (`cacheControl: 3600` à l'upload).

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
