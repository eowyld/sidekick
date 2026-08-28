# Projets Hub — Phase 2 : Budget & finances

Date: 2026-06-03
Statut: design validé (brainstorming)
Dépend de: Phase 1 (socle données & navigation)

## Contexte

Voir la « Vision d'ensemble » dans `2026-06-03-projects-hub-1-socle-donnees-design.md`.

Cette phase ajoute la dimension financière du projet : un **budget prévisionnel complet** (dépenses estimées + revenus attendus) comparé au **réel** (dépenses réelles saisies + revenus réels agrégés). C'est la pièce la plus structurante : elle introduit le **suivi de dépenses**, concept qui n'existe nulle part ailleurs dans l'app (le module Revenus ne gère que des entrées).

## Modèle de données

### `user_project_budget_lines` (prévisionnel)

Postes du budget prévisionnel — dépenses estimées et revenus attendus.

```
user_project_budget_lines
  id              uuid pk
  user_id         uuid (RLS)
  project_id      uuid -> user_projects.id  (on delete cascade)
  kind            text   -- 'expense' | 'income'
  category        text   -- libre : "studio", "clip", "promo", "mastering", "streaming"...
  label           text
  amount_planned  numeric
  created_at      timestamptz
```

### `user_project_expenses` (dépenses réelles)

Nouveau concept. Dépenses effectivement engagées sur le projet.

```
user_project_expenses
  id          uuid pk
  user_id     uuid (RLS)
  project_id  uuid -> user_projects.id  (on delete cascade)
  label       text
  category    text
  amount      numeric
  date        text   -- ISO YYYY-MM-DD
  notes       text null
  created_at  timestamptz
```

### Revenus réels — agrégation (pas de nouvelle table)

Les revenus réels ne sont **pas redupliqués**. Ils sont agrégés à la lecture à partir de :

1. **Factures** (`user_invoices`) où `project_id = projet` et `status = 'payee'` → montant encaissé.
2. **Saisies manuelles royalties** (`user_royalties_manual`) où `project_id = projet`.
3. **Royalties d'import** : lignes de `user_royalties_imports` dont l'`isrc`/titre correspond à un titre dans `project.linked_tracks`. Remontée **automatique** via le lien titre→projet (pas de `project_id` sur les imports).

> Le rattachement est **hybride** (décision brainstorming) : royalties auto via le lien titre, factures + saisies manuelles taguées explicitement via `project_id`.

### Hooks

- Nouveau `useProjectBudgetData(projectId)` : charge `budget_lines` + `expenses` du projet (pattern optimiste standard).
- Agrégation des revenus réels : fonction de calcul côté client combinant `useIncomesData` (factures + manual + imports) filtré par `project_id` et par `linked_tracks`. Peut vivre dans un util `src/modules/projects/lib/project-finances.ts`.

## UI — Onglet Budget

En-tête de l'onglet : **3 chiffres clés**
- **Prévu** : total revenus attendus − total dépenses estimées (résultat prévisionnel).
- **Réel** : revenus réels agrégés − dépenses réelles.
- **Balance** : mise en avant (vert si positif, rouge si négatif) = revenus réels − dépenses réelles.

Sections :

1. **Prévisionnel** — deux colonnes éditables côte à côte :
   - *Dépenses estimées* : liste de postes (label, catégorie, montant), total en pied.
   - *Revenus attendus* : idem.
   - Ajout/édition/suppression inline d'un poste.

2. **Dépenses réelles** — tableau saisissable (label, catégorie, montant, date, notes). Total. Ajout inline.

3. **Revenus rattachés** — liste **en lecture** des revenus réels agrégés, groupés par source (Factures / Royalties manuelles / Royalties streaming via titres liés), avec renvoi cliquable vers le module Revenus. Bouton **« Rattacher une facture »** → sélecteur de factures existantes non encore taguées (set `project_id`).

4. **Comparatif prévu vs réel** — par poste/catégorie, barres de progression (réel / prévu). Met en évidence les dépassements.

## Cockpit (Vue d'ensemble) — carte Budget

Remplit la carte Budget validée :
- Grand chiffre = **Balance** (revenus réels − dépenses réelles), signé et coloré.
- Sous-texte : « Revenus réels X € − Dépenses réelles Y € ».
- Barre prévu/réel sur les dépenses + libellé « Prévu X € · Réel Y € (Z %) ».
- Clic → onglet Budget.

## Hors scope (phase 2)

- Multi-devise (tout en €).
- Échéancier / trésorerie dans le temps (juste des totaux).
- Catégories normalisées avec liste fermée (catégories libres pour l'instant).
- Export comptable (le module Admin/comptabilité reste séparé).

## Dépendances

Phase 1 (table `user_projects`, colonnes `project_id` sur `user_invoices` et `user_royalties_manual`, coquille à onglets, cockpit). Indépendante des phases 3 et 4.
