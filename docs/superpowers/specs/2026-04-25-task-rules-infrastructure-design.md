# Task Rules Infrastructure — Design Spec

**Date:** 2026-04-25  
**Scope:** Infrastructure pour suggestions de tâches algorithmiques, intégrée au système IA existant.

---

## Objectif

Mettre en place une couche de règles déterministes (sans IA) qui génère des suggestions de tâches basées sur les données des modules. Ces suggestions s'intègrent dans le bloc `AiSuggestions` existant et sont passées en contexte à Claude pour éviter les doublons.

L'objectif de cette session est l'**infrastructure uniquement** — pas les règles métier par module. Le système doit rendre trivial l'ajout de nouvelles règles plus tard.

---

## Architecture

### Types (`src/modules/tasks/rules/types.ts`)

```ts
interface RuleContext {
  tasks: Todo[];
  live: { tourDates: TourDate[]; rehearsals: Rehearsal[] } | null;
  admin: { structures: Structure[]; procedures: Procedure[] } | null;
  incomes: { invoices: Invoice[]; royaltiesImports: RoyaltiesImport[] } | null;
  // Extensible : ajouter un champ par module au fur et à mesure
}

interface RuleSuggestion {
  title: string;      // < 60 chars
  sector: TaskSector;
  reason: string;     // justification courte
  source: "rule";     // distingue des suggestions IA dans le prompt
}

type Rule = (context: RuleContext) => RuleSuggestion | null;
```

Le champ `source: "rule"` permet d'identifier les suggestions algo sans exposer cette distinction à l'UI.

### Structure de fichiers

```
src/modules/tasks/rules/
  types.ts      ← types Rule, RuleContext, RuleSuggestion
  index.ts      ← agrège toutes les règles
  live.ts       ← règles module Live (vide pour l'instant)
  admin.ts      ← règles module Admin (vide pour l'instant)
  incomes.ts    ← règles module Revenus (vide pour l'instant)
```

Ajouter des règles pour un nouveau module = créer un fichier + une ligne dans `index.ts`. Rien d'autre à toucher.

### Exécution dans `Tasks.tsx`

`Tasks.tsx` appelle les hooks nécessaires, construit le `RuleContext`, et exécute toutes les règles via `useMemo` :

```ts
const ruleContext: RuleContext = {
  tasks,
  live: enabledModules.live ? { tourDates, rehearsals } : null,
  admin: enabledModules.admin ? { structures, procedures } : null,
  incomes: enabledModules.incomes ? { invoices, royaltiesImports } : null,
};

const ruleSuggestions = useMemo(() =>
  allRules.map(rule => rule(ruleContext)).filter(Boolean) as RuleSuggestion[],
  [tasks, tourDates, rehearsals, structures, procedures, invoices, royaltiesImports]
);
```

`useMemo` garantit que les règles ne sont recalculées que si les données changent — zéro coût CPU en navigation normale.

`ruleSuggestions` est passé en prop à `BacklogPanel` → `AiSuggestions`.

### Intégration avec Claude (`/api/tasks/ai-suggestions/route.ts`)

`ruleSuggestions` est envoyé dans le body du POST. Le prompt inclut une section :

```
Suggestions déjà générées automatiquement (ne pas dupliquer) :
- "Vérifier le backline" (Live)
- "Relancer facture #12" (Revenus)

Propose uniquement des tâches complémentaires à celles-ci.
```

Coût token marginal (~50 tokens pour 5 suggestions).

### Affichage dans `AiSuggestions.tsx`

- Les suggestions algo s'affichent **immédiatement** au montant du composant (pas de loading state).
- Les suggestions IA s'ajoutent à la même liste une fois chargées.
- **Aucune distinction visuelle** entre algo et IA — l'utilisateur voit une liste unifiée.
- Le champ `source` est interne uniquement.

---

## Performance

- Les règles sont des comparaisons JavaScript pures en mémoire — aucune requête réseau.
- Les données viennent des hooks SWR déjà en cache (zéro fetch supplémentaire si les modules sont déjà visités).
- Si les modules ne sont pas visités, SWR fetch une fois et met en cache.

---

## Ce qui n'est PAS dans ce spec

- Les règles métier par module (Live, Admin, Revenus…) — ajoutées module par module ultérieurement.
- Migration des données modules non encore migrés vers Supabase.
