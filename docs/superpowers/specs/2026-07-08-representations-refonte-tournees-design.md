# Refonte du module Représentations (Live) — regroupement par tournée

**Date** : 2026-07-08
**Module** : `live` — page Représentations (`/live/representations`)
**Statut** : design validé, prêt pour plan d'implémentation

## Objectif

Refondre visuellement la page Représentations pour reprendre l'esthétique épurée
de la vue d'ensemble Live ([LiveOverviewPage.tsx](../../../src/modules/live/components/LiveOverviewPage.tsx)),
et introduire la notion de **tournée** : les dates d'un même projet forment une
tournée. On peut aussi créer des dates **hors tournée** (non reliées à un projet).

## Décisions de conception (validées)

| Sujet | Décision |
|---|---|
| Modèle de tournée | Une tournée **est** un projet live. Source de vérité = `Project.linkedTourDates`. Pas de nouvelle entité, pas de champ sur `TourDate`. |
| Disposition | Hybride à bascule : en-tête de stats commun + toggle **Chronologique ⇄ Par tournée**. |
| Accès au détail d'une date | **Ligne dépliable** (accordéon) : le détail se révèle sous la ligne. |
| Design du timetable | **Lignes horaires épurées** : heure en accent tabulaire + activité + séparateurs fins, badges Début/Fin. |
| Lien date→tournée | Sélecteur des projets live existants + « Hors tournée » **+ création rapide** d'un projet live minimal. |
| Dates passées | Filtre segmenté **À venir · Passées · Toutes** (défaut : À venir), actif dans les deux vues. |

## Architecture des données

**Aucune nouvelle table, aucun nouveau champ sur `TourDate`.** Le lien reste porté
par `Project.linkedTourDates` (colonne `linked_tour_dates`, `string[]`), déjà
persistée en base et déjà consommée par le module Projets
([ProjectModal](../../../src/modules/projects/components/ProjectModal.tsx),
[LiveSection](../../../src/modules/projects/components/sections/LiveSection.tsx),
[rules/projects.ts](../../../src/modules/tasks/rules/projects.ts)…).

### Chargement

La page charge en parallèle :
- Dates → `useLiveData()` (existant)
- Projets → `useProjectsData()` (existant)

### Index date → tournée

On parcourt les projets ; pour chaque `linkedTourDates`, on rattache la date
correspondante. **Attention au type** : `TourDate.id` est un `number`,
`linkedTourDates` contient des `string`. La comparaison se fait via `String(date.id)`.

Une date appartient à **au plus une** tournée (le premier projet qui la référence
fait foi ; on considère l'unicité comme un invariant maintenu par les écritures).

### Écritures (via `setProjects`, pattern optimiste existant)

- **Relier** une date à une tournée : ajouter `String(date.id)` au `linkedTourDates`
  du projet cible **et** le retirer de tout autre projet (garantit une date = une tournée).
- **Hors tournée** : retirer `String(date.id)` de tous les projets.
- **Création rapide** : créer un `Project` minimal puis y attacher la date :
  ```ts
  {
    id: crypto.randomUUID(),
    title: <nom saisi>,
    description: "",
    status: "in_progress",
    sectors: ["live"],
    cover: "", images: [], members: [],
    linkedAlbums: [], linkedTracks: [], linkedSessions: [], linkedWorks: [],
    linkedTourDates: [String(date.id)],
    linkedRehearsals: [], linkedStatutIds: [], keyDates: [],
    notes: "", brainstorm: "", creationSeededSectors: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
  ```
  Le projet devient éditable normalement dans le module Projets.

Aucune écriture n'est faite sur `TourDate` pour le lien — uniquement sur les projets.

## Refactor structurel

[TourDatesPage.tsx](../../../src/modules/live/components/TourDatesPage.tsx) fait
~2543 lignes : trop pour une seule unité. La refonte le découpe en unités focalisées
et testables (dans `src/modules/live/components/representations/`) :

- **`useRepresentationsView`** (hook) — entrées : dates + projets + filtre + mode de vue.
  Sorties : listes filtrées, regroupement par tournée, index date→tournée, stats
  d'en-tête (total, répartition par statut, nb de villes).
- **`RepresentationsHeader`** — titre, bouton d'ajout, bloc stats (chiffre + barre
  pipeline + villes), filtre segmenté, toggle de vue.
- **`RepresentationRow`** — la ligne dépliable (accordéon) + timetable + chips logistique.
- **`TourGroup`** — en-tête de tournée (nom, période, nb dates, mini-barre statuts) + ses lignes.
- **`RepresentationDialogs`** — les dialogs existants (transport, logement, rémunération,
  matériel, documents, ajout/édition) déplacés **tels quels**, avec ajout du sélecteur Tournée.

**Réutilisation** : le mapping `STATUS_META` (couleur + variante de badge par statut)
est aujourd'hui local à `LiveOverviewPage`. Le remonter dans un module partagé
(ex. `src/modules/live/data/statusMeta.ts`) pour que les deux pages le lisent.
Réutiliser les helpers de date de [date-format.ts](../../../src/lib/date-format.ts)
là où ils existent ; sinon regrouper `parseFrDate` / `isRepresentationPast` /
`formatDateShort` / `relativeLabel` dans un helper partagé.

**Préservation** : rien de la logistique existante n'est perdu — timetable persisté
en localStorage (`live:tour-dates:*`), transport/logement, note de frais PDF, liens
factures/missions, documents. C'est réagencé, pas supprimé.

## Structure de la page (UI)

### En-tête (commun aux deux vues)
- Titre « Représentations » + bouton `Ajouter une représentation`.
- Bloc stats : grand chiffre (nb de dates du filtre courant, `font-extralight tabular-nums`)
  + barre pipeline segmentée par statut + « n villes ».
- Filtre segmenté **À venir · Passées · Toutes** (défaut : À venir) — pilote les stats.
- Toggle **Chronologique ⇄ Par tournée**.

### Vue Chronologique
Liste plate de lignes triées par date. Chaque ligne : pastille de statut, `salle — organisateur`,
ville, badge tournée coloré (ou « Hors tournée » discret), date + relatif. Clic → déplie.

### Vue Par tournée
Un `TourGroup` par tournée ayant des dates dans le filtre courant :
- En-tête : nom (couleur dérivée du projet), période (min→max des dates), nb dates, mini-barre statuts.
- Les lignes de date à l'intérieur (mêmes `RepresentationRow`).
- Un bloc final **« Hors tournée »** pour les dates isolées.

### Ligne dépliée (accordéon)
Révèle sous la ligne :
- **Timetable** en lignes horaires épurées + bouton « Gérer » existant.
- **Logistique** : chips Transport / Logement / Rémunération / Matériel (état actif + compteur)
  ouvrant les dialogs existants.
- **Adresse** (lien Google Maps), **Note**, **Documents**, actions Modifier / Supprimer.
- **Sélecteur Tournée** : projets live + « Hors tournée » + création rapide.

### Dialog Ajout / Édition
Ajout du sélecteur Tournée (mêmes options, dont création rapide).

## Système visuel
Surfaces `rgba(44,44,46,0.5)`, bordures `rgba(245,245,245,0.08)`, `rounded-xl`,
`tabular-nums`, accent `#F0FF00`, couleurs de statut de `STATUS_META`. Icônes Lucide.
Dark-only (aucune variante claire).

## Hors périmètre (YAGNI)
- Pas de carte/itinéraire sur cette page (reste sur la vue d'ensemble Live).
- Pas de drag-and-drop de réordonnancement.
- Pas de page-route dédiée par date.
- Pas de migration du modèle de lien vers `TourDate` (source de vérité = projets).

## Points de vigilance
- **Type d'id** : toujours comparer `String(date.id)` avec les entrées `linkedTourDates`.
- **Unicité** : une écriture de lien doit retirer la date des autres projets.
- **Hydratation** : la logistique persistée en localStorage (`isHydrated`) doit rester
  gérée comme aujourd'hui pour éviter les erreurs d'hydratation SSR.
- **Chargement** : gérer `loading`/`error` combinés des deux hooks (dates + projets).
