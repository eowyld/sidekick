# Catalogue Albums — page dédiée de création / modification

Date : 16/09/2026 · Module : Phono → Catalogue → onglet « Albums & EP »

## Intention

L'onglet Titres a été refondu : la création et la modification d'un titre se
font sur une **page dédiée** (`/phono/catalogue/titre/nouveau`,
`/phono/catalogue/titre/[trackId]`), organisée en sections repliables avec une
colonne latérale collante qui porte la pochette, les manques et les actions.

Les albums sont restés sur `AlbumDialog` — une fenêtre à deux colonnes, sans
suivi des modifications, sans protection contre l'abandon, et dont la tracklist
est coincée dans une demi-largeur. Cette spec aligne les albums sur la grammaire
des titres, et fait de la tracklist la section centrale de la page.

Deux capacités nouvelles au passage : **ajouter un titre existant** du catalogue
à l'album (déjà présent, mais à l'étroit) et **créer un titre à la volée**
depuis l'album, qui rejoint aussitôt le catalogue général.

## Périmètre

Dans le périmètre :

- nouvelle page d'édition/création d'album, remplaçant `AlbumDialog` ;
- refonte de `TracklistComposer` : pleine largeur, création inline, lien vers la
  page titre ;
- annonce explicite de la propagation de statut aux titres.

Hors périmètre, inchangé :

- le modèle de données — un album ne fait que référencer des `trackId`, il ne
  duplique jamais un titre ; aucune migration Supabase ;
- la règle de propagation de statut elle-même (jamais en arrière) ;
- l'export de métadonnées, le tri du catalogue, la file du lecteur ;
- `AlbumCard`, sauf la cible de son clic ;
- l'onglet Mixes et l'onglet Titres.

## Architecture

### Routage

Deux routes, calquées sur les pages titre existantes :

```
app/(app)/phono/catalogue/album/nouveau/page.tsx   → <AlbumEditPage albumId={null} />
app/(app)/phono/catalogue/album/[albumId]/page.tsx → <AlbumEditPage albumId={albumId} />
```

La seconde est un composant serveur `async` qui déballe `params` (Promise), comme
`app/(app)/phono/catalogue/titre/[trackId]/page.tsx`.

Ces routes vivent sous `/phono/catalogue`, déjà présent dans la navigation :
aucun lien à ajouter dans `Sidebar.tsx` (la consigne ne vise que les routes qui
n'appartiennent à aucun groupe existant — comme les pages titre, qui n'en ont pas
reçu non plus).

### Composants

Trois fichiers sous `src/modules/phono/components/albums/`, miroir du trio titre :

| Fichier | Rôle | Équivalent titre |
|---|---|---|
| `AlbumEditPage.tsx` | état du formulaire, chargement, écriture Supabase, navigation | `TrackEditPage.tsx` |
| `AlbumEditForm.tsx` | les sections de la colonne principale | `TrackEditForm.tsx` |
| `AlbumEditAside.tsx` | pochette, « Il manque », Enregistrer / Annuler | `TrackEditAside.tsx` |

`AlbumDialog.tsx` est supprimé. `AlbumCreditsFields.tsx` (contributeurs + invités)
et `TrackCoverField.tsx` sont réutilisés tels quels.

`TracklistComposer.tsx` est retravaillé mais garde son nom, sa place et son
contrat : il reçoit `trackIds` et rend toujours le tableau **complet et
ordonné** à `onChange`.

### Flux de données

`AlbumEditPage` consomme `usePhonoData()` — `albums`, `setAlbums`, `tracks`,
`setTracks` — comme le fait `TrackEditPage`. Aucun nouveau hook, aucune nouvelle
table.

L'écriture suit le motif optimiste du projet : `setAlbums((prev) => …)`, snapshot
et rollback gérés par le hook.

## La page

### En-tête

Identique à la page titre : bouton « Retour au catalogue » (qui passe par la même
confirmation que « Annuler »), eyebrow `Phono · Catalogue`, puis le titre de
l'album ou « Nouvel album ou EP ».

### Colonne principale

**1. L'essentiel** — carte toujours ouverte, sous-titre « De quoi exister dans le
catalogue. Le reste peut attendre la sortie. »

- Titre \* (obligatoire)
- Artiste \* (obligatoire)
- Type (Album / EP / Single) et Statut, sur une ligne

Sous le statut, l'annonce de propagation (voir plus bas).

**2. Tracklist** — carte toujours ouverte, compteur de titres dans le titre de
section. Contenu détaillé plus bas.

**3. Publication** — section repliable (`TrackSection`), ouverte d'office si l'un
de ses champs est déjà rempli : date de sortie, UPC / EAN, genre, distribution,
label, éditeur.

**4. Crédits & notes** — section repliable, ouverte d'office si elle contient
quelque chose : contributeurs calculés (`AlbumContributors`, recalculés en direct
depuis la tracklist en cours d'édition), invités (`AlbumGuestList`), notes.

### Colonne latérale (`lg:sticky`)

- `TrackCoverField` — la pochette de l'album.
- Encart **« Il manque »** / « Rien ne manque », dans la forme exacte de
  `TrackEditAside` : pastille ambre + libellé formulé comme une chose à faire.
  Les manques d'un album : `Aucun titre dans la tracklist`, `Pas de pochette`,
  `Pas d'UPC / EAN`, `Pas de date de sortie`.
- Boutons **Enregistrer** (désactivé tant que `canSubmit` est faux ou pendant
  l'écriture) et **Annuler les modifications** / « Retour au catalogue » selon
  l'état `dirty`.

### Validation

`canSubmit` = titre non vide **et** artiste non vide **et** date valide — la
règle actuelle de `AlbumDialog`, inchangée. La date passe par `DatePicker` et
`isValidDateFr`, avec le message d'erreur sous le champ.

## Tracklist

### Zone 1 — les titres retenus

Une ligne par titre, réordonnable au drag (dnd-kit, déjà en place) :

```
 1  ⠿  Intro                          ● En production        ✎   ×
      Yoton
```

- numéro d'ordre, poignée de drag ;
- titre et artiste principal ;
- pastille de statut du titre (`RELEASE_STATUS_COLOR`) + libellé ;
- **crayon** → `/phono/catalogue/titre/[trackId]` ;
- **croix** → retire de la tracklist (ne supprime jamais le titre du catalogue).

Une ligne dont le `trackId` ne correspond à aucun titre reste affichée et
retirable — comportement actuel, à conserver : elle porte « Titre introuvable /
Ce titre a été supprimé du catalogue ».

Le crayon navigue hors de la page. Si le formulaire album est `dirty`, il passe
par la même confirmation que « Retour au catalogue » ; sinon il navigue
directement.

Tracklist vide : le bandeau pointillé actuel, « Aucun titre. Ajoute-les depuis le
catalogue ci-dessous. »

### Zone 2 — piocher ou créer

Un champ de recherche, puis les titres du catalogue absents de la tracklist,
triés par titre, plafonnés à 20 avec la mention « et N autres — affine ta
recherche ». Chaque ligne a un `+` qui l'ajoute en fin de tracklist.

**Création inline** — dès que la recherche contient du texte, une ligne
supplémentaire apparaît en tête de liste :

```
+  Créer le titre « Intro »
```

Elle est affichée quelles que soient les correspondances existantes (on peut
vouloir un second titre homonyme), mais devient l'élément principal quand aucun
titre ne correspond.

Au clic, le titre est créé **immédiatement dans le catalogue général** :

| Champ | Valeur |
|---|---|
| `id` | `newTrackId()` |
| `title` | la saisie, `trim()` |
| `mainArtist` | l'artiste de l'album en cours de saisie (vide si non renseigné) |
| `status` | le statut de l'album en cours de saisie |
| `role` | `artiste_principal` |
| `versions` | `[defaultVersion(suggestedVersionLabel(status))]` |
| le reste | valeurs vides de `emptyForm()` |

Puis il est ajouté en fin de tracklist et la recherche est vidée, pour pouvoir en
enchaîner plusieurs.

**Conséquence assumée** : le titre existe dans le catalogue avant que l'album
soit enregistré, et annuler l'album ne le défait pas. C'est déjà le comportement
symétrique côté titre — `handleCreateAlbum` dans `TrackEditPage.tsx:212` crée
l'album dans le catalogue au moment du choix, pas à l'enregistrement.

`defaultVersion()` doit être appelé à chaque création, jamais hissé en constante :
deux titres créés à la suite partageraient sinon la même `versionId`, ce qui
trompe le lecteur (voir le commentaire de `emptyForm` dans `TrackEditPage.tsx`).

## Propagation du statut

Règle inchangée (`AlbumsTab.tsx:73`) : à l'enregistrement, un changement de
statut de l'album fait avancer ses titres, jamais reculer — `isStatusMoreAdvanced`
tranche titre par titre.

Nouveau : la page **l'annonce avant** de le faire. Sous le select de statut, quand
le statut choisi diffère de celui chargé et qu'au moins un titre est concerné :

> En enregistrant, 5 titres passeront en « Publié ».

Le compte est calculé sur les titres de la tracklist en cours d'édition, avec la
même fonction que l'écriture — une seule règle, affichée puis appliquée. Aucun
message si le compte est nul (par exemple tous les titres déjà plus avancés).

## Suivi des modifications

Repris intégralement de `TrackEditPage`, car le dialog actuel n'en a rien :

- `initialForm` capturé au chargement ; `dirty` = comparaison JSON.
- `beforeunload` armé tant que `dirty`.
- « Annuler » et « Retour au catalogue » demandent confirmation si `dirty`
  (« Abandonner les modifications non enregistrées ? »).
- Remplissage du formulaire **en cours de rendu** quand la donnée SWR arrive
  (`loadedId !== readyId`), pas dans un `useEffect` : la première peinture montre
  déjà les bonnes valeurs, et une saisie en cours n'est jamais écrasée.

Pas d'équivalent de `unsavedUploadedPaths` : un album n'attache aucun fichier
audio. Sa pochette suit `TrackCoverField`, comme celle d'un titre.

## États

- `loading` → `<PageLoader />`
- `error` → `<PageError title="Impossible de charger cet album" …>` avec
  `router.refresh()`
- `albumId` fourni mais introuvable → `<PageError title="Cet album n'existe plus"
  description="Il a peut-être été supprimé depuis un autre onglet."
  onRetry={() => router.push("/phono/catalogue")} />`

## Modifications dans `AlbumsTab`

- Le bouton « Album » et l'action de l'`EmptyState` →
  `router.push("/phono/catalogue/album/nouveau")`.
- `onEdit` de `AlbumCard` → `router.push("/phono/catalogue/album/" + album.id)`.
- `submitAlbum` et la propagation de statut migrent dans `AlbumEditPage` ; le tab
  n'écrit plus d'album.
- La suppression **reste ici** : dialog de confirmation déclenché depuis la carte,
  inchangé. C'est la symétrie exacte des titres, où `DeleteTrackDialog` vit dans
  `TracksTab` et non dans la page d'édition.
- `setTracks` n'est plus utilisé par le tab une fois la propagation déplacée : la
  prop disparaît de `AlbumsTab` et de son appel dans `CatalogPage`.

## Un titre dans deux albums

Le modèle l'autorise — rien n'impose l'unicité d'un `trackId` à travers les
albums. La page ne change pas cela : ajouter à l'album B un titre déjà présent
dans l'album A **ne le retire pas de A**, c'est le comportement actuel de
`TracklistComposer` et il est conservé.

Conséquence connue, déjà présente aujourd'hui : `TrackEditPage` cherche l'album
d'un titre avec un `find`, donc le champ « Album ou EP » de la page titre
n'affichera que le premier des deux. Hors périmètre de ce chantier.

## Ce qu'il faut vérifier avant de considérer le travail fini

Aucune suite de tests n'est configurée sur le projet. Vérification manuelle en
dev local, connecté avec le compte de démo (motif `scripts/shots.mjs`), plus
`npx tsc --noEmit` et `npm run lint`.

Parcours à passer :

1. Créer un album, y créer deux titres inline, enregistrer → les deux titres
   apparaissent dans l'onglet Titres, rattachés à l'album.
2. Ouvrir un titre créé inline depuis son crayon, le modifier, revenir → la
   tracklist de l'album montre la modification.
3. Ajouter un titre existant déjà rattaché à un autre album → il rejoint le
   nouvel album et **reste** dans l'ancien (voir « Un titre dans deux albums »).
4. Passer un album de « En production » à « Publié » → l'annonce affiche le bon
   compte, et après enregistrement les titres concernés ont avancé, sans qu'un
   titre déjà « Publié » ne recule.
5. Réordonner la tracklist au drag, enregistrer, rouvrir → l'ordre tient.
6. Quitter avec une saisie en cours → confirmation ; refuser → on reste sur la
   page avec la saisie intacte.
7. Ouvrir un album inexistant à la main dans l'URL → `PageError`.
