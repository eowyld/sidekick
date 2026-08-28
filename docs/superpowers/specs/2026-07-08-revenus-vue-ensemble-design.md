# Revenus — Vue d'ensemble (dashboard analytics)

**Date :** 2026-07-08
**Statut :** Design validé, prêt pour plan d'implémentation
**Fichier cible principal :** `src/modules/incomes/components/IncomesOverviewPage.tsx` (actuellement un stub avec titre seul)

## Objectif

Transformer la page « Vue d'ensemble » du module Revenus en tableau de bord analytique
permettant de visualiser rapidement **d'où viennent les revenus**, selon 4 axes :
par **année**, par **mois**, par **module** (facture, royalties/droits phono, droits
d'auteur/SACEM, intermittence) et par **projet**.

Référence design : pages Dashboard, Contacts, Tasks, Calendrier (densité, cartes
`rgba(44,44,46,0.72)` + `backdrop-blur`, palette dark-only, accent `#F0FF00`).

## Sources de revenus agrégées

Quatre sources, chacune avec des champs différents (cf. exploration du code) :

| Module | Hook / origine | Montant | Date retenue | Devise | projectId |
|---|---|---|---|---|---|
| Facturation | `useIncomesData` → `invoices` (`user_invoices`) | `amount` (brut) | `encaissementDate` | EUR | ✓ |
| Droits phono (royalties) | `useIncomesData` → royalties (`user_royalties_*`) | `revenue` (brut) | `period` (YYYY-MM) | **USD/mixte** | ✓ |
| Droits d'auteur (SACEM) | `MOCK_RELEVES` (mock, non persisté) | `montant` (brut) | `date` (YYYY-MM-DD) | EUR | ✗ |
| Intermittence | `useIncomesData` → `intermittenceMissions` (`user_intermittence_missions`) | `grossAmount` (brut) | `date` (YYYY-MM-DD) | EUR | ✗ |

## Règles de calcul (décisions validées)

1. **Devise** — les royalties (USD/mixte) sont converties en EUR via un **taux fixe
   paramétrable** (constante dédiée, ex. `USD_TO_EUR` dans un module de config, facile à
   déplacer vers les préférences plus tard). Tout s'affiche en EUR.
2. **Temporalité (base encaissement / cash)** — une facture ne compte que si elle est
   **payée**, à la date de son `encaissementDate`. Les factures en attente sont **exclues**
   des totaux et graphes, mais alimentent un **KPI « à venir »** séparé. Les 3 autres
   sources sont déjà de l'argent perçu → on prend leur date telle quelle.
3. **Montant brut** — on additionne les montants **bruts** partout (facture `amount`,
   royalties `revenue`, intermittence `grossAmount`). Un toggle « Revenu net estimé »
   est **hors périmètre v1** (phase 2 : seul l'intermittence a un vrai net, les autres
   nécessiteraient une règle d'estimation).
4. **SACEM incluse** — le mock `MOCK_RELEVES` est agrégé comme les autres. L'agrégation
   est **source-agnostique** : le jour où la SACEM est persistée sur Supabase, elle se
   branche sans retoucher le calcul.
5. **Par projet** — répartition par `projectId` pour toute entrée qui en porte un
   (aujourd'hui factures + royalties, demain toutes les sources — travail en cours).
   Tout le reste tombe dans un bucket **« Sans projet »**. Les totaux se réconcilient
   toujours à 100 %.

## Bonus v1 retenu

- **Comparaison N vs N-1** — sur le graphe mensuel, une **ligne pointillée fantôme**
  représente le même mois de l'année précédente, pour lire la progression mois par mois.

Bonus écartés de la v1 (notés pour plus tard) : objectif annuel avec jauge, indice de
diversification/dépendance, timeline « prochaines rentrées », export CSV.

## Architecture

### Normalisation — type commun

Toutes les sources sont normalisées en un type unifié avant agrégation :

```ts
type RevenueModule = "facture" | "royalties" | "sacem" | "intermittence";

interface NormalizedRevenue {
  date: Date;          // date retenue selon les règles ci-dessus
  amountEUR: number;   // brut, converti en EUR
  module: RevenueModule;
  projectId?: string;  // undefined → bucket « Sans projet »
}
```

La normalisation applique : conversion USD→EUR (royalties), filtre payées +
`encaissementDate` (factures), parsing des dates (`period` YYYY-MM → 1er du mois).

### Agrégateur

Un hook `useIncomesOverview()` (dans `src/hooks/` ou co-localisé dans le module) qui :

1. Lit les 4 sources (`useIncomesData` + `MOCK_RELEVES`).
2. Produit `NormalizedRevenue[]`.
3. Dérive via `useMemo` tous les agrégats, filtrés par l'année sélectionnée :
   - `kpis` : total encaissé période, delta % vs N-1, à venir (impayés), moyenne/mois, source n°1.
   - `byMonth` : 12 points { mois, montant par module } + série N-1 (ligne fantôme).
   - `byModule` : { module, montant, pct } × 4.
   - `byProject` : { projet, montant } triés + « Sans projet ».
   - `byYear` : { année, montant par module } pour 2024/25/26… (années présentes dans les données).

Expose aussi `loading` / `error` (dérivés des hooks Supabase sous-jacents).

### Composants (isolés, données agrégées reçues en props)

- `IncomesOverviewPage` — orchestration : sélecteur d'année (state local), appel du hook,
  gestion loading/vide/erreur, layout des rows.
- `OverviewKpis` — les 4 cartes KPI.
- `MonthlyRevenueChart` — bar chart empilé recharts + ligne N-1 (`ComposedChart` :
  `Bar` empilés par module + `Line` pointillée pour N-1).
- `ModuleBreakdown` — donut (recharts `PieChart`) + légende %.
- `ProjectBreakdown` — barres horizontales (recharts `BarChart` layout vertical, ou barres CSS).
- `YearlyComparison` — barres empilées par année.

### Sélecteur d'année

State local dans `IncomesOverviewPage`. Valeur par défaut : année en cours. Option
« Tout » (toutes années confondues) pilote KPIs + répartitions ; le graphe mensuel
et la comparaison N-1 se basent alors sur l'année en cours par défaut.

### États

- **Loading** — skeletons dans chaque carte (pas de spinner bloquant).
- **Vide** — « Aucun revenu enregistré » + CTA vers les sous-modules (factures,
  royalties, intermittence).
- **Erreur** — via `PageError` (comme `DashboardPage`).

## Design / palette

- Cartes : `border-[rgba(245,245,245,0.12)] bg-[rgba(44,44,46,0.72)] backdrop-blur-xl`.
- Couleurs modules (reprises de `copyright-types.ts` pour cohérence) :
  facture `#F0FF00`, royalties `#60a5fa`, SACEM `#f472b6`, intermittence `#34d399`.
- Accent / focus : `#F0FF00`. Texte `#f5f5f5`, muted `rgba(245,245,245,0.7)`.
- Formatage EUR : `toLocaleString("fr-FR", { style:"currency", currency:"EUR" })`
  (helper `formatEUR` déjà présent dans `copyright-types.ts`, à réutiliser/factoriser).
- Chiffres alignés : figures tabulaires pour les colonnes de montants.

## Accessibilité / dataviz

- Chaque graphe : légende visible, tooltip au survol/tap avec valeurs exactes.
- Ne pas coder l'info uniquement par la couleur → labels + légende texte.
- Respecter `prefers-reduced-motion` sur les animations d'entrée des charts.
- Donut limité à 4 catégories (≤5, lisible).

## Hors périmètre v1

- Toggle « Revenu net estimé ».
- Objectif annuel, indice de diversification, prochaines rentrées, export CSV.
- Persistance Supabase de la SACEM (reste en mock ; l'agrégation est prête à l'accueillir).
- Taux de change historisé (taux fixe unique pour la v1).

## Navigation

La route `/revenus` (vue d'ensemble) existe déjà et est référencée dans la Sidebar —
pas de nouveau lien à ajouter. Vérifier lors de l'implémentation.
