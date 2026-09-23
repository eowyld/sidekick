# Live — fiche technique et matériel, une seule source

Date : 21/09/2026 · Module : Live (fiches spectacle / DJ set / tournée, formulaire
événement, module Matériel, setlist)

## Intention

Aujourd'hui le matériel vit à trois endroits qui ne se parlent pas : le panneau
« Listes de matériel » de la fiche, les deux textes libres « Matériel apporté »
et « Matériel à fournir par le lieu » de la fiche technique, et le sélecteur de
listes des dates et des répétitions. Cette spec en fait **un seul bloc**, tout en
haut de la fiche technique : les listes cochées et les ajouts y forment le
« Matériel apporté », le « À fournir par la salle » lui fait face, et le tout est
rangé en quatre catégories (Son, Lumière, Scène et implantation, Autre
matériel), les mêmes que dans le module Matériel.

Trois petits ajouts autour : ajouter un album ou un EP à la setlist, renommer
« Morceau libre / reprise », copier la fiche technique d'un autre spectacle.

## Périmètre

Dans le périmètre :

- la setlist : sélecteur d'album / EP, libellé renommé ;
- le module Matériel : catégorie à la création d'un matériel, inventaire et
  listes ordonnés par catégorie (seule migration SQL) ;
- la fiche technique : nouvelle forme, bloc Matériel, bouton de copie, partout
  où elle apparaît (spectacle, DJ set, tournée, date, répétition) ;
- la checklist « Matériel à emporter » des dates et répétitions, qui lit le
  matériel apporté de la fiche ;
- le PDF de fiche technique, la feuille de route, les étapes calculées, les
  données de démo.

Hors périmètre :

- les singles dans le sélecteur d'album (albums et EP seulement) ;
- un tri ou un filtre supplémentaire dans l'inventaire au-delà de l'ordre par
  catégorie ;
- toute évolution des listes de matériel elles-mêmes (nom, description, éléments).

## Décisions

1. **Les textes libres actuels sont conservés.** L'ancien texte Scène,
   Son et Lumière devient le champ **Détails** de sa catégorie. Les anciens textes
   « apporté » et « à fournir » sont découpés **ligne par ligne** en éléments de
   la catégorie « Autre matériel », dans la colonne correspondante.
2. **Une seule source pour les dates.** Le matériel apporté de la fiche (listes
   cochées + ajouts) est la seule source. La checklist « Matériel à emporter »
   d'une date ou d'une répétition le lit et ne garde que les cases à cocher : le
   second sélecteur de listes disparaît.
3. **Les éléments d'une liste cochée sont liés à la liste** : lecture seule, ils
   suivent ses modifications. On peut **ajouter** d'autres éléments en plus, pas
   en retirer un pour un seul spectacle.
4. **Le matériel à fournir par la salle est en lignes libres** (nom, quantité) :
   il ne vient pas de l'inventaire de l'artiste.

## Modèle de données

Catégories (clé stockée, libellé) : `sound` Son · `light` Lumière · `stage`
Scène et implantation · `other` Autre matériel. C'est l'ordre d'affichage.

```ts
type SheetItem = { id: string; name: string; quantity: number; category: EquipmentCategory; itemId?: string };
type TechnicalSheet = {
  contact: string;
  team: string;
  details: Record<EquipmentCategory, string>; // « Détails » de chaque catégorie
  brought: SheetItem[];  // matériel apporté EN PLUS des listes cochées
  venue: SheetItem[];    // matériel à fournir par la salle
};
```

- `itemId` renvoie à l'inventaire quand l'ajout en vient ; `name`, `quantity` et
  `category` sont des **copies** à l'ajout (un matériel supprimé de l'inventaire
  ne fait pas disparaître la ligne).
- `equipmentListIds` **ne bouge pas** : il reste sur le spectacle
  (`LiveProduction.equipmentListIds`) et sur les événements
  (`LiveDetails.equipmentListIds`). Le bloc édite la fiche et les listes d'un
  seul geste.
- `LiveDetails.equipmentChecked` ne bouge pas non plus. Sa clé est l'identifiant
  du matériel d'inventaire, ou celui de la ligne libre : les cases déjà cochées
  restent valables.
- Inventaire : `EquipmentInventoryItem.category` ; colonne
  `user_equipment_inventory.category text not null default 'other'` avec un
  `check` sur les quatre valeurs.

## Reprise des données existantes

Conversion **à la lecture**, sans reprise en masse : `normalizeTechnical()`
transforme l'ancienne forme (`stage`, `sound`, `lights`, `supplied`, `provided`
en textes) en nouvelle forme ; la nouvelle forme est écrite au prochain
enregistrement de la fiche. Idempotente : une fiche déjà à la nouvelle forme
n'est pas convertie deux fois. Les identifiants des éléments convertis sont
déterministes (`legacy-brought-0`…), pour ne pas changer d'un chargement à
l'autre. Elle s'applique aux spectacles, aux dates et aux répétitions, dans les
mappers de `useLiveData`.

## Interface

**Bloc Matériel** (en tête de la fiche technique) :

- une ligne de **listes** (cases à cocher, lien « Gérer » vers le module
  Matériel) ;
- une ligne par catégorie, en deux colonnes « Apporté » et « À fournir par la
  salle ». À gauche : les éléments des listes cochées (lecture seule, avec le nom
  de la liste) puis les ajouts (nom et quantité modifiables, suppression) ; sous
  eux, un choix « depuis l'inventaire » limité à la catégorie et aux éléments pas
  déjà présents, et une saisie de ligne libre. À droite : les lignes libres et
  leur saisie. Sous les deux colonnes, le champ **Détails** de la catégorie.

Sous le bloc : Contact technique, Équipe sur scène (inchangés).

**Bouton « Copier une fiche technique »** dans l'en-tête du panneau : une fenêtre
liste les autres spectacles et DJ sets (pas les tournées, pas le live en cours),
avec un résumé. Le choix remplace contact, équipe, détails, matériel et listes par
une copie ; une confirmation s'affiche si la fiche n'est pas vide.

**Dates et répétitions** : même éditeur dans l'onglet « Fiche technique ». La
checklist « Matériel à emporter » remplace le sélecteur de listes, dans l'onglet
Logistique d'une date et dans l'onglet principal d'une répétition ; elle renvoie
vers l'onglet Fiche technique quand il n'y a rien à cocher.

**Setlist** : sous le choix d'un morceau, un choix « Ajouter un album / EP » et
son bouton. Il ajoute les titres dans l'ordre de l'album, en ignorant ceux déjà
présents (`trackId`), et un message dit combien ont été ajoutés ou ignorés. Le
libellé « Morceau libre / reprise » devient « Morceau libre / nouveau titre ».

**Module Matériel** : la fenêtre de création d'un matériel gagne une catégorie
(défaut « Autre matériel »). L'inventaire est regroupé par catégorie dans l'ordre
Son, Lumière, Scène et implantation, Autre matériel, puis trié par nom, avec une
ligne d'en-tête par catégorie. Les chips d'une liste et les cases de la fenêtre
de liste suivent le même ordre.

## Étapes calculées

- **Matériel préparé** : faite dès qu'une liste est cochée ou qu'un ajout existe.
  Ce qui bloque : « Aucun matériel apporté renseigné ».
- **Fiche technique prête** : faite quand le contact est renseigné **et** qu'il y
  a au moins un matériel (liste, ajout ou ligne salle) ou un détail. Avant : le
  contact et « Son et retours » renseignés. Simplifiée pour ne pas dépendre de
  l'inventaire dans le calcul.

## PDF et feuille de route

`technicalSections(fiche, lignes)` : Contact, Équipe, puis pour chaque catégorie
non vide un bloc « Apporté », un bloc « À fournir par la salle » et les
« Détails ». Les listes sont développées. La feuille de route d'une date reprend
la même liste de matériel apporté, avec l'état de la case à cocher.

## Déploiement

- Migration `20260921220000_live_equipment_category.sql` (colonne `category`),
  à appliquer **avant** le déploiement du front : le hook envoie `category` à
  chaque enregistrement d'un matériel.
- Attention : `db push` applique **toutes** les migrations en attente. D'autres
  migrations du 21/09 (`user_mail_connections`, `rate_limits`) ne sont pas de ce
  chantier ; ne pas les pousser sans accord explicite.
- Pas d'autre changement de schéma.

## Vérification

Pas de suite de tests : `npx tsc --noEmit`, `npm run lint`, les règles de
`scripts/check-live-progress.ts` (mises à jour), puis en dev sur le compte de
captures avec des lignes de test préfixées et supprimées ensuite : conversion
d'une ancienne fiche, cases d'une liste, ajouts, copie d'une fiche, checklist
d'une date, tri de l'inventaire, ajout d'un album.
