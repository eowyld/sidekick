# Refonte du Catalogue Phono — design

> Spec A du chantier Phono. La refonte de **Sessions Studio** fait l'objet
> d'une spec B distincte, à brainstormer après celle-ci. La page **Liens
> d'écoute** est hors périmètre : elle est en cours de développement et n'est
> pas touchée.

## Problème

`src/modules/phono/components/CatalogPage.tsx` fait 4540 lignes dans un seul
fichier. À titre de comparaison, les pages considérées comme abouties du
produit sont découpées : Tasks tient en 466 lignes réparties sur 8 composants,
Dashboard sur 5.

Le défaut n'est pas seulement cosmétique. Aujourd'hui, **le formulaire est la
vue** : déplier un titre affiche une vingtaine de champs de saisie, exactement
le même formulaire que le dialog de création, dupliqué. Il n'existe donc aucune
représentation lisible du catalogue — soit une ligne repliée quasi muette, soit
un mur d'inputs. Environ la moitié du fichier est cette duplication
création/édition.

## Usage visé

Le catalogue sert trois usages, tous validés avec l'utilisateur :

1. **Registre discographique** — la référence propre de ce qui existe.
2. **Source pour l'admin et les droits** — déclarations SACEM/SPEDIDAM,
   royalties, export de métadonnées vers le distributeur.
3. **Base des liens d'écoute** — les fichiers audio et les versions alimentent
   les liens privés envoyés aux labels, éditeurs et superviseurs sync.

Il n'est **pas** une vitrine : rien n'y est conçu pour être montré tel quel.
La densité d'information prime donc sur la mise en scène.

## Principe directeur

> **Lire ≠ éditer.** La liste affiche de l'information dense et scannable, pas
> des inputs. L'édition passe par une modale, avec un formulaire écrit une
> seule fois et partagé entre création et édition.

C'est le modèle déjà en place dans Tasks (`TaskCard` + `TaskModal`).

## Modèle de données : titre-centré

Le **titre** est l'unité de base ; les albums le référencent.

Justification métier : l'ISRC est attribué par enregistrement, l'UPC par
release. Un même titre sort plusieurs fois dans sa vie (single, album, deluxe,
compilation) — en modèle album-centré, il faudrait le dupliquer. Les versions
(original, instrumental, radio edit, live) n'ont de sens que rattachées à un
titre, et ce sont elles qui portent l'audio et alimentent les liens d'écoute.

Le schéma actuel penche déjà dans ce sens (`Album.trackIds: string[]`,
`Track.versions: TrackVersion[]`) : la refonte l'assume au lieu de le
contredire.

- **Titres** — la liste principale, avec pipeline par statut, ISRC, versions et
  audio.
- **Albums** — une vue de composition : on construit une release en piochant
  des titres existants, on ordonne la tracklist, on pose UPC, date et crédits.
- **Mixes** — les longs formats non phonographiques (voir ci-dessous).

## Renommage : Podcasts → Mixes

L'onglet « Podcasts » désigne en réalité des longs formats de DJ : DJ sets,
live sets, mixes. Le modèle le montre déjà — `Podcast` porte `isLive`,
`isVideo` et une `tracklist: { artist, label, time }[]`, c'est-à-dire
précisément le format de déclaration qu'exigent Mixcloud, Resident Advisor et
la SACEM pour un mix.

Ces objets obéissent à des règles opposées à celles d'un titre : pas d'ISRC,
pas de version, pas de distributeur, mais une tracklist déclarative qui
détermine la répartition des droits vers les ayants droit des titres joués.

**Changements :**

- Onglet et vocabulaire : **« Mixes »**.
- Nouveau champ `format: "dj_set" | "live_set" | "mix" | "podcast"` remplaçant
  le booléen `isLive`, qui modélise mal (un live set filmé cochait `isLive` et
  `isVideo` sans que le type soit dit).
- `isVideo` conservé comme flag orthogonal « captation vidéo ».
- La **tracklist devient la fonctionnalité centrale** de l'onglet, pas un
  détail : saisie en masse par collage, et export copiable.

## Périmètre de la fonctionnalité audio

Un fichier audio par version de titre. La plomberie existe déjà, posée pour les
liens d'écoute : `TrackVersion` porte `audioPath`, `audioSource`, `audioName`,
`durationMs`, `sizeBytes`, `peaks` ; `VersionAudioField` gère l'upload vers le
bucket privé `drive` sous `phono/audio` ; `computeAudioPeaks` calcule la
waveform côté client. Ce qui manque est le produit autour.

**Capacités attendues :**

1. **Écouter dans le catalogue** — barre de lecture persistante en bas de page.
2. **Gérer** — remplacer le fichier, le détacher, renommer le label de version,
   consulter durée / taille / format.
3. **Rattacher depuis le Drive** — au lieu de ré-uploader
   (`audioSource: "drive"`, déjà prévu par le type mais non branché).
4. **Vue d'ensemble du stockage** — tous les fichiers du catalogue, espace
   utilisé, titres sans audio, fichiers orphelins.

Formats acceptés : WAV et MP3, gros fichiers compris (masters lossless).

## Architecture cible

```
src/modules/phono/
  lib/                          ← métier pur, zéro JSX
    track.ts                    normalisation, rôles, invités
    release-status.ts           libellés, couleurs, propagation album → titres
    album.ts                    contributeurs calculés, ordre de tracklist
    metadata-payload.ts         construction du payload ffmpeg
  components/
    CatalogPage.tsx             ~150 l. — onglets, recherche, orchestration
    CatalogHeader.tsx           bandeau « état du catalogue »
    tracks/
      TracksTab.tsx             liste + filtres
      TrackRow.tsx              ligne lisible, sans inputs
      TrackDialog.tsx           formulaire unique création + édition
      VersionList.tsx           versions et audio d'un titre
    albums/
      AlbumsTab.tsx · AlbumCard.tsx · AlbumDialog.tsx · TracklistComposer.tsx
    mixes/
      MixesTab.tsx · MixRow.tsx · MixDialog.tsx · TracklistEditor.tsx
    audio/
      PhonoPlayerProvider.tsx · AudioPlayerBar.tsx
      VersionAudioField.tsx (existant, déplacé) · DrivePickerDialog.tsx
      StorageSummary.tsx
    metadata/
      MetadataExportDialog.tsx
```

Chaque unité a une responsabilité unique et une interface explicite : les
modules `lib/` sont des fonctions pures sans dépendance React, les composants de
liste ne connaissent que leur donnée et leurs callbacks, le lecteur audio est
isolé derrière un contexte.

## Interface

### Bandeau « état du catalogue »

Placé au-dessus des onglets, il reprend le vocabulaire visuel de
`LiveOverviewPage` : conteneur
`rounded-xl border border-[rgba(245,245,245,0.08)] bg-[rgba(44,44,46,0.5)] p-5`,
barre segmentée, gros chiffre en `font-extralight tabular-nums`, légende
cliquable.

```
┌──────────────────────────────────────────────────────────────────┐
│  Catalogue                                              24       │
│  Répartition de tes titres par statut         titres · 6 releases│
│                                                                  │
│  ████████████░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓            │
│  ● 8 En production   ● 3 Mixé   ● 2 Mastérisé   ● 11 Publié      │
│                                                                  │
│  ⚠ 5 sans ISRC    ⚠ 9 sans audio       🎵 2,4 Go · 31 fichiers ▾│
└──────────────────────────────────────────────────────────────────┘
```

Les segments de statut et les chips ⚠ sont des **filtres cliquables** : cliquer
« 5 sans ISRC » filtre la liste des titres. C'est ce qui distingue un bandeau
décoratif d'un outil de qualité de données — directement utile à l'usage droits.
La ligne stockage déplie `StorageSummary`.

Les quatre statuts existants sont conservés :
`en_production → mixe → masterise → publie`.

### Onglet Titres

```
┌──────────────────────────────────────────────────────────────────┐
│ [Rechercher…]   Statut ▾  Audio ▾  ISRC ▾        Tri ▾  + Titre │
├──────────────────────────────────────────────────────────────────┤
│ ▸ ▣  Nom du titre                       ● Publié                 │
│      Artiste principal · feat. X        FR-XXX-25-00001          │
│      12 mars 2025            ▶ 3 versions · 2 audio          ⋯   │
├──────────────────────────────────────────────────────────────────┤
│ ▾ ▣  Autre titre                        ● Mastérisé              │
│      Artiste principal                  ⚠ ISRC manquant          │
│      —                       ▶ 2 versions · 2 audio          ⋯   │
│   ┌───────────────────────────────────────────────────────────┐  │
│   │ ▶  Original      ▁▃▅▇▅▃▁▂▄▆▄▂▁▃▅▇▅  3:42 · WAV 38 Mo  ⋯ │  │
│   │ ▶  Instrumental  ▁▃▅▇▅▃▁▂▄▆▄▂▁▃▅▇▅  3:42 · WAV 38 Mo  ⋯ │  │
│   │ + Ajouter une version                                     │  │
│   └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

Le dépliement ne révèle **que les versions** — de la lecture. Tous les autres
champs (crédits, éditeur, distributeur, genre, notes, cover) vivent dans
`TrackDialog`. Le menu `⋯` de ligne : Éditer · Exporter métadonnées ·
Dupliquer · Supprimer. Le menu `⋯` de version : Remplacer le fichier ·
Rattacher depuis le Drive · Renommer · Exporter métadonnées · Détacher l'audio ·
Supprimer la version.

### Onglet Albums

Grille de cartes release : cover, titre, type (Album / EP / Single), chip de
statut, date, nombre de titres, UPC ou avertissement s'il manque.

L'ouverture donne un dialog en deux colonnes :

```
┌── Métadonnées release ──────┬── Tracklist ────────────────────┐
│ Titre · Type · Artiste      │ [Rechercher un titre…]          │
│ Date · UPC/EAN              │ ─────────────────────────────── │
│ Label · Éditeur · Distrib   │ ⠿ 1. Titre A                ×   │
│ Genre · Cover · Notes       │ ⠿ 2. Titre B                ×   │
│                             │ ⠿ 3. Titre C                ×   │
│ Contributeurs (calculés)    │                                 │
│  · auto depuis les titres   │ Résultats du catalogue dessous  │
└─────────────────────────────┴─────────────────────────────────┘
```

Réordonnancement par **drag & drop** avec `@dnd-kit`, déjà utilisé dans Tasks —
aucune dépendance nouvelle. Les contributeurs restent **calculés** depuis les
titres (logique `computeAlbumContributors` conservée, déplacée dans
`lib/album.ts`) : un album ne réinvente pas ses crédits.

La propagation de statut album → titres, aujourd'hui enfouie dans
`updateAlbum`, est extraite dans `lib/release-status.ts` et conservée à
l'identique.

### Onglet Mixes

```
┌──────────────────────────────────────────────────────────────────┐
│ ▣  Nom du set          [DJ set] 📹    28 juin 2025               │
│    Artiste                            18 titres · 1 h 04    ⋯   │
└──────────────────────────────────────────────────────────────────┘
```

`TracklistEditor` est le cœur de l'onglet :

- **Collage en masse** — coller un tracklisting brut, un parser tolérant
  découpe les lignes au format `00:00 Artiste – Titre [Label]` et remplit le
  tableau, chaque ligne restant éditable ensuite. La saisie ligne par ligne
  actuelle est décourageante pour vingt titres.
- **Export copiable** — pour Mixcloud, Resident Advisor et la déclaration
  SACEM.
- Lignes réordonnables au drag & drop, timecodes en `tabular-nums`.

## Lecteur audio

Un `PhonoPlayerProvider` monté au niveau de `CatalogPage` expose la piste
courante et les commandes. `AudioPlayerBar` est fixée en bas de page : cover,
titre · label de version, waveform cliquable, temps écoulé et durée, volume.

Lancer une version puis continuer à filtrer ou naviguer dans les onglets ne
coupe pas le son. La waveform est dessinée à partir des `peaks` déjà stockés —
aucun téléchargement de fichier n'est nécessaire pour l'afficher.

Le bucket `drive` est privé (policies RLS par `auth.uid()` sur le premier
segment du chemin). La lecture passe donc par une **URL signée** obtenue à la
demande et renouvelée à expiration, comme le fait déjà
`app/api/listening/[slug]/audio/[itemId]/route.ts`.

## Export de métadonnées

Un `MetadataExportDialog` unique remplace les deux flux actuels (titre seul,
album en zip), aujourd'hui dupliqués dans `processMetadata` et
`processAlbumMetadata`.

- **Portée** : cette version · toutes les versions du titre · album entier
  (zip numéroté).
- **Source** : fichier hébergé lorsqu'il existe, ou dépôt ponctuel — le choix
  est offert à chaque export.
- **Aperçu des tags** avant écriture. La cascade de valeurs par défaut
  (label ← album, sinon titre si non auto-produit, sinon artiste ; éditeur ←
  album, sinon titre, sinon artiste) est aujourd'hui invisible et donc
  invérifiable.
- **Résolution côté serveur** : quand la source est hébergée, on transmet
  l'`audioPath` à `/api/phono/apply-metadata`, qui va chercher le fichier dans
  Storage. Faire transiter un album de douze WAV par le navigateur — descente
  puis remontée, environ 500 Mo — n'aurait aucune justification.

La construction du payload est extraite telle quelle dans
`lib/metadata-payload.ts` et partagée par les trois portées.

## Changements de modèle

### `TrackVersion.isrc` — nouveau, optionnel

L'ISRC identifie un **enregistrement**, pas une œuvre : le radio edit,
l'instrumental et le live d'un même titre ont chacun le leur. C'est ce que
vérifie un distributeur, et une confusion à ce niveau fausse une déclaration
SPEDIDAM.

Ajout additif et non cassant : `isrc?: string` sur `TrackVersion`.
`Track.isrc` demeure l'ISRC de la version principale et sert de valeur héritée
— une version sans ISRC propre affiche celui du titre, en grisé. Rien n'oblige
à remplir davantage qu'aujourd'hui, mais le modèle cesse de mentir.

### `guestArtists` — chaînes vers objets

`Track.guestArtists` est un `string[]` où chaque entrée concatène
`"Nom – Rôle"`, re-découpé sur `" – "` dans cinq endroits, dont le constructeur
du payload de métadonnées. Un nom d'artiste contenant un tiret casse
silencieusement les crédits écrits dans le fichier — sur des données qui
alimentent des déclarations de droits.

Passage à `{ name: string; role: string }[]`. La colonne `guest_artists` est un
`jsonb` : elle accepte les deux formes sans migration SQL. `rowToTrack`
normalise à la lecture (une entrée `string` est découpée, une entrée objet est
prise telle quelle), l'écriture se fait toujours au nouveau format. Les données
existantes se convertissent au fil des enregistrements.

### Table `user_phono_podcasts` → `user_phono_mixes`

`ALTER TABLE … RENAME TO` conserve policies, index et contraintes. La migration
ajoute la colonne `format text not null default 'dj_set'` et backfille depuis
`is_live` : `true → 'live_set'`, `false → 'dj_set'`, reclassable ensuite à la
main. La colonne `is_live` est supprimée, `is_video` conservée. Le type
TypeScript `Podcast` devient `Mix` et le champ correspondant dans
`usePhonoData`.

### Limites de stockage — pilotées par variables d'environnement

`src/lib/drive-db.ts` fixe aujourd'hui `MAX_FILE_SIZE_BYTES = 50 Mo` et
`STORAGE_LIMIT_BYTES = 1 Go`, valeurs calquées sur le plan Supabase Free. Elles
sont incompatibles avec l'hébergement de masters : un WAV 44,1 kHz / 24 bits de
quatre minutes pèse environ 64 Mo, et un catalogue de 24 titres × 3 versions
approche 3,6 Go.

Le passage à Supabase Pro est planifié à la sortie de l'alpha et inscrit dans
`ALPHA.md`, section « Recette de déploiement ». Pour que ce basculement ne
demande aucun redéploiement :

- Un plafond **audio distinct** du plafond Drive générique — un master n'a pas
  les mêmes besoins qu'un PDF.
- `NEXT_PUBLIC_MAX_AUDIO_MB` (défaut 50) et `NEXT_PUBLIC_STORAGE_QUOTA_GB`
  (défaut 1), documentées dans `.env.example`.
- L'interface est écrite pour le cas gros fichier dès maintenant : barre de
  progression d'upload, quota affiché, et message d'erreur explicite —
  « Fichier trop volumineux : 64 Mo, limite actuelle 50 Mo » — plutôt qu'un
  échec muet.

### Correction : `getPublicUrl` sur un bucket privé

`uploadDriveFileToPath` retourne un `getPublicUrl(path)` inopérant sur le
bucket privé `drive` : l'URL ne répond pas. Elle est remplacée par une URL
signée obtenue à la demande.

## Gestion des erreurs

Le module suit les conventions déjà en place : `PageLoader` pendant le
chargement, `PageError` avec `onRetry={() => mutate("user_phono")}` en cas
d'échec, `EmptyState` par onglet, `NoResult` quand un filtre ne renvoie rien.

Les écritures conservent le pattern optimiste de `usePhonoData` — snapshot
synchrone, opération Supabase en IIFE, rollback en cas d'erreur.

Cas propres à l'audio :

- **Fichier illisible par le navigateur** — `computeAudioPeaks` échoue avant
  l'upload, aucun quota n'est consommé. Comportement actuel, conservé.
- **Dépassement de taille ou de quota** — message chiffré indiquant la taille
  du fichier et la limite en vigueur.
- **URL signée expirée en cours de lecture** — renouvellement transparent.
- **Détachement d'un audio** — seule la référence est retirée ; le fichier reste
  dans le Drive. Supprimer le fichier casserait les liens d'écoute qui l'ont
  déjà dénormalisé. Comportement actuel, conservé et documenté dans l'UI.
- **Fichiers orphelins** — `StorageSummary` liste les fichiers de
  `phono/audio` qu'aucune version ne référence plus, avec suppression
  explicite.

## Vérification

Le dépôt n'a pas de suite de tests. La vérification est manuelle en dev local,
conformément à `CLAUDE.md`, et l'ordre d'implémentation est conçu pour la
rendre possible à chaque étape.

À chaque étape : `npm run build`, `npx tsc --noEmit`, `npm run lint`, puis
parcours manuel de l'onglet livré.

Points à vérifier à l'œil, parce qu'ils encodent du métier difficile à relire :

- Propagation de statut album → titres, à l'identique d'avant.
- Contributeurs d'album recalculés correctement après ajout ou retrait d'un
  titre.
- Cascade label / éditeur dans les tags écrits, sur un titre auto-produit et
  sur un titre sous label.
- Un titre dont les `guestArtists` sont encore au format chaîne s'affiche et se
  ré-enregistre sans perte.
- Numérotation `01 - Titre` et nom de dossier dans le zip d'album.

## Ordre d'implémentation

Approche verticale : chaque étape est livrée finie et vérifiable en dev local
avant de passer à la suivante. L'ancien `CatalogPage` rétrécit progressivement
au lieu de disparaître d'un bloc, ce qui évite le tunnel où plus rien ne
fonctionne — décisif en l'absence de tests.

Deux styles coexistent dans la page pendant le chantier ; c'est le coût assumé
de cette approche, et il est temporaire.

1. **Étape 0 — socle.** Extraction du métier vers `lib/` sans changement
   visible. Migration `guestArtists`. Correction de `getPublicUrl`. Constantes
   de stockage pilotées par l'environnement.
2. **Titres.** `TracksTab`, `TrackRow`, `TrackDialog`, `VersionList`,
   `CatalogHeader`. Puis l'audio dans la foulée, sur ces mêmes fichiers :
   `PhonoPlayerProvider`, `AudioPlayerBar`, `DrivePickerDialog`,
   `StorageSummary`, et les actions de gestion du menu de version.
3. **Albums.** `AlbumsTab`, `AlbumCard`, `AlbumDialog`, `TracklistComposer`.
4. **Mixes.** Migration SQL, renommage du type, `MixesTab`, `MixRow`,
   `MixDialog`, `TracklistEditor` avec import par collage.
5. **Export de métadonnées.** `MetadataExportDialog` et résolution côté serveur
   de l'`audioPath`. Suppression des deux flux dupliqués.
6. **Nettoyage.** Suppression du reliquat de `CatalogPage`, vérification que
   plus aucun import ne pointe vers l'ancienne structure.

## Hors périmètre

- **Sessions Studio** — spec B, à brainstormer ensuite.
- **Liens d'écoute** — en cours de développement, non touchés. La refonte ne
  modifie aucun champ dont ils dépendent (`audioPath`, `peaks`, `durationMs`
  restent inchangés).
- **Page de vue d'ensemble Phono dédiée.** Écartée : après la refonte, Phono se
  résume au Catalogue et à Sessions Studio. Un overview qui ne renverrait qu'à
  l'unique page Catalogue serait de la cérémonie. Les signaux qu'il aurait
  portés vivent dans le bandeau « état du catalogue ».
- **Transcodage automatique** en preview compressée. Envisagé pour réduire le
  stockage, écarté pour l'instant : le passage à Supabase Pro règle le problème
  sans construire ni maintenir un pipeline ffmpeg supplémentaire. À
  reconsidérer si le stockage devient contraignant en bêta multi-utilisateurs.
