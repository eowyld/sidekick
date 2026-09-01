# ALPHA — état et plan

Document de reprise. À lire en premier pour reprendre le chantier de mise en
vente. Mis à jour à chaque fin de journée.

**Cible : ouverture de l'alpha le lundi 14/09/2026.**
Alpha privée payante, sur invitation, paiement par Payment Link (pas de tunnel
Stripe self-serve avant d'avoir la preuve que des gens paient).

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

### ⬜ Reste — semaine 1 (31/08 → 04/09)

| Jour | Chantier |
|---|---|
| Mer 02/09 | Onboarding : écran post-inscription, multi-choix des secteurs, mise en avant des rappels |
| Jeu 03/09 | Rappels 1/2 : Resend, `vercel.json` cron, `/api/cron/reminders` protégée par secret, digest |
| Ven 04/09 | Rappels 2/2 : couverture par statut, opt-out, widget dashboard · **point hebdo** |

### ⬜ Reste — semaine 2 (07/09 → 11/09)

| Jour | Chantier |
|---|---|
| Lun 07/09 | Sécurité API : auth + Zod sur les 19 routes, `apply-metadata` désactivée, rate limiting, quota IA |
| Mar 08/09 | Intermittence : corriger l'allocation · `handleMutationError()` sur les hooks |
| Mer 09/09 | Légal : CGU, CGV, mentions, confidentialité, bandeau cookies PostHog, PITR + DPA |
| Jeu 10/09 | Migration des 5 liens Projets · Payment Link et procédure d'invitation |
| Ven 11/09 | Recette bout-en-bout sur 2 comptes vierges dont un profil mono-secteur |

---

## Décisions prises, et pourquoi

**Projets se limite à sa migration Supabase, la refonte UI attend l'après-alpha.**
Le module est ouvert dans le périmètre : il doit être *fiable*, pas *beau*. Un
projet qui disparaît au changement de navigateur tue l'alpha, un projet moche
non. PostHog dira au J14 si la refonte vaut le coup.

**Pas de tunnel Stripe self-serve.** Payment Link + ouverture manuelle suffisent
pour une alpha sur invitation, et ça rend deux jours.

**`onboarding_sectors` est volontairement redondant avec `enabled_modules`.**
Il fige le choix d'inscription, pour que la répartition au J14 ne soit pas
faussée par quelqu'un qui aura bricolé ses réglages entre-temps.

**Pas de trigger sur `auth.users` pour créer la ligne de préférences.**
On upsert à la première écriture. Les triggers sur `auth.users` ne sont pas
capturés par `supabase db dump` — un objet de moins hors schéma `public` est un
piège de moins (cf. section Pièges).

**`ModuleGuard` est une garde d'affichage, pas de sécurité.** Elle est côté
client, donc contournable. La protection des données reste `proxy.ts` et la RLS.

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
