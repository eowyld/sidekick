# Royalties — Import CSV & Dashboard

**Date:** 2026-03-30
**Module:** `src/modules/incomes`
**Scope:** Refonte complète de `RoyaltiesPage` — import CSV par distributeur + dashboard de visualisation consolidé.

---

## Contexte

La page Royalties actuelle (`RoyaltiesPage.tsx`) se limite à stocker les CSV bruts en localStorage sans aucune visualisation. Ce spec décrit la refonte complète : parsers par distributeur, schéma normalisé, et dashboard consolidé.

---

## Distributeurs supportés

Dans l'ordre d'affichage des onglets :

1. **DistroKid**
2. **TuneCore**
3. **CD Baby**
4. **SoundCloud**

Pas de CSV générique — les formats sont trop différents pour être parsés de manière fiable sans connaître le distributeur à l'avance.

---

## Modèle de données

### `RoyaltyEntry` — entrée normalisée

```typescript
type Distributor = "distrokid" | "tunecore" | "cdbaby" | "soundcloud";

interface RoyaltyEntry {
  id: string;           // généré à l'import (crypto.randomUUID)
  distributor: Distributor;
  period: string;       // "YYYY-MM"
  store: string;        // "Spotify", "Apple Music", "YouTube Music"...
  country: string;      // code ISO — "FR", "US", "GB"...
  trackTitle: string;
  album?: string;
  isrc?: string;
  streams: number;
  revenue: number;      // montant brut dans la devise d'origine
  currency: string;     // "USD" pour la plupart
}
```

### `DistributorImport` — ce qui est stocké par distributeur

```typescript
interface DistributorImport {
  distributor: Distributor;
  fileName: string;
  importedAt: string;   // ISO date
  entries: RoyaltyEntry[];
}
```

### `ManualEntry` — entrée saisie manuellement

```typescript
interface ManualEntry extends RoyaltyEntry {
  distributor: "manual";
}
```

`ManualEntry` suit le même schéma que `RoyaltyEntry` avec `distributor: "manual"`. Les champs obligatoires à la saisie : `period`, `trackTitle`, `streams`, `revenue`, `currency`. Les autres sont optionnels.

### Stockage

Deux clés localStorage :
- `"royalties:imports"` → `Record<Distributor, DistributorImport | null>` — données importées par CSV
- `"royalties:manual"` → `ManualEntry[]` — entrées saisies manuellement

`allEntries` dans `RoyaltiesPage` concatène les deux sources.

Remplace l'ancien stockage `"incomes:royalties-imports"` qui conservait les CSV bruts (inutilement lourd).

### Dernier onglet actif

Clé localStorage `"royalties:lastTab"` → `Distributor | "manual"`. Mémorise le dernier onglet visité dans `RoyaltiesImports` pour le restaurer à l'ouverture suivante. Défaut : `"distrokid"`.

---

## Parsers

### Emplacement

```
src/modules/incomes/parsers/
├── distrokid.ts
├── tunecore.ts
├── cdbaby.ts
└── soundcloud.ts
```

### Interface commune

```typescript
function parse(headers: string[], rows: string[][]): RoyaltyEntry[]
```

Chaque parser :
1. Vérifie que les colonnes attendues sont présentes — sinon lève une `Error` avec un message lisible (`"Ce fichier ne ressemble pas à un export DistroKid"`)
2. Mappe chaque ligne vers `RoyaltyEntry`
3. Ignore les lignes vides ou malformées silencieusement

### Mapping des colonnes par distributeur

| Champ normalisé | DistroKid | TuneCore | CD Baby | SoundCloud |
|---|---|---|---|---|
| `period` | `Sale Month` | `Start Date` | `Sale Date` | `Period` |
| `store` | `Store` | `Store Name` | `Store` | *(fixe : "SoundCloud")* |
| `country` | `Country` | `Country` | `Territory` | *(vide ou ignoré)* |
| `trackTitle` | `Title` | `Track Title` | `Track` | `Track Title` |
| `album` | — | `Release Title` | `Release` | — |
| `isrc` | `ISRC` | `ISRC` | `ISRC` | — |
| `streams` | `Quantity` | `Quantity` | `Units` | `Streams` |
| `revenue` | `Earnings (USD)` | `Net Revenue` | `Net Revenue (USD)` | `Revenue` |
| `currency` | `"USD"` | `"USD"` | `"USD"` | `"USD"` |

> Note : `period` doit être normalisé en `"YYYY-MM"` — les formats d'entrée varient (ex: `"Jan 2025"`, `"2025-01-01"`, `"01/2025"`).

---

## Structure des composants

```
src/modules/incomes/components/
├── RoyaltiesPage.tsx       — layout principal, gère le state global
├── RoyaltiesDashboard.tsx  — KPIs + charts consolidés
├── RoyaltiesImports.tsx    — onglets par distributeur + import CSV + saisie manuelle
└── RoyaltiesManualModal.tsx — modale de saisie manuelle titre par titre
```

L'actuel `RoyaltiesPage.tsx` est entièrement remplacé.

### `RoyaltiesPage`
- Charge `"royalties:imports"` et `"royalties:manual"` via `useLocalStorage`
- Charge `"royalties:lastTab"` pour restaurer le dernier onglet actif
- Calcule `allEntries: RoyaltyEntry[]` (concaténation imports CSV + entrées manuelles)
- Passe `allEntries` à `RoyaltiesDashboard`, `imports` + `manualEntries` à `RoyaltiesImports`
- Affiche `RoyaltiesDashboard` en haut, `RoyaltiesImports` en bas (pas de toggle — tout visible en scroll)

### `RoyaltiesDashboard`
- Props : `entries: RoyaltyEntry[]`
- Calcule les agrégats côté composant (useMemo)
- Affiche les KPIs et charts (voir section Visualisations)
- État vide si `entries.length === 0` : message invitant à importer un CSV ou saisir manuellement

### `RoyaltiesImports`
- Props : `imports`, `manualEntries`, `defaultTab`, `onImport(distributor, file)`, `onTabChange(tab)`, `onAddManual(entry)`, `onDeleteManual(id)`
- Onglets : DistroKid / TuneCore / CD Baby / SoundCloud / **Saisie manuelle**
- L'onglet actif au montage = `defaultTab` (dernier onglet mémorisé)
- Chaque changement d'onglet appelle `onTabChange` pour persister `"royalties:lastTab"`
- Onglets CSV : bouton "Importer CSV" + résumé du dernier import (nom fichier, date, nb lignes) + mini KPIs si données présentes. En cas d'erreur de parsing : message d'erreur lisible.
- Onglet "Saisie manuelle" : tableau des entrées manuelles (CRUD) + bouton "Ajouter un titre"

### `RoyaltiesManualModal`
- Modale add/edit pour une `ManualEntry`
- Champs obligatoires : période (`YYYY-MM`, via mois + année), titre, streams, revenus, devise
- Champs optionnels : album, ISRC, plateforme (store), pays
- Devise : select parmi USD / EUR / GBP (défaut USD)

---

## Visualisations du dashboard

### 4 KPIs (ligne du haut)

| KPI | Calcul |
|---|---|
| Revenus totaux | `sum(entries.revenue)` affiché en USD (voir note devise) |
| Streams totaux | `sum(entries.streams)` |
| Titres actifs | `count(distinct entries.trackTitle)` avec au moins 1 stream |
| Taux moyen / stream | `revenus totaux / streams totaux` |

> **Note devise :** Pour le MVP, on affiche les revenus en USD tel quel avec le symbole $. La conversion EUR est hors scope (nécessiterait une API de taux de change).

### Chart 1 — Revenus par mois (bar chart)
- Recharts `BarChart`
- 12 derniers mois glissants sur l'axe X
- Données : `sum(revenue)` par mois (`period`)

### Chart 2 — Répartition (2 colonnes)
- **Gauche : Revenus par plateforme** — liste ordonnée des `store` avec revenus et pourcentage
- **Droite : Revenus par distributeur** — barres de progression par `distributor`

### Chart 3 — Top titres (tableau)
- 10 premiers titres triés par revenus décroissants
- Colonnes : rang, titre, streams totaux, revenus totaux

---

## Ce qui est supprimé / remplacé

- `RoyaltiesPage.tsx` — remplacé entièrement
- Clé localStorage `"incomes:royalties-imports"` — remplacée par `"royalties:imports"` (migration silencieuse : si l'ancienne clé existe, on l'ignore simplement)
- Nouveau composant ajouté : `RoyaltiesManualModal.tsx`

---

## Hors scope

- Conversion USD → EUR (taux de change)
- Export CSV/PDF des données importées
- Filtre par période dans le dashboard
- Détection automatique du distributeur depuis le CSV
