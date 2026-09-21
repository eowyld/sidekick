# Identité de l'artiste : nom d'artiste ou nom propre

*Design validé le 21/09/2026. Ouverture de l'alpha le jeudi 24/09.*

## Problème

Le produit ne connaît pas le nom sous lequel l'utilisateur sort sa musique.

- L'inscription collecte prénom et nom civils (`user_metadata.full_name`), rien d'autre.
- Le seul champ « nom d'artiste » est `user_presskit_profile.artist_title`, dans
  Marketing, **fermé pour l'alpha**. La route publique du lien d'écoute
  (`app/api/listening/[slug]/route.ts`) retombe donc sur le littéral
  `"Artiste"` : c'est ce que voient les destinataires de tous les liens en alpha.
- Titres, albums, mixes et œuvres demandent l'artiste à la main, à chaque
  création (obligatoire pour les titres).

## Règle de fond

Deux catégories de champs, deux comportements :

| Catégorie | Exemples | Comportement |
|---|---|---|
| **Identité** : c'est l'utilisateur | en-tête du lien d'écoute, contexte des prompts IA | lu **en direct** depuis le profil ; un renommage se propage partout |
| **Enregistrement** : l'artiste de cette sortie | `mainArtist` (titre), `artist` (album), `artists` (mix) | **pré-rempli** avec `artist_name` à la création, modifiable, **copié** dans l'enregistrement ; un renommage ne réécrit jamais l'existant |
| **Œuvre** (Édition) : déclarée sous l'identité civile | `artistName` (œuvre) | même mécanique, mais pré-rempli avec le **nom civil**, quel que soit le mode |

Un enregistrement peut légitimement porter un autre nom (production pour un
tiers, alias, sortie publiée sous un ancien nom) : c'est pour ça qu'il est
copié, pas référencé.

## 1. Données

Migration `supabase/migrations/20260921000000_artist_identity.sql`, rejouable
(`add column if not exists`) :

```sql
alter table public.user_preferences
  add column if not exists identity_mode text
    check (identity_mode in ('artist', 'legal')),
  add column if not exists artist_name text;
```

- `identity_mode` : `null` = question jamais posée ; `'artist'` = nom d'artiste ;
  `'legal'` = travaille en nom propre.
- `artist_name` : **le nom affiché, toujours renseigné** dès que `identity_mode`
  n'est pas `null`. En mode `'legal'`, il contient « Prénom Nom ».

Pourquoi stocker le nom résolu même en nom propre : la route publique lit
`user_preferences` avec la clé service ; le nom civil vit dans
`auth.users.user_metadata`, que cette route ne peut lire que par un appel admin
à chaque ouverture de lien. Pour éviter la divergence, l'enregistrement du
prénom/nom dans Réglages resynchronise `artist_name` quand le mode est `'legal'`.

### Hook `usePreferencesData`

- `PreferencesRow` gagne `identity_mode` et `artist_name`.
- Nouveau palier en tête de `SELECTS` (repli progressif existant, code `42703`).
- `persist()` : `nextRow` reporte les deux nouvelles colonnes.
- Exposé : `identityMode: "artist" | "legal" | null`, `artistName: string`
  (chaîne vide si non renseigné), `setArtistIdentity(mode, name)` (nom `trim()`,
  refus d'une chaîne vide).

### Helper unique

`src/lib/artist-identity.ts` :

- `defaultArtist(artistName: string): string` : valeur de pré-remplissage d'un
  champ artiste d'enregistrement (aujourd'hui : le nom tel quel). Tout champ
  « artiste » d'un formulaire de création passe par là, jamais par une lecture
  directe de `artist_title` ou `full_name`.
- `legalName(meta)` : « Prénom Nom » depuis `user_metadata` (`first_name` /
  `last_name`, repli `full_name`), partagé par l'onboarding, Réglages et le
  pré-remplissage des **œuvres**, qui portent toujours le nom civil (section 3).

## 2. Collecte et modification

### Onboarding

`SectorOnboarding` passe de 2 à 3 étapes ; l'identité devient l'**étape 1**.

- Titre : « Tu sors ta musique sous… ». Deux cartes au choix :
  - *Un nom d'artiste* : champ texte, requis pour continuer.
  - *Mon nom* : champ pré-rempli avec `legalName()`, modifiable.
- « Continuer » appelle `setArtistIdentity` **immédiatement** (pas à la fin de
  l'onboarding) : un onboarding abandonné en cours garde l'identité.
- Événement PostHog `onboarding_identity_set` avec `{ mode }` (jamais le nom).
- Étapes suivantes inchangées (secteurs, puis données d'exemple).

### Comptes existants

Dans `DashboardPage`, si l'onboarding est terminé mais `identityMode === null`,
afficher uniquement l'étape identité (composant extrait, réutilisé tel quel),
une seule fois. Couvre le compte existant et les comptes créés avant ce
changement.

### Réglages › Informations personnelles

Nouvelle carte « Identité artistique » sous « Profil » : même choix
artiste / nom propre, même champ. Texte d'aide : les sorties déjà créées
gardent leur nom.

- Enregistrer prénom/nom dans la carte Profil, en mode `'legal'`, met aussi
  `artist_name` à jour.
- Après enregistrement de l'identité : action ponctuelle « Remplir les champs
  artiste vides avec ce nom » qui annonce les volumes (« 4 titres, 1 album,
  2 œuvres »), ne touche **que les champs vides** et passe par les setters des
  hooks de module (motif optimiste habituel). Masquée si rien n'est vide.

## 3. Consommateurs

### Identité (en direct)

- **Lien d'écoute** (`app/api/listening/[slug]/route.ts`) : ordre de résolution
  `user_preferences.artist_name` → `user_presskit_profile.artist_title` →
  `streaming_artist_name` → `"Artiste"`. Corrige le bug public.
- **Prompts IA** : hors périmètre. La génération est en pause avant la bêta
  (`hero-phrase` renvoie une phrase fixe, `ai-suggestions` une liste vide) ; à
  leur réactivation, injecter `artist_name` dans le contexte.
- **Header** : inchangé, « Bonjour » s'adresse à la personne, par son prénom.

### Enregistrements (pré-remplis)

Valeur initiale `defaultArtist(artistName)` à la **création** uniquement ; en
édition, la valeur stockée fait foi, même vide.

| Écran | Champ |
|---|---|
| `phono/components/tracks/TrackEditPage.tsx` (défaut du formulaire, l. 77) | `mainArtist` |
| `phono/components/albums/AlbumEditPage.tsx` (défaut, l. 95) | `artist` |
| `phono/components/mixes/MixEditPage.tsx` (défaut, l. 67) | `artists` |
| `projects/components/ProjectCreatePage.tsx` (`addRelease`, l. 66) | `artist` |

**Exception : les œuvres (Édition) sont nommées en nom propre**, quel que
soit `identity_mode`. Une œuvre se déclare sous l'identité civile de ses
auteurs-compositeurs, pas sous un nom de scène. Leur champ `artistName` est
donc pré-rempli avec `legalName()` (« Prénom Nom » lu dans `user_metadata`),
jamais avec `artist_name` :

| Écran | Champ | Valeur |
|---|---|---|
| `edition/components/WorksPage.tsx` (défaut, l. 215) | `artistName` | `legalName()` |
| `projects/components/ProjectCreatePage.tsx` (`addWork`, l. 67) | `artistName` | `legalName()` |

Le rattrapage « remplir les champs vides » (section 2) applique la même
règle : nom civil pour les œuvres, `artist_name` pour le reste.

**L'utilisateur est ajouté d'office comme ayant droit.** À la création d'une
œuvre (`WorksPage` et `addWork` de `ProjectCreatePage`), `persons` démarre avec
une entrée pour l'utilisateur, à la manière d'une déclaration SACEM :

```ts
{
  id: `p-${crypto.randomUUID()}`,
  firstName,                       // user_metadata, civil
  name: lastName,                  // user_metadata, civil
  pseudonym: identityMode === "artist" ? artistName : "",
  roles: ["author", "composer"],
}
```

- Retirable et modifiable comme n'importe quel ayant droit : c'est un point de
  départ, pas une contrainte (l'utilisateur peut n'être que compositeur, ou
  déclarer pour un tiers).
- `splitsAuthors` / `splitsComposers` restent vides : la sauvegarde accepte
  déjà des parts vides (l. 1348) et l'éditeur de répartition prend le relais
  dès qu'un co-auteur est ajouté.
- Œuvres existantes : pas de rattrapage automatique des `persons`, trop
  risqué sur des répartitions déjà saisies.
- Libellé du champ `artistName` (l. 728) et messages d'erreur (l. 1356, 1379) :
  « Nom du groupe / de l'artiste » devient « Nom (état civil) », cohérent avec
  la valeur qu'il porte désormais.
- Helper `selfPerson(meta, identityMode, artistName): Person` dans
  `src/lib/artist-identity.ts`, pour que les deux écrans produisent la même
  entrée.

**Non pré-rempli** : les entrées de tracklist d'un mix
(`TracklistEditor.tsx`, l. 314), qui peuvent être le morceau d'un autre
artiste ; les featurings (`guestArtists`).

L'export de métadonnées ffmpeg lit déjà le titre : aucun changement.

Hors périmètre : presskit et Sync (fermés pour l'alpha). Le presskit garde son
`artist_title` propre ; il pourra être pré-rempli depuis `artist_name` à sa
réouverture.

## 4. Documentation

- `CLAUDE.md` : nouvelle section **« Identité de l'artiste »** en tête
  d'*Architecture* : source de vérité, règle identité/enregistrement,
  exception des œuvres (toujours en nom civil),
  interdiction de lire `artist_title` ou `full_name` pour afficher l'artiste,
  obligation de passer par `defaultArtist()` pour tout nouveau champ artiste.
- `ALPHA.md` : entrée datée dans Avancement et ligne dans le planning.
- `.codesight/` : fichiers auto-générés, non touchés à la main.

## Ordre de priorité

1. Migration + hook
2. Lien d'écoute (bug visible côté public)
3. Étape d'onboarding + rattrapage des comptes existants
4. Pré-remplissage des formulaires de création
5. Réglages + remplissage des champs vides
6. `CLAUDE.md`, `ALPHA.md`

## Vérification

Pas de suite de tests. Pour chaque étape : `npx tsc --noEmit`, `npm run lint`,
puis vérification en dev avec le compte de captures (données réelles, ne pas
salir) :

- Lien d'écoute existant : l'en-tête affiche le nom et non « Artiste ».
- Tableau de bord : l'étape identité apparaît une fois, puis plus.
- Création d'un titre : champ artiste pré-rempli ; édition d'un titre existant
  à artiste vide : reste vide.
- Création d'une œuvre en mode `'artist'` : champ pré-rempli avec le nom
  civil, pas le nom d'artiste ; l'utilisateur figure dans les ayants droit
  (auteur + compositeur, pseudonyme = nom d'artiste) ; la sauvegarde passe
  sans saisir de parts.
- Réglages : passage en nom propre, modification du nom civil, `artist_name`
  suit.
- Migration non appliquée : l'app se charge quand même (repli `SELECTS`).
