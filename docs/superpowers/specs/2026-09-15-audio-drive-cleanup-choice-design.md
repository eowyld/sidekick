# Choix de conservation des fichiers audio dans le Drive — Design

Date : 2026-09-15

## Problème

Un fichier audio uploadé depuis le catalogue Phono (piste, version, mix) vit dans le bucket
`drive`, sous `<userId>/phono/audio/`. Il est visible dans le module Drive (Drive → Phono →
audio) parce que cette vue liste le contenu du bucket en direct, pas seulement la table
`user_documents`.

Ce dossier est renommé `catalogue` dans ce chantier (Drive → Phono → Catalogue), et devient
verrouillé comme le dossier `Phono` lui-même. Les fichiers qu'il contient, tant qu'ils sont
reliés à un titre ou un mix du catalogue, sont eux aussi individuellement verrouillés — non
renommables, non déplaçables, non supprimables depuis l'UI Drive. Seul le flux de suppression
côté Phono (avec la case à cocher décrite plus bas) doit pouvoir en disposer.

Un nettoyeur automatique existe déjà (`src/modules/phono/lib/audio-gc.ts`,
`pruneOrphanAudio`) : il tourne à l'arrivée sur le catalogue et à chaque suppression, et
supprime silencieusement (après un sursis d'1h) tout fichier de `phono/audio/` qui n'est plus
référencé par aucune version, aucun mix, aucun lien d'écoute publié.

Ce nettoyage est invisible et non négociable pour l'utilisateur. Le besoin exprimé : pouvoir
décider soi-même, au moment de la suppression, si le fichier doit être supprimé ou conservé
dans le Drive — plutôt que de subir un nettoyage automatique silencieux.

## Périmètre

Quatre actions du module Phono détachent un fichier audio de sa référence catalogue et
doivent proposer le choix :

1. Suppression d'une piste entière (`DeleteTrackDialog.tsx`) — toutes les versions de la
   piste.
2. Suppression d'une version (`VersionList.tsx` / `VersionRow.tsx`).
3. Détachement d'une version (audio retiré sans supprimer la version elle-même).
4. Remplacement du fichier audio d'une version (l'ancien fichier devient orphelin).
5. Suppression d'un mix (dialogue inline dans `MixesTab.tsx`).

Hors périmètre : les fichiers dont `audioSource === "drive"` (rattachés depuis un vrai
document du Drive de l'utilisateur) — ce sont ses documents, pas des pièces jointes du
catalogue, et ils ne sont déjà pas concernés par `pruneOrphanAudio`. Aucune case à cocher ne
doit leur être proposée : ils ne sont jamais supprimés ni déplacés par cette fonctionnalité.

## UI

Chacun des dialogues de confirmation listés ci-dessus gagne une case à cocher :

> ☐ Supprimer aussi le fichier du Drive

Décochée par défaut (comportement non destructif par défaut). N'apparaît que si l'élément
concerné a effectivement un fichier audio avec `audioSource === "upload"`.

## Comportement à la confirmation

- **Case cochée** → suppression immédiate de l'objet dans le bucket via le helper existant
  `deleteStorageFile()` (`src/lib/drive-db.ts:812`), qui gère aussi la décrémentation du
  quota de stockage (`subtractStorageUsed`).
- **Case décochée** → le fichier est **déplacé** (`supabase.storage.from(DRIVE_BUCKET).move()`)
  de `<userId>/phono/catalogue/<fichier>` vers `<userId>/phono/depuis-catalogue/<fichier>`.

Le déplacement est le mécanisme clé : sans lui, décocher la case ne suffirait pas à garantir
la conservation du fichier, puisque `pruneOrphanAudio` le supprimerait quand même après 1h
en le trouvant non référencé. En le sortant du dossier `phono/catalogue/` scanné par le GC, le
choix de l'utilisateur devient permanent. Le fichier reste consultable dans Drive → Phono →
depuis-catalogue, la vue Drive listant ce dossier comme n'importe quel autre — et n'est plus
verrouillé, puisqu'il n'est plus référencé par le catalogue (voir section Verrouillage).

En cas de collision de nom dans le dossier de destination, suffixer avec un timestamp/uuid
court avant l'extension.

## Renommage et verrouillage du dossier

`AUDIO_PREFIX` dans `audio-gc.ts` (actuellement `"phono/audio"`) et le chemin d'upload dans
`AudioAttachField.tsx` (`uploadDriveFileToPath(..., "phono/audio", ...)`) passent tous les
deux à `"phono/catalogue"`. Migration : les fichiers déjà présents sous `phono/audio/` pour
les comptes existants doivent être déplacés vers `phono/catalogue/` (script ponctuel, ou
tolérance temporaire des deux préfixes dans `pruneOrphanAudio` et la vue Drive le temps de la
bascule — à trancher au moment du plan).

`"Phono/catalogue"` est ajouté à `DEFAULT_LOCKED_TEMPLATE_PATHS`
(`src/modules/admin/components/DocumentsPage.tsx:39-49`), sur le même modèle que l'entrée
imbriquée déjà présente `"Marketing/Publications"`. Verrouillé au sens où le dossier l'est
déjà pour `Phono` : pas de renommage, déplacement ou suppression depuis le menu contextuel
Drive (`DocumentsPage.tsx:1250-1284`).

## Verrouillage des fichiers référencés

Aujourd'hui, le verrouillage n'existe qu'au niveau dossier — chaque ligne de fichier brut
(`storage-file:${path}`) a `isLocked` codé en dur à `false`
(`DocumentsPage.tsx:476` et `:495`), jamais lu ensuite. Le menu contextuel d'un fichier
(`:1288-1317`) n'a donc aujourd'hui aucune condition de verrouillage.

Nouveau comportement : un fichier sous `phono/catalogue/` est verrouillé tant qu'il est
référencé par une version de titre ou par un mix (même ensemble de référence que
`pruneOrphanAudio` pour les titres et mix, à l'exclusion des liens d'écoute qui ne
concernent que la survie du fichier, pas son verrouillage).

Pour éviter de dupliquer la logique de calcul des chemins référencés (déjà écrite dans
`pruneOrphanAudio`), on en extrait un helper partagé, par exemple
`getReferencedAudioPaths(supabase): Promise<Set<string>>` dans `audio-gc.ts`, réutilisé par
le GC et par `DocumentsPage`. `DocumentsPage` charge cet ensemble (requête légère, indépendante
de `usePhonoData` pour ne pas importer tout le hook Phono dans le module Drive) et l'utilise
pour calculer `isLocked` des lignes `storage-file:` dont le chemin commence par
`<userId>/phono/catalogue/`. Le rendu du menu contextuel fichier (`:1288-1317`) est étendu
avec la même branche "verrouillé" que celle des dossiers, au lieu d'afficher
Renommer/Déplacer/Supprimer.

Comme pour le verrouillage de dossier existant, l'application reste côté client uniquement
pour cette première version (aucune des fonctions `deleteStorageFile`/`renameStorageFile`/
`moveStorageFile` de `drive-db.ts` ne fait aujourd'hui de vérification de verrouillage,
dossier ou fichier) — cohérent avec le niveau de protection déjà en place, pas une régression.

Hypothèse retenue : "relié à un titre du catalogue" couvre aussi les mixes, pas seulement les
titres au sens strict — les deux vivent dans le même dossier verrouillé et il serait
incohérent qu'un fichier de mix reste déplaçable/supprimable depuis Drive alors qu'un fichier
de piste ne l'est pas. À confirmer si ce n'est pas l'intention.

## Flux de données

Les composants concernés ont déjà les `audioPath` en state au moment de la suppression (pas
de requête supplémentaire nécessaire). L'appel de nettoyage/déplacement a lieu **après** la
réussite de la suppression/mise à jour en base — jamais en parallèle — pour ne jamais toucher
au stockage si l'écriture en base échoue.

Nouveau module partagé : `src/modules/phono/lib/audio-cleanup.ts`, exposant une fonction du
type :

```ts
async function handleDetachedAudio(
  paths: string[],
  keepInDrive: boolean
): Promise<void>
```

Appelée depuis `TracksTab.tsx` (suppression piste), `VersionList.tsx` (suppression/
détachement/remplacement de version), `MixesTab.tsx` (suppression mix), avec le ou les
`audioPath` concernés et l'état de la case à cocher.

## Gestion des erreurs

Un échec du déplacement ou de la suppression de stockage ne bloque jamais l'opération
principale (suppression/remplacement déjà actée en base) — l'erreur est loguée
(`console.error`), sans toast bloquant. Si le déplacement échoue (case décochée), le fichier
reste dans `phono/audio/` non référencé : `pruneOrphanAudio` le rattrapera après son sursis
d'1h — repli raisonnable plutôt qu'un blocage de l'UI.

## Test

Vérification manuelle en dev via Playwright avec le compte démo (`scripts/shots.mjs`) :

- Supprimer une piste/version/mix avec la case cochée → le fichier disparaît du bucket
  (vérifiable dans Drive → Phono → Catalogue, ou par requête storage directe).
- Supprimer avec la case décochée → le fichier apparaît sous Drive → Phono →
  depuis-catalogue, n'est plus verrouillé, et survit à un passage de `pruneOrphanAudio`
  (recharger le catalogue plusieurs fois, y compris après le sursis d'1h si testable).
- Vérifier qu'aucune case n'apparaît pour un fichier `audioSource === "drive"`, et qu'un tel
  fichier n'est jamais déplacé ni supprimé par ce flux.
- Dans Drive, vérifier que le dossier "Phono/Catalogue" est verrouillé (menu contextuel sans
  Renommer/Déplacer/Supprimer), et qu'un fichier à l'intérieur, tant qu'il est référencé par
  une piste ou un mix, l'est également. Après suppression/détachement (case cochée ou
  décochée), le fichier disparu ou déplacé ne doit plus jamais apparaître verrouillé sous son
  nouvel emplacement (ou plus du tout, s'il a été supprimé).
