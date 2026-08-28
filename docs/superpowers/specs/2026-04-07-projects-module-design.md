# Module Projets — Design Spec
Date: 2026-04-07

## Contexte

Le module Projets est une nouvelle section dans la sidebar Musique, placée en premier. Il sert d'entité mère transversale qui relie les modules Phono, Édition et Live. Un projet est la première étape d'un travail musical — l'artiste crée un projet avant de décider s'il publie les titres, les édite, les joue en live.

## Modèle de données

### `Project`

```typescript
interface Project {
  id: string;
  title: string;
  description: string;
  status: "idea" | "in_progress" | "paused" | "done" | "archived";
  cover: string;                    // image principale (URL ou base64)
  images: string[];                 // mood board, références visuelles
  sectors: ("phono" | "edition" | "live")[];

  members: ProjectMember[];

  // Relations (IDs vers les modules sources de vérité)
  linkedAlbums: string[];           // → phono.albums[].id
  linkedTracks: string[];           // → phono.tracks[].id
  linkedSessions: string[];         // → phono.sessions[].id
  linkedWorks: string[];            // → edition.works[].id
  linkedTourDates: string[];        // → live.tourDates[].id
  linkedRehearsals: string[];       // → live.rehearsals[].id

  createdAt: string;
  updatedAt: string;
  notes: string;
}

interface ProjectMember {
  contactId: string | null;         // null si créé à la volée
  name: string;
  role: string;                     // rôle libre : "beatmaker", "réalisateur"...
}
```

### Enrichissements des types existants

**`Track`** (Phono) — ajouter :
```typescript
linkedWorkId?: string;             // → edition.works[].id
```

**`Work`** (Édition) — ajouter :
```typescript
linkedTrackIds?: string[];         // → phono.tracks[].id
```

Le lien oeuvre ↔ titre est bidirectionnel. Il est créé depuis le dashboard projet et mis à jour des deux côtés simultanément. Il reste visible dans Phono (badge oeuvre sur un titre) et Édition (badge titre(s) sur une oeuvre), hors contexte projet.

### Store global

- `SidekickData` gagne une clé `projects: { projects: Project[] }`
- `DEFAULT_SIDEKICK_DATA` initialisé avec `projects: { projects: [] }`
- `enabledModules` gagne `projects: boolean` (activé par défaut)

## Navigation — Sidebar

"Projets" est ajouté en premier dans la section Musique, avec l'icône `FolderKanban` (Lucide).

```
MUSIQUE
  ▸ Projets
      Projets actifs        /projects
      Anciens projets       /projects/archives
  ▸ Phono
  ▸ Édition
  ▸ Live
```

## Pages

### `/projects` — Projets actifs

Affiche les projets avec statut `idea`, `in_progress`, `paused`, `done`.

**Layout :** Grille de cartes.

Chaque carte affiche :
- Image cover (ou placeholder avec dégradé)
- Titre du projet
- Badge statut (coloré : jaune=idée, vert=en cours, gris=en pause, check=terminé)
- Pastilles secteurs activés (icônes Phono/Édition/Live)
- Compteur membres
- Date de dernière mise à jour

**Actions :**
- Bouton "Nouveau projet" → modal de création (titre, description, cover, secteurs, membres)
- Clic sur une carte → `/projects/[id]`

**Filtres/tri :**
- Par statut
- Par secteur
- Tri par date de mise à jour ou création

---

### `/projects/archives` — Anciens projets

Affiche uniquement les projets `archived`. Layout en **liste compacte** (lignes, pas de grille) pour éviter l'encombrement au fil du temps.

Chaque ligne affiche :
- Thumbnail cover (32×32)
- Titre
- Icônes secteurs
- Période (date création → date archivage)
- Compteur d'éléments liés (ex: "4 titres, 2 oeuvres, 3 dates")
- Bouton "Désarchiver"

Clic sur une ligne → dashboard projet en lecture seule.

---

### `/projects/[id]` — Dashboard Projet

**En-tête :**
- Bannière cover (drop zone si vide)
- Titre éditable inline
- Dropdown statut
- Description
- Stack membres avec bouton "+"
- Menu actions : Archiver, Dupliquer, Supprimer

**Galerie images :**
- Section dépliable
- Drag & drop pour ajouter, clic pour agrandir (mood board)

**Sections secteurs** (affichées uniquement si le secteur est dans `project.sectors`) :

#### Phono
- Mini-cards albums liés : cover, titre, statut (en production/mixé/masterisé/publié)
- Mini-cards titres liés : titre, artiste, statut, + badge oeuvre associée si lien existe
- Mini-cards sessions studio : titre, date
- Barre de progression : ex "2/5 titres publiés"
- Boutons : "Lier un existant" (sélecteur) / "Créer" → redirige vers `/phono/catalogue?projectId=xxx`

#### Édition
- Mini-cards oeuvres liées : titre, statut, auteurs, + badges titre(s) phono associés
- Barre de progression : ex "1/3 oeuvres enregistrées SACEM"
- Boutons : "Lier une oeuvre" / "Créer" → redirige vers `/edition?projectId=xxx`

#### Live
- Mini-cards représentations liées : ville, salle, date, statut
- Mini-cards répétitions liées : lieu, date
- Barre de progression : ex "3/6 dates jouées"
- Boutons : "Lier" / "Créer" → redirige vers `/live/representations?projectId=xxx` ou `/live/repetitions?projectId=xxx`

#### Association Oeuvre ↔ Titre
Dans le dashboard, quand Phono ET Édition sont tous les deux activés, une action "Associer titre ↔ oeuvre" permet d'ouvrir un sélecteur pour choisir un titre parmi les liés et une oeuvre parmi les liées, et créer le lien bidirectionnel.

**Notes :**
- Zone de texte libre en bas de page

## Fonctionnalités transversales

### `?projectId=xxx` sur les redirections
Quand une redirection de création est déclenchée depuis un projet, l'URL cible reçoit `?projectId=xxx`. Les pages de création dans Phono/Édition/Live lisent ce paramètre et, à la sauvegarde, ajoutent automatiquement l'élément créé aux listes liées du projet. L'utilisateur est redirigé vers le dashboard projet après création.

### Badge "Projet" dans les autres modules
- Sur la fiche d'un titre (Phono) : badge cliquable indiquant le(s) projet(s) auxquels le titre est rattaché
- Sur la fiche d'une oeuvre (Édition) : même chose
- Sur une représentation ou répétition (Live) : même chose

## Ce qui est hors scope (MVP)

- Timeline / Gantt
- Budget ou finances par projet (déjà géré dans Revenus)
- Chat ou commentaires (outil solo)
