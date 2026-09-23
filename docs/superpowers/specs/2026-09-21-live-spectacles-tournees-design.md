# Live — « Spectacles & tournées » comme tour de contrôle

Date : 21/09/2026 · Module : Live (`/live`, fiches spectacle / tournée,
formulaire événement, Prospection, Répétitions)

## Intention

La page « Spectacles & tournées » range trois choses côte à côte : spectacles,
DJ sets et tournées. Or une tournée n'est pas une troisième sorte de live, c'est
**une étape après** : on part en tournée *avec* un spectacle ou un DJ set. Le
modèle le dit déjà à moitié (`LiveProduction.productionId` sur une tournée),
mais le lien est facultatif, les deux fiches ont des étapes de préparation
concurrentes, et une date peut se rattacher soit au spectacle, soit à la
tournée, soit aux deux en se contredisant.

Cette spec pose une échelle à trois niveaux, **objet → campagne →
occurrence** :

1. **Spectacle / DJ set** — l'objet artistique : identité, setlist, fiche
   technique, matériel, équipe. Durable.
2. **Tournée** — une campagne de diffusion de cet objet : une période, des
   dates, de la prospection, de la logistique. Optionnelle, répétable.
3. **Représentation** — une occurrence : elle joue un spectacle, et appartient
   éventuellement à une tournée.

Chaque satellite du module accroche à un niveau : répétitions, matériel et
setlist au spectacle (et, pour les répétitions, éventuellement à la tournée),
prospection à la tournée, revenus à la représentation. La page `/live` devient
la tour de contrôle qui montre ces liens ensemble. Elle absorbe l'actuelle
« Vue d'ensemble » et garde l'intitulé **« Spectacles & tournées »**.

La progression cesse d'être déclarative : les étapes qui peuvent se déduire des
données se calculent, avec la possibilité de les forcer.

## Périmètre

Dans le périmètre :

- la page `/live` refaite, qui remplace `LiveOverviewPage` et `ProductionsPage` ;
- la fiche de tournée enrichie (dates, répétitions, prospection, itinéraire) ;
- la tournée rattachée obligatoirement à un spectacle ;
- la cascade Spectacle → Tournée dans le formulaire événement, pour les
  représentations **et** les répétitions ;
- le rattachement d'une entrée de prospection à une tournée (seule migration
  SQL) ;
- la progression calculée et forçable, pour les tournées et les spectacles ;
- la reprise des données existantes ;
- la navigation (sidebar, redirections, liens internes).

Hors périmètre, inchangé :

- le stockage des spectacles et tournées : `tour` reste un `LiveKind`, dans la
  même table, pas de nouvelle entité ;
- la checklist propre à une date (`DATE_STEPS`), qui reste manuelle ;
- le module Matériel, l'inventaire, les listes ;
- la page Prospection au-delà du champ et du filtre de tournée ;
- une tournée qui mêle plusieurs spectacles : exclue volontairement par la règle
  « une tournée = un spectacle », à reprendre après l'ouverture si le besoin
  apparaît.

## Règles du modèle

| Objet | Spectacle (`productionId`) | Tournée (`tourId`) |
|---|---|---|
| Tournée | **obligatoire**, choisi à la création, lecture seule ensuite | — |
| Représentation | **obligatoire** | facultative, tournée **de ce spectacle** |
| Répétition | facultatif | facultative ; si choisie, le spectacle suit |
| Entrée de prospection | — | facultative |

- Un lieu démarché appartient à une seule tournée. Le redémarcher pour la
  tournée suivante, c'est le rattacher à nouveau.
- **Une seule source pour « quel spectacle »** : `details.productionId`. Le
  `productionId || tourId` des lectures actuelles disparaît
  (`ProductionsPage.tsx:52`, `ProductionEditPage.tsx:72`). `tourId` sert
  uniquement à regrouper. Exception volontaire : `useProjectBudgetData.ts:144`
  garde sa comparaison sur `tourId`, parce qu'un projet peut être rattaché
  directement à une tournée.
- Invariant : si un événement a un `tourId`, la tournée a le même
  `productionId` que l'événement.

## La page `/live` — « Spectacles & tournées »

De haut en bas :

1. **En-tête** « Spectacles & tournées », avec deux actions de création :
   Spectacle, DJ set. La tuile Tournée disparaît.
2. **Bandeau transverse**, court : la prochaine échéance (date ou répétition, en
   relatif : « demain », « dans 3 j ») avec un lien, puis des compteurs
   (« 4 dates à venir · 2 encore en option »). Le pipeline de prospection
   détaillé reste sur la page Prospection.
3. **Zone « À rattacher »**, affichée seulement si elle n'est pas vide, avec
   trois cas :
   - tournée sans spectacle → choix du spectacle ;
   - représentation à venir sans spectacle → choix du spectacle (les dates
     passées sans spectacle ne sont pas listées, pour ne pas noyer la zone sous
     l'historique) ;
   - événement dont le spectacle contredit celui de sa tournée → « Aligner sur
     la tournée » (le spectacle devient celui de la tournée) ou « Sortir de la
     tournée » (la tournée est retirée).

   Chaque ligne disparaît une fois résolue.
4. **Une carte par spectacle / DJ set**, avec un filtre Tout / Spectacles /
   DJ sets et une recherche. Une carte contient :
   - en-tête : nom, badge de type, progression de l'objet et prochaine étape ;
   - état de l'objet : setlist (n morceaux · durée), fiche technique, listes de
     matériel ;
   - **ses tournées, en lignes** : nom, période (première → dernière date),
     « n dates · n répétitions · n lieux démarchés », répartition des dates par
     statut, progression de la tournée ; clic → fiche de tournée ;
   - une ligne **Hors tournée** pour les dates isolées, si elle en compte ;
   - la prochaine échéance de ce spectacle ;
   - l'action **« Monter une tournée »**.
5. **État vide** : aucun spectacle → invitation à créer un spectacle ou un DJ
   set, plus les liens « Ajouter une date » et « Planifier une répétition » qui
   existent aujourd'hui dans la Vue d'ensemble.

La carte « Itinéraire » quitte cette page (voir fiche de tournée). La timeline
mélangeant dates et répétitions est remplacée par la prochaine échéance du
bandeau et par celle de chaque carte ; les listes complètes restent sur
Représentations et Répétitions.

## Fiche de tournée (`/live/spectacles/[id]`, `kind = "tour"`)

- **Identité** : nom, description, spectacle. À la création, le spectacle est un
  choix obligatoire, pré-rempli quand on arrive depuis une carte
  (`?kind=tour&productionId=…`). Une fois la tournée enregistrée, il est affiché
  en lecture seule, avec un lien vers la fiche du spectacle.
- **Dates** : ordre chronologique, statut de chacune, répartition par statut en
  tête. Action « Ajouter une date » (spectacle et tournée pré-remplis).
- **Répétitions de la tournée** : même présentation. Alerte si aucune
  répétition n'est prévue avant la première date à venir. Action « Planifier une
  répétition » (pré-remplie).
- **Prospection** : les lieux rattachés et leur statut, avec le décompte par
  statut. Action « Démarcher un lieu », qui ouvre Prospection avec la tournée
  pré-sélectionnée.
- **Itinéraire** : la carte Leaflet déplacée depuis `LiveOverviewPage`,
  restreinte aux dates de la tournée.
- **Colonne latérale** : progression calculée (voir plus bas), matériel et fiche
  technique de la tournée comme aujourd'hui.

La fiche de spectacle garde sa structure actuelle, avec en plus une section
**Tournées** (lignes identiques à celles de la carte, bouton « Monter une
tournée ») au-dessus de « Dates associées », qui ne montre plus que les dates
hors tournée.

## Formulaire représentation / répétition (`EventEditPage`)

- Cascade **Spectacle / DJ set**, puis **Tournée**. La liste des tournées est
  filtrée sur le spectacle choisi et commence par « Hors tournée ».
- Changer de spectacle vide la tournée si elle n'appartient pas au nouveau
  spectacle.
- Choisir une tournée impose son spectacle, même si un autre était sélectionné.
  Si la setlist de l'événement change à cette occasion, la confirmation
  existante (« Remplacer la setlist… ») s'applique.
- Le choix de tournée est affiché pour les répétitions aussi (aujourd'hui masqué
  par `!rehearsal`).
- Représentation sans spectacle : l'enregistrement est refusé, avec un message.
- Arrivée par `?tourId=` : spectacle et tournée pré-remplis.

Listes :

- **Représentations** : le filtre Tournée existe ; chaque option affiche
  « Tournée · Spectacle » pour lever les homonymes. Même libellé partout où une
  tournée se choisit (formulaire événement, Prospection).
- **Répétitions** : reçoit le même filtre par tournée, et chaque ligne affiche
  « Spectacle · Tournée ».

## Prospection

- `ProspectionEntry.tourId?: string`, mappé sur une nouvelle colonne
  `user_live_prospection.tour_id text` (nullable).
- Dans le formulaire d'une entrée : un choix « Tournée » facultatif, options
  « Tournée · Spectacle ». Une nouvelle entrée créée pendant que le filtre
  Tournée est actif est pré-rattachée à cette tournée.
- Sur la page Prospection : un filtre par tournée, alimenté aussi par
  `?tourId=` pour le lien depuis la fiche de tournée.

## Progression calculée, forçable

Un calcul par étape, qui renvoie « faite » ou « à faire » et la liste de ce qui
bloque. Pour une étape calculée, le champ `preparation` existant ne sert plus
qu'aux **forçages** : `done` ou `na` = étape forcée ; `todo` ou clé absente =
étape calculée. « Revenir au calcul » supprime la clé.

Tournée, calculée sur ses dates à venir (date ≥ aujourd'hui et statut ≠
« Passée ») :

| Étape | Faite quand… | Ce qui bloque |
|---|---|---|
| Prospection | au moins un lieu rattaché est « Accepté » | « aucun lieu accepté · n démarchés » |
| Dates confirmées | au moins une date, aucune « En option » | les dates en option |
| Cachets convenus | chaque date confirmée a « Rémunération convenue » faite ou sans objet | les dates concernées |
| Logistique préparée | chaque date confirmée a « Transport » et « Logement » faits ou sans objet | les dates concernées |

« Date confirmée » = statut Confirmée, Signée ou Finalisée. Les cases lues sont
celles de la checklist de la date (`details.preparation`, `DATE_STEPS`), qui
gère déjà « sans objet » : une date à domicile marquée « Logement : sans objet »
ne bloque pas la tournée.

Spectacle / DJ set :

| Étape | Mode | Faite quand… |
|---|---|---|
| Concept / Ambiance | manuelle | cochée |
| Setlist / Sélection | calculée | au moins un morceau |
| Équipe réunie | manuelle | cochée |
| Matériel préparé | calculée | au moins une liste de matériel |
| Répétitions effectuées | calculée | au moins une répétition passée rattachée au spectacle |
| Fiche technique prête | calculée | « Contact technique » et « Son & retours » renseignés |

Affichage (composant `Preparation`) :

- une étape calculée n'a pas de case à cocher, mais un menu pour la forcer à
  « faite » ou « sans objet » ;
- une étape forcée garde le libellé de ce que dit le calcul, en discret
  (« marquée faite · 1 date sans logement »), et propose « revenir au calcul » ;
- un clic sur une étape bloquée déplie la liste de ce qui bloque, avec des liens
  vers les dates concernées.

La barre de progression et la « prochaine étape » des cartes utilisent le même
calcul, via une seule fonction du modèle, pour que carte et fiche ne divergent
jamais.

## Reprise des données existantes

Reprise one-shot côté client, idempotente, sur le modèle des autres
`migrate-*` du projet :

1. **Événement avec `tourId` sans `productionId`** : le `productionId` de la
   tournée est écrit sur l'événement.
2. **Tournée sans `productionId`**, et **événement dont le spectacle contredit
   celui de sa tournée** : aucune écriture ; ils apparaissent dans la zone « À
   rattacher » de `/live`.
3. **`preparation` des tournées et spectacles** : aucune écriture. La règle de
   lecture ci-dessus suffit : un `done` ou `na` coché avant la refonte se lit
   comme un forçage, un `todo` comme « calculé ». Les étapes restées manuelles
   ne changent pas.

Les données de démonstration (`demo-seed-data.ts`) sont déjà cohérentes : la
tournée de démo a un `productionId` et sa date porte les deux identifiants. À
vérifier après la reprise : l'étape 3 ne doit pas changer l'affichage attendu
dans `scripts/shots.mjs`.

## Navigation et points d'entrée

- Sidebar Live : **Spectacles & tournées** (`/live`), Représentations,
  Répétitions, Prospection, Matériel. « Vue d'ensemble » disparaît.
- `/live/spectacles` redirige vers `/live`. Les fiches restent sur
  `/live/spectacles/[id]` et `/live/spectacles/nouveau`, pour ne casser aucun
  lien existant.
- Liens internes à repointer vers `/live` : `RehearsalsPage.tsx:42`,
  `TourDatesPage.tsx:35`, les deux `Jump` de `LiveOverviewPage` (supprimée).
- `/live/spectacles/nouveau?kind=tour` sans `productionId` reste valide : le
  formulaire demande le spectacle avant de pouvoir enregistrer.
- **Projets : hors périmètre, non modifié.** `LiveSection.tsx:44` continue
  d'ouvrir `/live/spectacles/nouveau?kind=tour&projectId=…` sans spectacle. Ce
  lien atterrit sur le cas précédent : le formulaire exige le spectacle, donc
  aucune tournée orpheline ne peut plus être créée par ce chemin, sans toucher
  au module Projets.

## Déploiement

- Une migration dans `supabase/migrations/` : `ALTER TABLE
  user_live_prospection ADD COLUMN tour_id text;`. Elle doit passer en prod
  **avant** le déploiement du front, sinon l'écriture d'une entrée de
  prospection échoue sur une colonne inconnue.
- Pas d'autre changement de schéma.

## Vérification

Pas de suite de tests : `npx tsc --noEmit`, `npm run lint`, puis vérification en
dev avec le compte de captures (données réelles, à ménager) :

- `/live` affiche le spectacle de démo avec sa tournée en ligne, et la zone « À
  rattacher » est absente ;
- une tournée créée depuis une carte a son spectacle en lecture seule ;
- dans le formulaire, changer de spectacle vide une tournée incompatible ;
- une répétition peut être rattachée à une tournée et apparaît dans sa fiche ;
- la progression d'une tournée change quand on coche le logement d'une date, et
  un forçage affiche toujours ce qui bloque ;
- une entrée de prospection rattachée apparaît dans la fiche de tournée.
