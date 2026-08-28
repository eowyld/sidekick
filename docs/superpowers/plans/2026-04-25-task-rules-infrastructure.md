# Task Rules Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place une couche de règles algorithmiques pour les suggestions de tâches — zéro règles métier pour l'instant, juste l'infrastructure qui rend leur ajout trivial plus tard.

**Architecture:** Fonctions pures dans `src/modules/tasks/rules/` (un fichier par module), exécutées dans `Tasks.tsx` via `useMemo`, résultat passé en contexte au prompt Claude pour éviter les doublons. Les suggestions algo s'affichent immédiatement dans le même bloc que les suggestions IA, sans distinction visuelle.

**Tech Stack:** TypeScript, React `useMemo`, hooks SWR existants (`useLiveData`, `useAdminData`, `useIncomesData`), Next.js API route existante.

---

## Fichiers touchés

| Action | Fichier | Rôle |
|--------|---------|------|
| Créer | `src/modules/tasks/rules/types.ts` | Types `Rule`, `RuleContext`, `RuleSuggestion` |
| Créer | `src/modules/tasks/rules/live.ts` | Règles Live (tableau vide) |
| Créer | `src/modules/tasks/rules/admin.ts` | Règles Admin (tableau vide) |
| Créer | `src/modules/tasks/rules/incomes.ts` | Règles Revenus (tableau vide) |
| Créer | `src/modules/tasks/rules/index.ts` | Agrège tous les tableaux de règles |
| Modifier | `src/modules/tasks/components/Tasks.tsx` | Collecte contexte, exécute règles, passe `ruleSuggestions` |
| Modifier | `src/modules/tasks/components/BacklogPanel.tsx` | Passe `ruleSuggestions` à `AiSuggestions` |
| Modifier | `src/modules/tasks/components/AiSuggestions.tsx` | Affiche les algo immédiatement, les passe au body POST |
| Modifier | `app/api/tasks/ai-suggestions/route.ts` | Injecte les suggestions algo dans le prompt |

---

### Task 1 : Créer les types

**Files:**
- Create: `src/modules/tasks/rules/types.ts`

- [ ] **Step 1 : Créer `types.ts`**

```ts
// src/modules/tasks/rules/types.ts
import type { Todo } from "@/lib/sidekick-store";
import type { TourDate, RehearsalItem } from "@/hooks/useLiveData";
import type { AdminStructure, AdminProcedure } from "@/lib/sidekick-store";
import type { DistributorImport, Invoice } from "@/hooks/useIncomesData";
import type { TaskSector } from "@/modules/tasks/components/TaskModal";

export interface RuleContext {
  tasks: Todo[];
  live: { tourDates: TourDate[]; rehearsals: RehearsalItem[] } | null;
  admin: { structures: AdminStructure[]; procedures: AdminProcedure[] } | null;
  incomes: { invoices: Invoice[]; imports: DistributorImport[] } | null;
}

export interface RuleSuggestion {
  title: string;
  sector: TaskSector;
  reason: string;
  source: "rule";
}

export type Rule = (context: RuleContext) => RuleSuggestion | null;
```

- [ ] **Step 2 : Vérifier les imports — TypeScript ne doit pas se plaindre**

```bash
npx tsc --noEmit 2>&1 | grep "rules/types"
```

Expected : aucune sortie (pas d'erreur sur ce fichier).

- [ ] **Step 3 : Commit**

```bash
git add src/modules/tasks/rules/types.ts
git commit -m "feat(tasks): add Rule, RuleContext, RuleSuggestion types"
```

---

### Task 2 : Créer les fichiers de règles par module

**Files:**
- Create: `src/modules/tasks/rules/live.ts`
- Create: `src/modules/tasks/rules/admin.ts`
- Create: `src/modules/tasks/rules/incomes.ts`
- Create: `src/modules/tasks/rules/index.ts`

- [ ] **Step 1 : Créer `live.ts`**

```ts
// src/modules/tasks/rules/live.ts
import type { Rule } from "./types";

export const liveRules: Rule[] = [
  // Règles à implémenter module par module plus tard.
  // Exemple de forme attendue :
  // (ctx) => {
  //   if (!ctx.live) return null;
  //   const soon = ctx.live.tourDates.find(d => daysUntil(d.date) <= 3);
  //   if (!soon) return null;
  //   return { title: "Vérifier le backline", sector: "Live", reason: `Concert à ${soon.city} dans 3 jours`, source: "rule" };
  // },
];
```

- [ ] **Step 2 : Créer `admin.ts`**

```ts
// src/modules/tasks/rules/admin.ts
import type { Rule } from "./types";

export const adminRules: Rule[] = [
  // Règles à implémenter module par module plus tard.
];
```

- [ ] **Step 3 : Créer `incomes.ts`**

```ts
// src/modules/tasks/rules/incomes.ts
import type { Rule } from "./types";

export const incomesRules: Rule[] = [
  // Règles à implémenter module par module plus tard.
];
```

- [ ] **Step 4 : Créer `index.ts`**

```ts
// src/modules/tasks/rules/index.ts
import { liveRules } from "./live";
import { adminRules } from "./admin";
import { incomesRules } from "./incomes";
import type { Rule } from "./types";

export const allRules: Rule[] = [
  ...liveRules,
  ...adminRules,
  ...incomesRules,
];
```

- [ ] **Step 5 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "rules/"
```

Expected : aucune sortie.

- [ ] **Step 6 : Commit**

```bash
git add src/modules/tasks/rules/
git commit -m "feat(tasks): add rule files per module (empty, ready for implementation)"
```

---

### Task 3 : Exécuter les règles dans `Tasks.tsx`

**Files:**
- Modify: `src/modules/tasks/components/Tasks.tsx`

`Tasks.tsx` appelle déjà `useSidekickData` et `useTasksData`. On ajoute les hooks modules + l'exécution des règles.

- [ ] **Step 1 : Ajouter les imports en haut de `Tasks.tsx`**

Après les imports existants, ajouter :

```ts
import { useLiveData } from "@/hooks/useLiveData";
import { useAdminData } from "@/hooks/useAdminData";
import { useIncomesData } from "@/hooks/useIncomesData";
import { allRules } from "../rules";
import type { RuleContext, RuleSuggestion } from "../rules/types";
```

- [ ] **Step 2 : Appeler les hooks dans le corps du composant `Tasks()`**

Juste après `const { tasks, setTasks, loading, error } = useTasksData();`, ajouter :

```ts
const { tourDates, rehearsals } = useLiveData();
const { structures, procedures } = useAdminData();
const { invoices, imports } = useIncomesData();
```

- [ ] **Step 3 : Construire le contexte et exécuter les règles**

Juste après les `useMemo` existants (`todayTasks`, `backlogTasks`, `doneTasks`), ajouter :

```ts
const ruleSuggestions = useMemo<RuleSuggestion[]>(() => {
  const ctx: RuleContext = {
    tasks,
    live: enabledModules.live !== false ? { tourDates, rehearsals } : null,
    admin: enabledModules.admin !== false ? { structures, procedures } : null,
    incomes: enabledModules.revenus !== false ? { invoices, imports } : null,
  };
  return allRules.map((rule) => rule(ctx)).filter((s): s is RuleSuggestion => s !== null);
}, [tasks, tourDates, rehearsals, structures, procedures, invoices, imports, enabledModules]);
```

Note : ce `useMemo` dépend de `enabledModules` qui est défini après le guard `if (loading)`. Déplacer la ligne `const enabledModules = ...` avant les `useMemo` existants pour éviter l'erreur.

- [ ] **Step 4 : Passer `ruleSuggestions` à `BacklogPanel`**

Trouver le JSX `<BacklogPanel ... />` et ajouter la prop :

```tsx
<BacklogPanel
  // ...props existantes...
  ruleSuggestions={ruleSuggestions}
/>
```

- [ ] **Step 5 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "Tasks\|rules"
```

Expected : erreur sur `BacklogPanel` (prop `ruleSuggestions` pas encore déclarée) — normal, on la corrige dans la tâche suivante.

- [ ] **Step 6 : Commit**

```bash
git add src/modules/tasks/components/Tasks.tsx
git commit -m "feat(tasks): collect rule context and compute ruleSuggestions in Tasks"
```

---

### Task 4 : Propager `ruleSuggestions` dans `BacklogPanel`

**Files:**
- Modify: `src/modules/tasks/components/BacklogPanel.tsx`

- [ ] **Step 1 : Ajouter `ruleSuggestions` aux props de `BacklogPanelProps`**

```ts
import type { RuleSuggestion } from "../rules/types";

interface BacklogPanelProps {
  // ...props existantes...
  ruleSuggestions: RuleSuggestion[];
}
```

- [ ] **Step 2 : Déstructurer et passer à `AiSuggestions`**

Dans la signature de la fonction :
```ts
export function BacklogPanel({
  // ...props existantes...
  ruleSuggestions,
}: BacklogPanelProps) {
```

Dans le JSX `<AiSuggestions ... />`, ajouter :
```tsx
<AiSuggestions
  // ...props existantes...
  ruleSuggestions={ruleSuggestions}
/>
```

- [ ] **Step 3 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "BacklogPanel\|AiSuggestions"
```

Expected : erreur sur `AiSuggestions` (prop pas encore déclarée) — normal.

- [ ] **Step 4 : Commit**

```bash
git add src/modules/tasks/components/BacklogPanel.tsx
git commit -m "feat(tasks): pass ruleSuggestions through BacklogPanel to AiSuggestions"
```

---

### Task 5 : Intégrer les suggestions algo dans `AiSuggestions.tsx`

**Files:**
- Modify: `src/modules/tasks/components/AiSuggestions.tsx`

C'est la pièce centrale : afficher les algo immédiatement, les passer au POST, et fusionner les deux listes.

- [ ] **Step 1 : Ajouter le type et la prop**

```ts
import type { RuleSuggestion } from "../rules/types";

interface AiSuggestionsProps {
  // ...props existantes...
  ruleSuggestions: RuleSuggestion[];
}
```

Déstructurer dans la signature :
```ts
export function AiSuggestions({
  // ...props existantes...
  ruleSuggestions,
}: AiSuggestionsProps) {
```

- [ ] **Step 2 : Passer `ruleSuggestions` dans le body du POST**

Dans `fetchSuggestions`, modifier le `body` envoyé à l'API :

```ts
body: JSON.stringify({
  tasks: activeTasks,
  calendarEvents: upcomingEvents,
  enabledModules: activeModuleNames,
  aiInstructions,
  force,
  ruleSuggestions: ruleSuggestions.map((s) => ({ title: s.title, sector: s.sector })),
}),
```

- [ ] **Step 3 : Fusionner et afficher les deux listes**

Les suggestions algo sont converties en `Suggestion` (même interface) pour l'affichage unifié :

```ts
const algoAsSuggestions: Suggestion[] = ruleSuggestions.map((s) => ({
  title: s.title,
  sector: s.sector,
  reason: s.reason,
}));

// Liste affichée = algo (immédiat) + IA (une fois chargée)
const allSuggestions: Suggestion[] = [...algoAsSuggestions, ...suggestions];
```

Remplacer dans le JSX `suggestions.map(...)` par `allSuggestions.map(...)`.

- [ ] **Step 4 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "AiSuggestions"
```

Expected : aucune sortie.

- [ ] **Step 5 : Vérifier visuellement dans le navigateur**

```bash
npm run dev
```

Ouvrir `/tasks`. Vérifier que :
- Le bloc "Suggestions" s'affiche sans erreur console
- Les règles étant vides pour l'instant, seules les suggestions IA apparaissent (comportement identique à avant)
- Le bouton ↻ fonctionne toujours

- [ ] **Step 6 : Commit**

```bash
git add src/modules/tasks/components/AiSuggestions.tsx
git commit -m "feat(tasks): display rule suggestions immediately, pass them as context to Claude"
```

---

### Task 6 : Injecter les suggestions algo dans le prompt Claude

**Files:**
- Modify: `app/api/tasks/ai-suggestions/route.ts`

- [ ] **Step 1 : Ajouter `ruleSuggestions` au type du body**

```ts
const body = (await req.json()) as {
  tasks: Array<{ title: string; sector: string; status: string }>;
  calendarEvents: Array<{ title: string; date: string }>;
  enabledModules: string[];
  aiInstructions: Record<string, string>;
  force?: boolean;
  ruleSuggestions?: Array<{ title: string; sector: string }>;
};
```

- [ ] **Step 2 : Ajouter la section dans `buildPrompt`**

Dans la signature de `buildPrompt`, ajouter le paramètre :

```ts
function buildPrompt(body: {
  tasks: Array<{ title: string; sector: string; status: string }>;
  calendarEvents: Array<{ title: string; date: string }>;
  enabledModules: string[];
  aiInstructions: Record<string, string>;
  today: string;
  ruleSuggestions?: Array<{ title: string; sector: string }>;
}): string {
```

Dans le corps de `buildPrompt`, ajouter après `instructionLines` :

```ts
const ruleLines =
  body.ruleSuggestions && body.ruleSuggestions.length > 0
    ? body.ruleSuggestions.map((s) => `- "${s.title}" (${s.sector})`).join("\n")
    : null;
```

Dans le template string retourné, ajouter la section avant la dernière instruction :

```ts
${ruleLines ? `\nSuggestions déjà générées automatiquement (ne pas dupliquer) :\n${ruleLines}\n` : ""}
Propose des tâches que l'artiste n'a pas encore et qui ont une vraie valeur ajoutée. Justifie chacune en une phrase courte.`
```

- [ ] **Step 3 : Passer `ruleSuggestions` à `buildPrompt`**

Dans le `POST`, modifier l'appel :

```ts
prompt: buildPrompt({ ...body, today }),
```

Devient :

```ts
prompt: buildPrompt({ ...body, today, ruleSuggestions: body.ruleSuggestions }),
```

- [ ] **Step 4 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "ai-suggestions"
```

Expected : aucune sortie.

- [ ] **Step 5 : Vérifier visuellement**

Ouvrir `/tasks`, forcer un rafraîchissement (bouton ↻). Vérifier que les suggestions IA ne dupliquent pas les algo (comportement vérifié plus tard quand des vraies règles seront ajoutées — pour l'instant, le prompt inclut simplement `"Aucune."` ou une liste vide).

- [ ] **Step 6 : Commit final**

```bash
git add app/api/tasks/ai-suggestions/route.ts
git commit -m "feat(tasks): inject rule suggestions into Claude prompt to avoid duplicates"
```

---

## Comment ajouter une règle plus tard

Pour implémenter une règle métier dans un module, ouvrir le fichier correspondant (ex: `src/modules/tasks/rules/live.ts`) et ajouter une fonction au tableau :

```ts
export const liveRules: Rule[] = [
  (ctx) => {
    if (!ctx.live) return null;
    const today = new Date().toISOString().slice(0, 10);
    const soonConcert = ctx.live.tourDates.find(
      (d) => d.date >= today && daysBetween(today, d.date) <= 3
    );
    if (!soonConcert) return null;
    const alreadyExists = ctx.tasks.some((t) =>
      t.title.toLowerCase().includes("backline")
    );
    if (alreadyExists) return null;
    return {
      title: "Vérifier le backline",
      sector: "Live",
      reason: `Concert à ${soonConcert.city} dans moins de 3 jours`,
      source: "rule",
    };
  },
];
```

Aucun autre fichier à modifier.
