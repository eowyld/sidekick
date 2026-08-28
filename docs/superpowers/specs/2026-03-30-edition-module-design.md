# Design : Module Édition

**Date :** 2026-03-30
**Statut :** Approuvé

---

## Contexte

Le module Édition est l'un des deux modules non encore développés dans SIDEKICK (avec Incomes). Les stubs `WorksPage.tsx` et `SyncPage.tsx` existent déjà avec un `// TODO`. Ce design décrit l'implémentation complète.

## Pages

### 1. WorksPage — Catalogue des œuvres (`/edition`)

Gestion du catalogue des œuvres musicales avec splits entre créateurs et éditeur.

**Fonctionnalités :**
- Dashboard 4 KPI : total / en cours / finalisées / déposées SACEM
- Liste des œuvres avec organigramme des splits (barre segmentée + légende)
- Modal ajout/édition : titre, statut, créateurs, éditeur, ISWC, date, genre, fichiers (UI only), types exploitation, territoires, notes
- Validation : titre requis, au moins un créateur, total splits = 100% (bloque la sauvegarde)
- Suppression avec confirmation inline
- Empty state si aucune œuvre

### 2. SyncPage — Synchronisation audiovisuelle (`/edition/sync`)

Préparation des œuvres pour la synchronisation (films, séries, pub, etc.).

**Fonctionnalités :**
- Filtre : uniquement les œuvres avec `exploitationTypes.includes('sync')`
- Dashboard 5 KPI : total sync / exploitées / sync-ready / à préparer / non prêtes
- Encart info bleu expliquant le filtre
- Liste avec 2 colonnes : infos sync (moods, thèmes, pitch, tempo) + exploitants
- Modal "Préparer" : statut, tempo, moods (26 options), thèmes (20 options), pitch (avec génération IA simulée), contexte, liens privés
- Modal "Gérer les exploitants" : ajout/édition/suppression par œuvre
- Export fiche sync en `.txt`
- Génération automatique d'un lien d'écoute privé fictif

## Architecture des données

### sidekick-store.ts — Types étendus

```typescript
// Remplace les stubs Work et SyncState

export interface Creator {
  id: string;
  name: string;
  role: 'author' | 'composer' | 'producer';
  split: number;
}

export interface Publisher {
  name: string;
  split: number;
}

export interface Work {
  id: string;
  title: string;
  status: 'in-progress' | 'finalized' | 'registered-sacem';
  creators: Creator[];
  publisher?: Publisher;
  iswc: string;
  creationDate: string;
  genre: string;
  files: { sheet?: string; lyrics?: string; audio?: string };
  exploitationTypes: ('streaming' | 'live' | 'sync' | 'cover')[];
  territories: string[];
  notes: string;
}

export interface Exploitant {
  id: string;
  company: string;
  project: 'film' | 'serie' | 'pub' | 'jeu-video' | 'media' | '';
  date: string;
  status: 'sent' | 'discussing' | 'accepted' | 'refused' | '';
  notes: string;
}

export interface SyncData {
  workId: string;
  status: 'not-ready' | 'to-prepare' | 'sync-ready' | 'exploited';
  moods: string[];
  tempo: string;
  pitchShort: string;
  usageContext: string;
  themes: string[];
  privateLinks: string[];
  exploitants: Exploitant[];
}

// SidekickData.edition devient :
edition: {
  works: Work[];
  sync: Record<string, SyncData>; // indexé par workId
}
```

### Persistance

- `data.edition.works` — tableau des œuvres
- `data.edition.sync` — dictionnaire `{ [workId]: SyncData }`
- Pas de localStorage séparé, tout via `useSidekickData()`

## Routing

| Route | Composant |
|---|---|
| `/edition` | `WorksPage` |
| `/edition/sync` | `SyncPage` |

## Sidebar

Transformation du lien simple `/edition` en sous-menu (même pattern que Phono) :

```
Edition ▸
  ├── Catalogue       /edition
  └── Synchronisation /edition/sync
```

Contrôlé par `enabled.edition` (déjà géré dans le store).

## Dépendances

- **sonner** : installer via `npm install sonner`, ajouter `<Toaster />` dans `app/(app)/layout.tsx`

## Fichiers modifiés / créés

| Fichier | Type |
|---|---|
| `package.json` (+ npm install) | Modification |
| `app/(app)/layout.tsx` | Modification |
| `src/lib/sidekick-store.ts` | Modification |
| `src/components/layout/Sidebar.tsx` | Modification |
| `app/(app)/edition/page.tsx` | Création |
| `app/(app)/edition/sync/page.tsx` | Création |
| `src/modules/edition/components/WorksPage.tsx` | Remplacement complet |
| `src/modules/edition/components/SyncPage.tsx` | Remplacement complet |

## Adaptations vs spec d'origine

| Spec | SIDEKICK |
|---|---|
| `useLocalStorage('editionWorks', [])` | `useSidekickData()` → `data.edition.works` |
| `useLocalStorage('editionSyncData', [])` | `data.edition.sync` (Record) |
| `import { toast } from 'sonner@2.0.3'` | `import { toast } from 'sonner'` |
| Composants shadcn/ui | `@/components/ui/` existants |
| `DatePicker` natif | `@/components/ui/date-picker` |
| Dates ISO dans le store | Format FR `JJ/MM/AAAA` via `date-format.ts` |

## Notes techniques

- `WorkForm` mémorisé avec `React.memo()` + `useCallback` pour les handlers créateurs
- Organigramme splits : barre segmentée responsive, pourcentage affiché si segment ≥ 10%
- La validation split = 100% bloque la sauvegarde (toast d'erreur + indicateur visuel rouge)
- Export `.txt` via `Blob` + `<a>` temporaire
- Génération pitch IA : simulation 1.5s sans appel API réel
- Liens privés auto-générés : `https://private-listen.music/{randomId}`
