# Page d'édition d'un titre — module Phono

**Date :** 14/09/2026
**Statut :** validé, prêt pour le plan d'implémentation

## Le problème

Créer un titre passe aujourd'hui par `TrackDialog`, une fenêtre de 14 champs en
`sm:max-w-3xl` avec `max-h-[90vh] overflow-y-auto` — on scrolle dans une
fenêtre, le pire des deux mondes. Trois défauts, dans l'ordre où ils se font
sentir :

1. **Les sections n'existent que dans le code.** « Identité », « Publication »,
   « Crédits » sont des commentaires HTML séparés par un `border-t`. À l'écran :
   quatorze champs à la file, sans titre ni respiration.
2. **Aucune hiérarchie.** « Titre \* » et « Distribution » ont le même poids
   visuel, alors qu'un titre en production n'a ni ISRC, ni date, ni
   distributeur.
3. **La création est coupée en deux.** Le dialogue l'annonce lui-même : « Les
   versions et leurs fichiers audio se gèrent depuis la fiche du titre ». On
   crée, on ferme, on retrouve la ligne, on la déplie, on attache l'audio.

Le troisième point est le vrai coût. Les deux premiers sont ce qui donne
l'impression de « fenêtre plate, sans indication ».

## Ce qu'on construit

Une page dédiée, disposition deux colonnes, qui remplace le dialogue et absorbe
l'étape audio.

### Routes

```
app/(app)/phono/catalogue/titre/nouveau/page.tsx      → création
app/(app)/phono/catalogue/titre/[trackId]/page.tsx    → édition
```

Les deux montent `TrackEditPage`
(`src/modules/phono/components/tracks/TrackEditPage.tsx`). Sous `/phono`, donc
`ModuleGuard` couvre le secteur désactivé sans rien ajouter.

**Pas de lien dans la sidebar.** La règle du `CLAUDE.md` (« toute nouvelle page
ajoute son lien de navigation ») vise les destinations. Une route de détail n'en
est pas une — noté ici pour qu'on ne prenne pas l'absence de lien pour un oubli.

`/titre/[trackId]` sur un identifiant inconnu affiche l'état d'erreur de page
existant (`PageError`), avec retour au catalogue.

### Composition

**Colonne gauche**

| Bloc | Contenu | État |
|---|---|---|
| L'essentiel | Titre \*, Artiste principal \*, Rôle, Statut | ouvert |
| Versions & audio | liste des versions, dépôt des fichiers | ouvert |
| Publication | date de sortie, ISRC, genre, distribution, auto-produit, label, éditeur | replié |
| Crédits & notes | artistes invités, notes | replié |

Un bloc replié s'ouvre d'office s'il contient déjà une donnée : on ne cache
jamais ce qui est rempli. Chaque bloc porte un titre visible et une ligne qui
dit à quoi il sert — c'est la réponse directe au « pas d'indication ».

**Colonne droite, collante** — pochette (`TrackCoverField`), panneau « Il
manque », bouton d'enregistrement.

Le panneau « Il manque » liste ce qui bloque concrètement l'artiste : pas de
fichier audio, pas d'ISRC, pas de date de sortie. Mêmes manques que ceux que
`CatalogHeader` compte déjà pour tout le catalogue — même vocabulaire, même
couleur d'alerte.

### Versions : réutilisation, pas réécriture

`VersionList` et `VersionRow` sont montés tels quels dans la page. Aucun
composant nouveau, et **la ligne dépliable du catalogue reste intacte** : même
code à deux emplacements. C'est ce qui rend le chantier tenable à sept jours de
l'ouverture de l'alpha.

### Le statut pilote le nom de la version

Demander « Original » sur un titre en production n'a pas de sens : le master
n'existe pas encore. Nouvelle fonction dans `src/modules/phono/lib/track.ts` :

```ts
export function suggestedVersionLabel(status: ReleaseStatus): string
```

| Statut | Version proposée |
|---|---|
| `en_production` | Maquette |
| `mixe` | Pré-mix |
| `masterise` | Master |
| `publie` | Original |

Trois règles :

1. **Suggestion, jamais imposition.** Le nom reste éditable et n'écrase jamais
   une saisie.
2. **Suivi silencieux tant que la version est vierge.** Une version sans fichier
   et jamais renommée suit le statut sans rien demander : rien à réécrire,
   personne ne l'a vue.
3. **Jamais de renommage d'une version établie.** Une version qui porte un
   fichier a été déposée comme maquette — la renommer « Master » réécrirait
   l'histoire, et les liens d'écoute publiés dénormalisent ce nom. Changer le
   statut **sur la page** propose à la place `+ Ajouter une version Master`, en
   ligne dans la carte, pas en pop-up.

Un statut avancé depuis ailleurs — publier un album fait avancer ses titres,
`AlbumsTab.tsx:73-84` — ne déclenche aucune proposition : personne n'est devant
l'écran pour y répondre.

### Enregistrement

Bouton explicite, pas d'autosave. À la création, on enregistre **et on reste sur
la page** : l'URL devient `/titre/[id]` (`router.replace`), le titre est en base,
l'audio s'attache dans la foulée. C'est la fin du parcours en deux temps.

L'audio peut être déposé avant le premier enregistrement : `AudioAttachField`
téléverse dans `<userId>/phono/audio` sans avoir besoin d'un identifiant de
titre, et le chemin vit dans l'état du formulaire jusqu'à l'enregistrement. Si
la page est quittée sans enregistrer, `pruneOrphanAudio` ramasse le fichier au
passage suivant sur le catalogue — le sursis d'une heure est prévu pour ce cas.

Quitter avec des modifications non enregistrées demande confirmation
(`beforeunload` + confirmation sur « Annuler »).

### Rattachement au projet

`TracksTab.tsx:193` écrit le rattachement via `useSidekickData`, c'est-à-dire
**dans le vide** : un titre créé depuis un projet n'y est jamais rattaché.
`ALPHA.md` le liste comme reste à faire. La page reprend `?projectId=` et écrit
via `useProjectsData`. Le bug meurt avec le dialogue.

## Ce qui disparaît

- `TrackDialog.tsx` — supprimé.
- `TracksToolbar` : `onCreate` devient une navigation vers
  `/phono/catalogue/titre/nouveau` (en conservant `?projectId=` s'il est là).
- `TrackRow` : « Modifier » navigue vers `/phono/catalogue/titre/[id]`.
- `TracksTab` : `dialogOpen`, `editingTrack`, `handleSubmit` et l'écriture
  `useSidekickData` s'en vont avec.

L'événement PostHog `item_created` suit la création : il est émis par la page.

## Hors périmètre

- La saisie éclair multi-titres (titre + artiste, Entrée, ligne suivante) pour
  rentrer un back-catalogue. Discutée, reportée après l'ouverture.
- La refonte de la ligne dépliable du catalogue.
- L'autosave.

## Risques

- **Calendrier.** `ALPHA.md` ne prévoit pas ce chantier dans la semaine du 14/09
  et l'ouverture est le 21/09. Décision de l'artiste, prise en connaissance de
  cause. Le choix de réutiliser `VersionList`/`VersionRow` tels quels est là
  pour contenir la surface touchée.
- **Deux emplacements d'édition des versions** (page et ligne dépliable) tant
  que la seconde n'est pas simplifiée. Acceptée : même code, aucun risque de
  divergence de comportement.
