# Refonte Édition — l'accord entre co-auteurs et la vie de l'œuvre

Date : 21/09/2026. Décisions prises avec Eliott en séance de brainstorming.

## Pourquoi

Le module Édition était un registre : l'artiste y recopiait ce qu'il sait déjà
(ayants droit, clés DEP/DRM, ISWC), sans rien en retirer. L'espace membre SACEM
fait mieux sur la déclaration elle-même ; le copier n'a aucun intérêt.

Deux zones que la SACEM ne couvre pas, par construction :

1. **L'avant-déclaration.** La session à trois, les parts dites au studio et
   jamais écrites, le co-auteur non sociétaire. C'est là que naissent les
   litiges. → **l'accord de répartition validé en ligne par chaque co-auteur**.
2. **La vue transversale.** Chaque société ne voit que sa part. SIDEKICK voit
   l'œuvre, ses enregistrements (Phono), ses concerts (Live) et ses revenus. →
   **la vie de l'œuvre** : déclarée ou non, jouée où, programme déclaré ou non,
   ce qu'elle rapporte.

Hors périmètre, décidé : droits voisins (Adami, Spedidam, SCPP, SPPF), collecte
des droits, contrats d'édition, pont depuis les sessions studio. La
Synchronisation reste fermée (`coming-soon.ts`), son code n'est pas touché.

## 1. Modèle de données

### L'œuvre (`user_edition_works`, inchangée en base)

Le champ `status` garde ses valeurs stockées, pour ne toucher ni Projets
(`EditionSection`, `creation-logic`, `project-cockpit`), ni la RPC
`create_project_with_links`, ni le jeu de démo. Seule leur **lecture** change :

| Stocké | Lu comme |
|---|---|
| `in-progress`, `finalized` | Brouillon (partie manuelle) |
| `registered-sacem` | Déclarée SACEM |
| `accepted-sacem` | Acceptée |

L'interface n'écrit plus jamais `finalized` ; une nouvelle œuvre naît
`in-progress`.

### Le cycle de vie affiché (calculé)

`Brouillon → Accord en cours (n/m) → Accord validé → Déclarée SACEM → Acceptée`

- L'étape d'accord se **calcule** depuis les tables d'accord ; les deux
  dernières se cochent.
- **Œuvre solo** (un seul ayant droit, éditeur ou non : les éditeurs ne
  valident pas) : pas d'accord, Brouillon → Déclarée.
- **Accord contesté** : l'étape affiche « Accord contesté » en rouge.
- Cocher « Déclarée » sans accord validé reste possible (œuvres anciennes),
  avec un avertissement dans la fiche.

Logique pure dans `src/modules/edition/lib/work-lifecycle.ts`.

### L'accord (nouvelle migration `20260921220000_edition_agreements.sql`)

Calqué sur liens d'écoute + invitations.

**`user_edition_agreements`**
- `id uuid pk`, `user_id uuid` (→ auth.users, cascade), `work_id text` (→
  `user_edition_works`, cascade), `version int`, `snapshot jsonb`,
  `status text` (`pending` | `validated` | `contested` | `superseded` |
  `cancelled`), `created_at`, `updated_at`.
- `snapshot` : photo figée au moment de l'envoi — titre, nom civil déclarant,
  personnes (id, prénom, nom, pseudonyme, rôles), parts internes auteurs et
  compositeurs, éditeurs externes et leurs parts, clés DEP/DRM.
- Un seul accord actif (`pending`, `validated`, `contested`) par œuvre : index
  unique partiel sur `work_id`.

**`user_edition_agreement_signers`**
- `id uuid pk`, `agreement_id uuid` (cascade), `user_id uuid`, `person_id text`,
  `display_name text`, `token_hash text unique`, `email text null`,
  `status text` (`pending` | `validated` | `contested`), `info jsonb`
  (nom civil, pseudonyme, IPI, sociétaire SACEM oui/non/je ne sais pas),
  `comment text`, `is_owner bool`, `sent_at`, `opened_at`, `responded_at`,
  `created_at`.
- Le jeton du lien (32 octets aléatoires, base64url) n'est **jamais stocké en
  clair** : `token_hash = sha256(token)`. Le jeton n'existe que dans la réponse
  de création et dans le lien copié.
- La ligne de l'artiste (`is_owner`) est créée validée d'office.

**RLS** : le propriétaire **lit** ses lignes (`auth.uid() = user_id`), sans la
colonne `token_hash`. Toutes les écritures passent par les routes API en clé
service : c'est ce qui garantit qu'une validation vient du co-auteur et non de
l'artiste qui cocherait à sa place. Aucune politique publique.

**Qui valide** : toutes les personnes de l'œuvre (auteurs, compositeurs,
arrangeurs, adaptateurs). Les éditeurs externes figurent dans l'accord mais ne
valident pas.

### Verrouillage et versions

- Tant qu'un accord est actif, ayants droit, rôles, parts et éditeurs sont en
  **lecture seule** sur la fiche.
- « Modifier la répartition » : l'accord actif passe `superseded`, les
  champs se déverrouillent ; « Envoyer l'accord » crée la version n+1 avec de
  nouveaux jetons. Les anciens liens affichent « Cet accord a été remplacé ».
- « Annuler l'accord » : passe `cancelled`, déverrouille, sans nouvelle
  version.
- Quand tous les signataires ont validé, l'accord passe `validated` (calcul
  fait par la route de réponse). Une contestation le passe `contested`.

### Concerts

Case « Programme déclaré à la SACEM » stockée dans `details.sacemProgramDeclared`
de la représentation (`user_tour_dates.details`, jsonb existant) : **aucune
migration Live**.

Une œuvre est jouée à une représentation quand un morceau de sa setlist
(`details.setlist`) :
- porte un `trackId` relié à l'œuvre (`work.linkedTrackIds` ou
  `track.linkedWorkId`), ou
- n'a pas de `trackId` et porte exactement le titre de l'œuvre (comparaison
  sans casse ni accents), avec un artiste vide ou égal au nom d'artiste.

Ne comptent que les représentations **passées** et non annulées. Logique pure
dans `src/modules/edition/lib/work-life.ts`.

## 2. Écrans

Même grammaire que la refonte Live : en-tête à sourcil, panneaux, segments
(composants `LiveUI` réutilisés).

### `/edition` — le catalogue

- En-tête « Œuvres », bouton « Nouvelle œuvre ».
- **Bandeau d'alertes**, seulement s'il y a quelque chose : œuvres dont un
  enregistrement est sorti sans être déclarées ; programmes de concert à
  déclarer ; accords contestés ; accords en attente depuis plus de 7 jours.
- Segments : Toutes · À faire · Accord en cours · Déclarées. « À faire » =
  brouillon avec co-auteurs sans accord, accord contesté, ou sortie non
  déclarée.
- Recherche par titre.
- **Liste dense** : une ligne par œuvre — titre (et pseudonymes des ayants
  droit), étape du cycle de vie en pastille, accord (`2/3`, ✓, —), concerts
  (nombre, dont non déclarés), enregistrements liés. Clic → fiche.
- Écran vide : explique en une phrase ce que le module apporte (l'accord entre
  co-auteurs, puis la vie de l'œuvre), bouton « Créer ma première œuvre ».

### `/edition/nouvelle` et `/edition/[id]` — la fiche

Page pleine, la grande modale disparaît. En-tête : titre, étape du cycle de vie,
actions (Supprimer). Trois onglets :

1. **Ayants droit & accord** — personnes et rôles, éditeurs, parts internes,
   clés DEP/DRM et camemberts (repris de l'existant) ; puis le bloc **Accord** :
   état par signataire (en attente, ouvert, validé, contesté + message), lien à
   copier et envoi par email pour chacun, « Envoyer l'accord », « Modifier la
   répartition », « Annuler l'accord », versions précédentes repliées.
2. **Déclaration** — Brouillon / Déclarée / Acceptée à cocher, ISWC, date de
   première exploitation, genre, durée, premier diffuseur, territoires, types
   d'exploitation, notes. Fiche récapitulative « à recopier dans l'espace
   membre SACEM » avec bouton copier.
3. **Vie de l'œuvre** — enregistrements liés (Phono, avec leur statut de
   sortie, liaison et déliaison), concerts où elle a été jouée avec la case
   « programme déclaré » sur chacun, et **Revenus** : emplacement avec état vide
   (« Les droits d'auteur importés dans Revenus apparaîtront ici »), branché par
   la refonte Revenus du 22/09.

En création (`/edition/nouvelle`), seul le premier onglet et les champs
essentiels sont proposés ; l'enregistrement redirige vers `/edition/[id]`.
`?projectId=` est conservé : l'œuvre créée est reliée au projet comme avant.

Les fichiers (partition, paroles, audio) avaient des boutons « Upload » sans
effet : retirés.

### `/accord/[token]` — la page du co-auteur (publique)

- Hors `(app)`, sans compte, `robots: noindex`.
- Affiche : titre de l'œuvre, qui la propose (nom d'artiste), version, la liste
  des ayants droit avec rôles et parts en clair (pourcentages DEP et DRM par
  personne), éditeurs.
- Le co-auteur complète **ses** infos : nom civil, pseudonyme, IPI (facultatif),
  sociétaire SACEM (oui / non / je ne sais pas).
- Deux actions : « Je valide cette répartition » ou « Je conteste » avec un
  message obligatoire.
- Après réponse : écran de confirmation, et la réponse reste consultable.
- États morts : jeton inconnu, accord remplacé, annulé.
- Mention en bas de page : ce que vaut la validation (accord entre co-auteurs
  horodaté, qui ne remplace pas la déclaration SACEM).

### Live

Sur la fiche d'une représentation passée (onglet Setlist) : case
« Programme déclaré à la SACEM ». Rien d'autre ne change dans le Live.

## 3. Routes API

Toutes dans `app/api/edition/`.

Authentifiées (propriétaire) :
- `POST /api/edition/agreements` — `{ workId, work }` : remplace l'accord actif
  éventuel (`superseded`), crée la version suivante, les signataires et leurs
  jetons ; renvoie les jetons **une seule fois**, que le client garde en
  mémoire le temps de les copier. Un jeton perdu se régénère.
- `POST /api/edition/agreements/[id]/token` — `{ signerId }` : régénère le jeton
  d'un signataire (ancien lien mort).
- `POST /api/edition/agreements/[id]/send` — `{ signerId, email, token }` :
  envoi par Brevo, `Reply-To` = email du compte, limite de débit par
  utilisateur.
- `POST /api/edition/agreements/[id]/cancel`.

Publiques (clé service, après résolution du jeton, limite par IP) :
- `GET /api/accord/[token]` — état et contenu de l'accord pour ce signataire ;
  pose `opened_at` à la première ouverture.
- `POST /api/accord/[token]` — `{ decision, info, comment }` : enregistre la
  réponse, recalcule le statut de l'accord.

Lecture côté client : `useEditionAgreements()` lit accords et signataires par
RLS (sans `token_hash`).

## 4. Tâches

Nouveau fichier `src/modules/tasks/rules/edition.ts`, et `RuleContext.edition`
(`works`, `agreements`, `tracks`, `tourDates`) :
- « Déclarer le programme du concert du JJ/MM à la SACEM » : représentation
  passée depuis moins de 6 mois, jouant au moins une œuvre du catalogue, sans
  programme déclaré.
- « Déclarer « Titre » à la SACEM » : enregistrement lié sorti, œuvre en
  brouillon.
- « Relancer X sur l'accord de « Titre » » : signataire en attente depuis 7
  jours.

## 5. Données existantes et effets de bord

- Aucune réécriture des œuvres existantes.
- `GlobalCalendarPage:986` et `Tasks.tsx:140` lisent des événements Édition dans
  le localStorage que plus aucun code n'écrit : lectures retirées.
- `WorksPage.tsx` (1 623 lignes) est découpé : `lib/` (clés SACEM, cycle de vie,
  vie de l'œuvre), `components/` (liste, fiche, onglets, éditeur d'ayants droit,
  camemberts, bloc accord), page publique à part.
- Sidebar : l'entrée « Catalogue » reste `/edition`.
- Démo : les œuvres du jeu d'exemple s'affichent telles quelles (statuts
  historiques lus par la table de correspondance).

## 6. Vérification

- `npx tsc --noEmit`, ESLint sur les fichiers touchés, `npm run build`.
- Règles pures vérifiées par un script `scripts/check-edition-life.ts` (cycle de
  vie, correspondance setlist ↔ œuvre, alertes).
- En dev, sur le compte de captures, **en lecture seule** tant que la migration
  n'est pas appliquée : catalogue, fiche, onglets, écran vide simulé, page
  `/accord/[token]` à l'état « lien inconnu ».
- Non vérifiable avant la migration : création d'un accord, validation,
  contestation, envoi d'email. À faire après `supabase db push`, sur une œuvre
  de test.

⚠️ La migration doit être appliquée en production **avant** le déploiement du
front. Sans elle, la fiche charge (l'accord est lu à part et son échec est
toléré), mais « Envoyer l'accord » échoue.
