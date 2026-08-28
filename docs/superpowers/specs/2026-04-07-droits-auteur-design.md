# Design — Page Droits d'auteur (SACEM)

**Date:** 2026-04-07
**Module:** `src/modules/incomes`
**Route:** `/incomes/droits-auteur`

---

## Contexte

Remplacement du stub `CopyrightPage` par une page de dashboard complète affichant les reversements SACEM (DRM + DEP). L'import PDF du relevé SACEM est délibérément exclu — les données sont mockées en attendant confirmation du format PDF. La page est conçue pour que le branchement sur de vraies données ne nécessite qu'une modification dans `CopyrightPage` (swapper la mock data contre un hook localStorage).

---

## Fichiers créés / modifiés

```
src/modules/incomes/
  parsers/
    copyright-types.ts        ← NOUVEAU — types + mock data + helpers
  components/
    CopyrightDashboard.tsx    ← NOUVEAU — graphiques & tableaux (composant pur)
    CopyrightHistorique.tsx   ← NOUVEAU — liste des relevés avec suppression
    CopyrightPage.tsx         ← MODIFIÉ — orchestrateur avec filtre période
```

Aucun autre fichier n'est touché. La route et le lien sidebar existent déjà.

---

## Modèle de données

```ts
type TypeUtilisation =
  | "internet" | "tv" | "radio" | "cinema"
  | "sonorisation" | "spectacles" | "etranger"
  | "supports_enregistres" | "copie_privee" | "autres"

type TypeDroit = "DRM" | "DEP"

interface CopyrightEntry {
  id: string
  titre: string
  iswc: string           // format T-XXX.XXX.XXX-X
  typeDroit: TypeDroit
  typeUtilisation: TypeUtilisation
  pays: string           // code ISO 2 lettres, ex: "FR"
  montant: number        // EUR
  date: string           // "YYYY-MM-DD" — date du relevé
}

interface CopyrightReleve {
  id: string
  filename: string       // ex: "Relevé_SACEM_2024.pdf" ou "Données de démo"
  importedAt: string     // "YYYY-MM-DD" — date d'import dans l'app
  periodeLabel: string   // ex: "Année 2024", "S1 2025"
  entries: CopyrightEntry[]
}
```

Les libellés d'affichage pour `TypeUtilisation` et `TypeDroit` sont définis dans `copyright-types.ts` via des maps d'export.

La mock data définit **3 relevés** (`MOCK_RELEVES: CopyrightReleve[]`) couvrant : 4 œuvres × toutes les utilisations × DRM + DEP × 4 pays (FR, US, DE, GB), répartis sur 2024 et 2025 — suffisant pour alimenter tous les graphiques.

---

## Filtre période

`CopyrightPage` gère un state local :

```ts
type PeriodFilter =
  | { mode: "global" }
  | { mode: "year"; year: number }
  | { mode: "custom"; from: string; to: string }  // dates ISO
```

- **Global** : toutes les entrées
- **Année** : entrées dont `date` commence par `YYYY`
- **Personnalisée** : entrées dont `date` est entre `from` et `to` (inclusif)

Le dropdown liste "Global", puis les années présentes dans les données (dérivées dynamiquement), puis "Période personnalisée…". Quand "Personnalisée" est sélectionné, deux `<input type="date">` apparaissent en dessous à droite avec animation fade-in.

---

## Architecture des composants

### `CopyrightPage` (orchestrateur)

- Détient `releves: CopyrightReleve[]` en state (initialisé sur `MOCK_RELEVES`)
- Détient `filter: PeriodFilter` en state
- Calcule `filteredEntries` via `useMemo` : flatten de tous les `releve.entries`, puis filtre période
- Rend dans l'ordre : header, barre de filtre, `<CopyrightDashboard entries={filteredEntries} />`, `<CopyrightHistorique>`
- `handleDeleteReleve(id)` : retire le relevé de `releves`, le dashboard se recalcule automatiquement
- Quand l'import PDF sera disponible, `MOCK_RELEVES` sera remplacé par un hook localStorage — aucun autre changement

### `CopyrightHistorique` (composant pur)

Reçoit `releves: CopyrightReleve[]` et `onDelete: (id: string) => void`.

Affiche un tableau listant chaque relevé :

| Colonne | Contenu |
|---|---|
| Fichier | `filename` |
| Période | `periodeLabel` |
| Importé le | `importedAt` formaté en français |
| Entrées | nombre d'entrées du relevé |
| Total | somme des `montant` du relevé en EUR |
| Action | bouton icône `Trash2` — demande confirmation native `window.confirm` avant suppression |

Si `releves.length === 0`, affiche un placeholder "Aucun relevé importé".

---

### `CopyrightDashboard` (composant pur)

Reçoit `entries: CopyrightEntry[]`. Tous les calculs sont dans des `useMemo`.

**Blocs affichés (de haut en bas) :**

1. **Top 3 œuvres** — 3 cards en ligne, montant total DRM+DEP, badge #1 accentué en jaune
2. **Répartitions** — grille 3 colonnes :
   - Grand donut : répartition par `typeUtilisation` (10 catégories + légende)
   - Petit donut : répartition par `pays` (top 6 + "Autres")
   - Petit donut : répartition `DRM` vs `DEP`
3. **Séparateur horizontal**
4. **Tableaux détaillés** — grille 2 colonnes côte à côte :
   - *Droits par titre* : colonnes Œuvre (titre + ISWC en monospace), DRM, DEP, Total
   - *Droits par utilisation* : colonnes Utilisation, DRM, DEP, Total

**État vide :** si `entries.length === 0`, un placeholder centré s'affiche ("Aucun relevé SACEM importé") à la place du dashboard.

---

## Historique des relevés

Section en bas de page, toujours visible (même si vide).

`CopyrightHistorique` est un composant séparé rendu par `CopyrightPage`, après `CopyrightDashboard`. Il affiche les relevés indépendamment du filtre période (le filtre n'affecte que le dashboard, pas la liste des relevés).

La suppression d'un relevé est irréversible dans la session — confirmation via `window.confirm` (cohérent avec le pattern `handleDeleteManual` des royalties). L'état est géré dans `CopyrightPage`, donc supprimer un relevé recalcule immédiatement le dashboard.

---

## Calculs du dashboard

| Bloc | Logique |
|---|---|
| Top 3 œuvres | `groupBy(titre)` → `sum(montant)`, sort desc, slice 3 |
| Donut utilisation | `groupBy(typeUtilisation)` → `sum(montant)` |
| Donut pays | `groupBy(pays)` → `sum(montant)`, top 6 + agrégat "Autres" |
| Donut DEP/DRM | `groupBy(typeDroit)` → `sum(montant)` |
| Tableau par titre | `groupBy(titre+iswc)` → DRM sum, DEP sum, total, sort desc |
| Tableau par utilisation | `groupBy(typeUtilisation)` → DRM sum, DEP sum, total |

---

## UI & Design system

- Palette dark uniquement : `#101010` fond, `rgba(44,44,46,0.72)` cards, `#F0FF00` accent, `rgba(245,245,245,0.12)` bordures
- Composants : `Card`, `CardHeader`, `CardTitle`, `CardContent` de `@/components/ui/card`
- Donuts : SVG natif (pas de lib externe — cohérent avec la légèreté du module)
- Tableaux : `<table>` HTML avec styles inline Tailwind
- Icônes : `lucide-react` uniquement
- Montants formatés en EUR avec `toLocaleString("fr-FR", { style: "currency", currency: "EUR" })`

---

## Ce qui est exclu

- Import PDF SACEM (reporté)
- Persistance localStorage (reportée — swap trivial plus tard)
- Édition / suppression manuelle d'entrées
- Export des données
