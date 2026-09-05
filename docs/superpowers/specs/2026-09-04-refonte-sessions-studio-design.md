# Refonte des Sessions Studio — design

> Spec B du chantier Phono. Elle suit la spec A
> ([refonte du Catalogue](2026-09-03-refonte-phono-catalogue-design.md)) et en
> reprend le principe directeur, le vocabulaire visuel et les modules `lib/`.
> La page **Liens d'écoute** reste hors périmètre.

## Problème

`src/modules/phono/components/SessionsStudioPage.tsx` fait 688 lignes. Le volume
n'est pas le problème principal — le catalogue en fait 4540 — mais le contenu
l'est.

La page affiche **deux tableaux de huit colonnes**, l'un « Passées », l'autre
« À venir », dans deux `Card` repliables dont l'en-tête est dupliqué. Chaque
ligne étale titre, type, date, heure, lieu, participants, note et actions sur la
même largeur, sans hiérarchie : la date, qui est l'axe de lecture d'un registre
de sessions, a le même poids visuel que la colonne « Note » tronquée à 200 px.

Trois défauts sont plus graves que la mise en page :

1. **La page ment sur son propre périmètre.** Son `EmptyState` promet
   « studio, intervenants, morceaux enregistrés : garde l'historique de ton
   activité studio et **récupère tes droits voisins** ». Or aucun lien vers un
   titre n'existe dans le modèle, et les rôles des participants — la seule
   donnée qui servirait à une déclaration SPEDIDAM — sont saisis dans le
   formulaire puis **jamais affichés** : la colonne « Participants » ne montre
   que des noms empilés.
2. **L'enregistrement invente des données.** `saveSession` (l. 200-232) remplace
   une date vide par la date du jour et une heure vide par `14:00`. Un registre
   qui fabrique la date d'une séance d'enregistrement est un registre qu'on ne
   peut pas produire comme preuve. Aucune validation n'existe par ailleurs :
   une session sans titre ni lieu s'enregistre et s'affiche en `—` partout.
3. **L'ordre chronologique est faux.** Les dates sont stockées en texte
   `JJ/MM/AAAA` et `fetchPhonoData` fait `order("date", { ascending: false })`
   sur cette colonne : le tri est alphabétique sur le **jour**. Le 30/01 passe
   avant le 02/12. Les listes `pastSessions` / `upcomingSessions` ne re-trient
   rien ensuite.

À l'inverse du catalogue, le défaut « le formulaire est la vue » **n'est pas
présent** : la création et l'édition partagent déjà un dialog unique piloté par
`editingId`, et la liste ne contient aucun input. C'est le seul point sur lequel
cette page est en avance sur l'autre, et il est conservé tel quel. Le défaut
symétrique la frappe en revanche : la vue de lecture est un tableur sans
hiérarchie, et **toute** l'information ne devient lisible qu'en ouvrant le
formulaire.

Défauts secondaires, relevés pour mémoire et tous corrigés ici : classes
héritées du thème clair (`bg-muted/50`, `text-muted-foreground`, `border-b`) au
lieu des conteneurs de section du design system ; `parseFrDate` qui redéveloppe
à la main ce que `src/lib/date-format.ts` fait déjà ; identifiants de
participant en `Date.now()` — un nombre, alors que tout le reste de l'app
utilise des chaînes, et deux ajouts dans la même milliseconde produisent deux
ids identiques ; aucune recherche, aucun filtre, aucun tri.

## Usage visé

Une session studio n'est pas un événement d'agenda. Le calendrier existe déjà et
affiche ces sessions (`GlobalCalendarPage`, `buildCalendarEvents`, type
`session`) — les redévelopper ici serait de la redite. Ce que la page doit
faire, et que rien d'autre ne fait, tient en trois usages :

1. **Réserver et préparer.** Une session à venir répond à : quand, où, avec qui,
   sur quoi, combien. C'est l'usage de planification, le seul aujourd'hui à peu
   près servi.
2. **Constituer le registre des enregistrements.** Une session passée est la
   trace de *qui a joué sur quel titre, quel jour, dans quel studio*. C'est
   exactement le contenu d'une feuille de présence SPEDIDAM et la matière d'une
   déclaration de droits voisins. Cet usage est promis par la page et n'existe
   pas : c'est le cœur de la refonte.
3. **Suivre le budget studio.** Combien d'heures, combien d'euros, sur les douze
   derniers mois. L'artiste finance ses sessions ; le chiffre n'existe nulle
   part aujourd'hui.

Comme le catalogue, la page n'est **pas** une vitrine : la densité prime.

## Principe directeur

> **Lire ≠ éditer**, et **une session lie des personnes à des titres.**

Le premier volet est repris de la spec A : la liste affiche de l'information
dense et scannable, l'édition passe par une modale unique partagée entre
création et édition — état déjà atteint ici, qu'on ne casse pas.

Le second est propre à cette page. L'unité d'information n'est pas « une ligne
d'agenda » mais **un créneau studio qui produit un ensemble de titres travaillés
par un ensemble d'intervenants**. Tout le reste (lieu, coût, notes) qualifie ce
croisement. C'est ce croisement qui a une valeur juridique, et c'est lui que la
page doit rendre visible sans ouvrir de formulaire.

## Modèle de données

Le type vit aujourd'hui dans `src/hooks/usePhonoData.ts`, à part des autres
types Phono qui sont dans `src/lib/sidekick-store.ts`. Il y est déplacé, par
cohérence avec `Track`, `Album` et `Mix`.

```ts
export type SessionType = "prise" | "essai" | "mix" | "mastering" | "autre";

export type SessionParticipant = {
  id: string;
  /** Lien vers `user_contacts.id` quand l'intervenant est un contact connu. */
  contactId?: string;
  name: string;
  role: PhonoRole;
};

export type StudioSession = {
  id: string;
  title: string;
  /** ISO `YYYY-MM-DD`. */
  date: string;
  /** `HH:MM` de début, ou chaîne vide. */
  time: string;
  /** `HH:MM` de fin, optionnel. */
  endTime?: string;
  location: string;
  address?: string;
  sessionType: SessionType;
  sessionTypeOther?: string;
  participants: SessionParticipant[];
  /** Titres du catalogue travaillés pendant la session. */
  trackIds: string[];
  /** Coût total en euros, TTC. */
  cost?: number;
  note?: string;
};
```

Quatre changements, chacun justifié plus bas : `trackIds`, `endTime`, `cost`,
et le passage de la date en ISO. Deux resserrements de type :
`SessionParticipant.id` passe de `number` à `string` et `role` de `string` à
`PhonoRole`.

### `trackIds` — le lien qui manque

C'est l'ajout central. Sans lui, la promesse « droits voisins » de la page est
creuse : une déclaration SPEDIDAM se fait par enregistrement, et il faut donc
pouvoir dire *quels interprètes ont joué sur quel ISRC*. La session est le seul
endroit où cette information existe naturellement, parce que c'est au moment de
la séance qu'on sait qui était dans la cabine.

Le lien est **porté par la session**, pas par le titre. Trois raisons : le
catalogue est gelé par la spec A et son plan est en cours d'exécution ; le
rattachement se fait chronologiquement au moment de la session, pas au moment
où l'on crée la fiche du titre ; et un titre peut naître de plusieurs sessions
sans que sa fiche ait à porter cette histoire.

`trackIds` référence `Track.id`. La suppression d'un titre depuis le catalogue
laisse un id orphelin dans une session : il est **ignoré silencieusement à
l'affichage** (le titre n'existe plus, la ligne ne le montre pas) et purgé au
prochain enregistrement de la session. Aucune contrainte de clé étrangère n'est
posée : la colonne est un `jsonb`, comme `Album.trackIds` qui suit la même
convention.

### `endTime` — la durée, donc les heures

Une session n'a aujourd'hui qu'une heure de début. La durée est pourtant la
grandeur utile : c'est elle qui donne le volume horaire studio de l'année, elle
qui rend le coût comparable d'une session à l'autre, et elle qui figure sur une
feuille de session. Un seul champ suffit à l'obtenir ; la durée est **calculée**,
jamais stockée.

Une fin antérieure au début est traitée comme une session qui passe minuit
(exemple réel : 22:00 → 03:00), pas comme une erreur de saisie.

### `cost` — un montant, et rien de plus

Le budget studio est un besoin réel et non couvert : le module Revenus ne gère
que des recettes (factures, royalties, missions d'intermittence), aucune
dépense. Un seul champ numérique, agrégé dans le bandeau, répond à la question
« combien m'a coûté le studio cette année ». Il n'y a **ni statut de paiement,
ni lignes de dépense, ni rattachement à une facture** : construire un suivi de
dépenses ici reviendrait à créer un demi-module de comptabilité dans une page de
planning.

### Dates en ISO

`date` passe de `JJ/MM/AAAA` à `YYYY-MM-DD`. C'est ce qui rend le
`order("date")` du fetch correct, et c'est la condition d'un registre
chronologique fiable. Le risque est nul côté consommateurs : `normalizeToDateKey`
(`GlobalCalendarPage.tsx:276`) et `parseDate` (`DashboardPage.tsx:22`) acceptent
déjà les deux formats, et `src/lib/date-format.ts` expose `toIsoDatePickerValue`
et `toDisplayDate` qui sont précisément faits pour cette tolérance. La saisie
reste en `JJ/MM/AAAA` via `DatePicker`, l'affichage aussi.

Une migration SQL convertit les lignes existantes ; le mapper de lecture reste
tolérant pour les données non converties.

### Rôles d'intervenant : la liste fermée du catalogue

`PARTICIPANT_ROLES` est aujourd'hui une copie mot pour mot de la liste de rôles
du catalogue, augmentée de deux valeurs héritées (`musicien`, `chanteur`)
normalisées à la lecture. Cette duplication disparaît : la page consomme `ROLES`
et `roleLabel` de `src/modules/phono/lib/track.ts`, livrés par la phase 0 de la
spec A. Une session et un crédit de titre parlent ainsi du même vocabulaire, ce
qui est la condition pour qu'un jour l'un alimente l'autre.

Les valeurs historiques `musicien`, `chanteur` et `ingenieur_du_son` sont
normalisées en `musicien_interprete`, `chanteur_interprete` et
`ingenieur_mixage` à la lecture — `normalizePhonoRole` fait déjà les deux
dernières.

### `contactId` — l'intervenant est souvent un contact

Le module Contacts est en Supabase et contient déjà les ingés son, musiciens et
studios avec qui l'artiste travaille. Retaper « Camille Roy » à chaque session
produit des variantes d'orthographe qui rendront un jour une agrégation par
personne impossible. Le champ `contactId` est optionnel : un intervenant de
passage se saisit toujours en texte libre, sans obligation de créer une fiche.

## Interface

### Bandeau « activité studio »

Même conteneur et même vocabulaire que `LiveOverviewPage` et que le
`CatalogHeader` de la spec A :
`rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5`,
barre segmentée, gros chiffre en `font-extralight tabular-nums`, légende
cliquable.

```
┌──────────────────────────────────────────────────────────────────┐
│  Studio                                                  14      │
│  Tes sessions des 12 derniers mois   sessions · 63 h · 2 340 €   │
│                                                                  │
│  ████████████████░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒                     │
│  ● 7 Prise   ● 3 Essai   ● 3 Mix   ● 1 Mastering                 │
│                                                                  │
│  ⚠ 4 sans intervenant       ⚠ 6 sans titre rattaché              │
└──────────────────────────────────────────────────────────────────┘
```

La fenêtre est **glissante sur douze mois** : un registre studio se lit par
saison de travail, et un total depuis toujours ne dit rien d'actionnable. Les
sessions plus anciennes restent listées, elles ne comptent simplement pas dans
l'agrégat.

Les segments et les chips ⚠ sont des **filtres cliquables**, comme dans la spec
A ; recliquer le filtre actif l'annule. Les deux chips ne s'affichent que si
leur compte est non nul, et **ne comptent que les sessions passées** : une
session à venir sans intervenant n'est pas une anomalie, c'est une session pas
encore préparée. Ce sont les deux trous qui empêchent une déclaration de droits,
et c'est ce qui distingue ce bandeau d'une décoration.

Les heures cumulées ignorent les sessions sans heure de fin — la ligne indique
alors « 63 h sur 11 sessions renseignées » plutôt qu'un total silencieusement
faux.

### Liste

Un seul flux, deux sections titrées, plus de `Card` repliables à en-tête
dupliqué :

```
[Rechercher…]         Type ▾    Période ▾              + Session

À venir · 3
┌──────────────────────────────────────────────────────────────────┐
│ ▸  ven. 12 sept. 2025    14:00–19:00 · 5 h        ● Prise        │
│    Session voix chœur              Studio Bleu, Paris 11    📍   │
│    3 intervenants · 2 titres · 450 €                        ⋯    │
└──────────────────────────────────────────────────────────────────┘

Passées · 11
┌──────────────────────────────────────────────────────────────────┐
│ ▾  mar. 26 août 2025     10:00–18:00 · 8 h        ● Mix          │
│    Mix « Nuit blanche »            Studio Bleu, Paris 11    📍   │
│    2 intervenants · 1 titre · 800 €                         ⋯    │
│   ┌───────────────────────────────────────────────────────────┐  │
│   │ Intervenants                                              │  │
│   │  Camille Roy — Ingé Mixage                                │  │
│   │  Théo Bak — Musicien interprète                           │  │
│   │ Titres travaillés                                         │  │
│   │  ▣ Nuit blanche          FR-XXX-25-00001                  │  │
│   │  ▣ Sables                ⚠ ISRC manquant                  │  │
│   └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

Points structurants :

- **La date est le premier élément lu**, en tête de ligne, jour de semaine
  compris : c'est l'axe du registre. Le titre de session, souvent générique
  (« Session voix »), passe en seconde ligne.
- Les sections « À venir » et « Passées » sont **triées en sens inverse** : la
  prochaine session d'abord pour l'une, la plus récente d'abord pour l'autre.
  C'est ce qu'on cherche dans chaque cas.
- Le dépliement révèle **les intervenants avec leurs rôles et les titres avec
  leurs ISRC** — l'information qui existait déjà en base et qu'aucun écran ne
  montrait. Rien d'autre : les notes et le coût tiennent dans la ligne repliée
  ou dans la modale.
- L'icône 📍 (`MapPin`) reste un lien Google Maps, comportement actuel conservé.
- Menu `⋯` : Modifier · Feuille de session · Dupliquer · Supprimer. « Dupliquer »
  reprend lieu, intervenants et type sans la date ni les titres — une série de
  séances au même studio avec la même équipe est le cas normal.

La recherche porte sur le titre, le lieu, le nom des intervenants et le titre
des morceaux rattachés, insensible à la casse et aux accents. Le filtre
« Période » propose : Tout · 12 derniers mois · Cette année · À venir
uniquement.

### Modale de session

Un formulaire unique, création et édition, comme aujourd'hui, mais structuré en
quatre blocs séparés par un filet `border-t border-[rgba(245,245,245,0.08)]` au
lieu d'une colonne de douze champs.

```
┌── Nouvelle session ──────────────────────────────────────────────┐
│ Quand & où                                                       │
│   Type ▾              Titre                                      │
│   Date *   Début   Fin              Durée : 5 h                  │
│   Studio              Adresse (pour la carte)                    │
│ ─────────────────────────────────────────────────────────────── │
│ Intervenants                                                     │
│   [Nom…]                        [Rôle ▾]              ×          │
│     ↳ Camille Roy · Théo Bak · Studio Bleu    (suggestions)      │
│   + Ajouter un intervenant                                       │
│ ─────────────────────────────────────────────────────────────── │
│ Titres travaillés                                                │
│   ▣ Nuit blanche  FR-XXX-25-00001                     ×          │
│   [Rechercher un titre du catalogue…]                            │
│ ─────────────────────────────────────────────────────────────── │
│ Coût (€)          Notes                                          │
└──────────────────────────────────────────────────────────────────┘
```

- **La date est le seul champ obligatoire.** Le bouton d'enregistrement reste
  désactivé tant qu'elle est vide, et **aucune valeur n'est plus inventée** :
  ni date du jour, ni `14:00`. Un titre vide est acceptable — la ligne affiche
  alors le type et le lieu.
- La durée s'affiche en clair sous les champs d'heure dès que début et fin sont
  renseignés, pour que l'erreur de saisie se voie tout de suite.
- Le champ « Nom » d'un intervenant propose, sous lui, jusqu'à cinq suggestions
  cliquables tirées des contacts et des intervenants des sessions passées. Une
  suggestion issue des contacts renseigne `contactId` ; une saisie libre le
  laisse vide. Pas de composant nouveau : un `Input` et une rangée de chips.
- Le sélecteur de titres reprend l'idiome du `TracklistComposer` de la spec A :
  liste des titres retenus, puis champ de recherche et résultats du catalogue
  avec un bouton `Plus`, vingt résultats au maximum.

### Feuille de session

Une modale de lecture, avec un bouton « Copier ». Le texte produit est celui
qu'on colle dans un mail à un ingé son, dans un dossier SPEDIDAM ou dans un
échange avec un producteur :

```
Session — Mix « Nuit blanche »
Mix · 26/08/2025 · 10:00–18:00 (8 h)
Studio Bleu, 12 rue X, 75011 Paris

Titres travaillés
- Nuit blanche — FR-XXX-25-00001
- Sables — ISRC non attribué

Intervenants
- Camille Roy — Ingé Mixage
- Théo Bak — Musicien interprète
```

C'est le pendant de l'export de tracklist des Mixes dans la spec A : une
fonction pure, un presse-papier, aucune génération de PDF. Un PDF supposerait
une charte, une mise en page et une maintenance pour un document qui, dans les
faits, est copié dans un corps de mail.

## Architecture cible

```
src/modules/phono/
  lib/
    session.ts                     ← métier pur, zéro JSX
  components/sessions/
    SessionsHeader.tsx             bandeau « activité studio » + filtres
    SessionRow.tsx                 ligne lisible + dépliement
    SessionDialog.tsx              formulaire unique création + édition
    SessionParticipantsField.tsx   intervenants, suggestions contacts
    SessionTracksField.tsx         sélection de titres du catalogue
    SessionSheetDialog.tsx         feuille de session copiable
  components/
    SessionsStudioPage.tsx         ~170 l. — orchestration, sections, filtres
```

`SessionsStudioPage.tsx` reste à son emplacement actuel :
`app/(app)/phono/sessions-studio/page.tsx` l'importe et aucune route ne change.
Les six composants neufs vivent dans un sous-dossier `sessions/`, symétrique des
`tracks/`, `albums/` et `mixes/` de la spec A.

## Changements de modèle

### Table `user_phono_sessions`

```
+ end_time   text
+ track_ids  jsonb not null default '[]'
+ cost       numeric
~ date       converti de 'DD/MM/YYYY' vers 'YYYY-MM-DD'
```

Aucune colonne n'est supprimée. `participants` reste un `jsonb` : le passage de
`id: number` à `id: string` et de `role` libre à `PhonoRole` se fait par
normalisation à la lecture et réécriture à l'enregistrement, exactement comme
`guest_artists` dans la spec A — pas de migration de contenu, les données se
convertissent au fil des sauvegardes.

`cost` est un `numeric` nullable : `null` signifie « non renseigné », ce qui
n'est pas `0`. Les agrégats ignorent les `null` et disent sur combien de
sessions ils portent.

### Projets ↔ Sessions : un lien réel

`Project.linkedSessions` existe déjà, et `PhonoSection.tsx` permet de lier une
session à un projet. Mais ce composant lit `data.phono.sessions` via
`useSidekickData`, c'est-à-dire le **localStorage**, alors que les sessions sont
en Supabase depuis la migration. La liste des sessions liables y est donc vide,
et les sessions déjà liées ne s'affichent pas. Le même défaut frappe ses lectures
d'albums et de titres.

C'est un bug préexistant, pas une régression de ce chantier, mais il rend faux
le seul lien Projet ↔ Session qui existe. Il est corrigé ici pour la partie
Phono uniquement : `PhonoSection.tsx` et les deux lignes phono de `signalCtx`
dans `CreationTab.tsx` passent à `usePhonoData()`. Les lectures Édition et Live
de Projects souffrent du même mal et sont **laissées telles quelles** : elles
appartiennent au chantier Projets.

Le lien reste **possédé par Projects**. La page Sessions n'affiche aucun badge
de projet : cela supposerait de lire `data.projects`, encore en localStorage et
en cours de migration, pour une information que l'utilisateur consulte du côté
Projets.

## Gestion des erreurs

Les conventions du module sont conservées : `PageLoader` au chargement,
`PageError` avec `onRetry={() => mutate("user_phono")}` en cas d'échec,
`EmptyState` quand aucune session n'existe, `NoResult` quand un filtre ne renvoie
rien. Les écritures passent par `setSessions` et son pattern optimiste — snapshot
synchrone, opération Supabase en IIFE, rollback sur erreur.

Cas propres à cette page :

- **Date absente** — la soumission est bloquée et le champ signalé, au lieu
  d'être remplacée par la date du jour.
- **Fin avant le début** — interprétée comme un passage de minuit ; la durée
  affichée le montre (« 5 h »), aucune erreur n'est levée. Un avertissement
  discret « la session se termine le lendemain » lève l'ambiguïté.
- **Coût non numérique** — le champ n'accepte que des chiffres, un espace ou une
  virgule ; la valeur est parsée en nombre à la soumission, un contenu
  inexploitable est traité comme non renseigné.
- **Titre rattaché supprimé du catalogue** — l'id orphelin est ignoré à
  l'affichage et disparaît au prochain enregistrement de la session.
- **Contact supprimé** — `contactId` devient orphelin, `name` reste : la session
  garde le nom saisi et perd seulement le lien. Le nom d'un intervenant est une
  donnée du registre, pas une projection du carnet d'adresses.
- **Suppression d'une session** — confirmation explicite, mentionnant les
  éventuels titres rattachés (« 2 titres rattachés perdront ce rattachement »).
  Les titres eux-mêmes ne sont jamais touchés.
- **Copie dans le presse-papier refusée** — `navigator.clipboard` échoue hors
  contexte sécurisé ; le texte reste sélectionnable dans la modale et un
  `toast.error` le dit.

Les retours transitoires passent par `sonner`, déjà monté dans le shell. Aucun
`alert()`.

## Vérification

Le dépôt n'a pas de suite de tests. La vérification est manuelle en dev local, et
l'ordre d'implémentation est conçu pour la rendre possible à chaque étape :
`npx tsc --noEmit`, `npm run build`, `npx eslint <fichiers touchés>`, puis
parcours de l'écran livré.

Points à vérifier à l'œil, parce qu'ils encodent du métier ou une conversion
difficile à relire :

- Une session existante en `JJ/MM/AAAA` s'affiche, s'édite et se ré-enregistre
  en ISO sans décalage d'un jour.
- Les sessions apparaissent dans l'ordre chronologique attendu dans chaque
  section, y compris en travers d'un changement d'année.
- Une session dont les participants ont encore un `id` numérique et un rôle
  `musicien` s'affiche avec le libellé « Musicien interprète » et se
  ré-enregistre en ids chaîne.
- Le total d'heures ignore les sessions sans heure de fin et l'annonce.
- Une session qui passe minuit affiche une durée positive.
- Le calendrier global et le dashboard montrent toujours les sessions, aux mêmes
  dates, après la migration ISO.
- Une session liée à un projet apparaît bien dans l'onglet Phono de ce projet.

## Ordre d'implémentation

Approche verticale, comme la spec A : chaque étape est livrée finie et
vérifiable avant la suivante. Le fichier actuel rétrécit progressivement ; son
ancien formulaire est conservé le temps que la vue de lecture soit livrée, puis
remplacé.

1. **Socle.** Types déplacés dans `sidekick-store`, `lib/session.ts`, migration
   SQL, mappers tolérants dans `usePhonoData`. Aucun changement visible.
2. **Lecture.** `SessionsHeader`, `SessionRow`, réécriture de la page en
   orchestration : sections, recherche, filtres, états vides. L'ancien
   formulaire reste branché.
3. **Édition.** `SessionParticipantsField`, `SessionTracksField`,
   `SessionDialog`, suppression de l'ancien formulaire.
4. **Diffusion et liens.** `SessionSheetDialog`, rebranchement des liens
   Projets ↔ Sessions sur Supabase, recette complète.

## Hors périmètre

- **Catalogue et Liens d'écoute** — traités par la spec A et par leur propre
  chantier. Aucun champ dont ils dépendent n'est modifié ici ; le lien
  session → titre est unidirectionnel et n'ajoute rien à `Track`.
- **Affichage des sessions dans la fiche d'un titre.** Écarté : `TrackRow` et
  `TrackDialog` sont figés par la spec A, en cours d'implémentation. La
  réciproque du lien pourra être ajoutée quand la refonte du catalogue sera
  livrée, et coûtera alors quelques lignes puisque la donnée existera.
- **Création automatique d'une mission d'intermittence** depuis une session.
  Écartée : une mission `Enregistrement` suppose un employeur qui déclare
  l'artiste, alors qu'une session du registre est le plus souvent une séance que
  l'artiste finance lui-même. Créer l'une depuis l'autre produirait des
  déclarations fausses.
- **Écriture dans `calendar_events`.** Écartée : le calendrier global dérive
  déjà les sessions depuis `usePhonoData` et leur donne un type `session`, une
  couleur et un lien retour. Les écrire en base créerait une seconde source de
  vérité à synchroniser.
- **Statut de session** (prévue / faite / annulée). Écarté : le passé et le futur
  se déduisent de la date, et une session annulée se supprime. Un enum de plus
  ajouterait un champ à saisir et une règle de filtrage pour un cas que
  l'utilisateur traite en trois clics.
- **Gestion de dépenses.** Un montant, agrégé. Ni échéance, ni statut de
  paiement, ni pièce jointe : cela appartiendrait à un module de dépenses que
  Revenus ne possède pas encore.
- **Vue agenda / semaine dans la page.** Écartée : `GlobalCalendarPage` et
  `WeekScheduleGrid` le font déjà pour tous les modules.
- **Génération PDF de la feuille de session.** Écartée au profit du texte
  copiable, pour la raison donnée plus haut.
- **Lectures Édition et Live de Projects** encore branchées sur localStorage :
  signalées, non corrigées, elles relèvent du chantier Projets.

## Décisions prises en ton absence

Chacune de ces décisions t'appartient et a été tranchée sans toi pour éviter un
« à valider » dans une spec. Elles sont classées de la plus structurante à la
plus anodine.

1. **La session porte la liste des titres travaillés (`trackIds`).** Sans ce
   lien, la promesse « droits voisins » de la page est vide, puisqu'une
   déclaration se fait par enregistrement et par interprète. *Alternative
   écartée :* porter le lien côté titre (`Track.sessionIds`) — impossible sans
   rouvrir la spec A, et contraire à l'ordre chronologique de saisie.
2. **Aucun statut de session.** Le futur et le passé se déduisent de la date ; une
   session annulée se supprime. *Alternative écartée :* un enum
   prévue/faite/annulée, qui ajoute un champ à saisir sur chaque session pour
   distinguer un cas rare.
3. **Le budget se réduit à un montant unique.** `cost`, en euros, agrégé sur
   douze mois. *Alternative écartée :* lignes de dépense avec statut de paiement
   et rattachement à une facture, soit un module de dépenses complet qui
   n'existe pas encore dans Revenus.
4. **Les dates passent en ISO en base, avec migration.** C'est la seule façon de
   rendre le tri SQL juste. *Alternative écartée :* garder `JJ/MM/AAAA` et
   trier côté client, qui laisse la base dans un ordre faux et reporte le
   problème sur chaque futur consommateur.
5. **Aucun pont vers l'intermittence.** *Alternative écartée :* un bouton
   « déclarer cette session en mission », qui inviterait à déclarer comme
   salariées des séances autofinancées.
6. **Les rôles d'intervenant réutilisent `ROLES` du catalogue** plutôt que leur
   liste locale, aujourd'hui dupliquée mot pour mot. *Alternative écartée :* un
   rôle en texte libre, qui rendrait toute agrégation par rôle impossible.
7. **La fenêtre du bandeau est de douze mois glissants.** *Alternative écartée :*
   un total depuis toujours, qui grossit sans rien dire d'actionnable.
8. **La feuille de session est un texte copiable, pas un PDF.** *Alternative
   écartée :* une génération PDF, qui demande une charte et une maintenance pour
   un contenu qu'on colle dans un mail.
9. **Le lien Projet reste possédé par Projects** et n'est pas affiché sur la
   ligne de session. *Alternative écartée :* un badge de projet, qui obligerait
   à lire `data.projects`, encore en localStorage.
10. **`PhonoSection` et les deux lignes phono de `CreationTab` sont rebranchés
    sur Supabase**, mais pas leurs lectures Édition et Live. *Alternative
    écartée :* corriger tout Projects, hors sujet ici ; ou ne rien corriger, ce
    qui laisserait le lien Projet ↔ Session inopérant.
11. **`endTime` est ajouté, l'heure de début devient facultative, et plus aucune
    valeur par défaut n'est inventée.** *Alternative écartée :* conserver les
    défauts « aujourd'hui » et « 14:00 », qui polluent un registre censé faire
    foi.
12. **`contactId` est optionnel sur un intervenant, et la saisie libre reste
    possible.** *Alternative écartée :* n'accepter que des contacts, ce qui
    forcerait à créer une fiche pour un musicien de passage.
13. **Le titre de session devient facultatif** et la ligne retombe sur le type et
    le lieu. *Alternative écartée :* le rendre obligatoire, ce qui produirait des
    « Session » génériques saisis à contrecœur.
