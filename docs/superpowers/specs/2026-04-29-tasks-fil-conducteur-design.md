# Design — Tâches : fil conducteur, code couleur secteur, rituel "Démarrer ma journée"

**Date** : 2026-04-29
**Module** : `src/modules/tasks`
**Statut** : design validé, plan d'implémentation à suivre

## Contexte

Le module Tâches souffre de deux frictions ergonomiques pour un usage d'artiste solo :

1. **Les sous-tâches sont peu lisibles**. Présentées comme une checklist plate, elles ne reflètent pas la nature séquentielle du travail d'artiste (ex : sortir un single = mix → artwork → DDEX → promo, dans cet ordre). On ne sait pas "où on en est" dans la séquence.
2. **Le focus quotidien est passif**. Le panneau "Aujourd'hui" se remplit par auto-promotion silencieuse des tâches en retard ou par drag manuel. Aucun rituel volontaire, aucune intention de journée, et l'info de secteur (Live, Phono, Admin…) n'est même pas visible dans le focus — alors que c'est précisément là où on veut scanner sa journée d'un coup d'œil.

Ce design répond à ces deux frictions sans toucher au data model existant.

## Décisions de design

### 1. Sous-tâches → "Étapes" (fil conducteur)

Renommage sémantique uniquement (UI), pas de changement de data model. Le tableau `subtasks: { id, title, done }[]` continue d'exister, son ordre reste implicite via l'index du tableau.

**Affichage dans la card du panneau "Aujourd'hui" :**

- L'**étape en cours** (la première non-cochée) est affichée en gros, avec un préfixe `▸ ÉTAPE EN COURS` en small-caps, et le titre en couleur foreground primaire.
- Les **étapes suivantes** apparaissent en dessous, repliables sous un caption `↓ Suite (n/total)` où `n` = étapes terminées et `total` = total. Liste d'étapes en `text-xs`, opacity réduite (~50%).
- Les **étapes terminées** (autres que la courante après cochage) sont rayées et muted.
- **Édition** : clic sur le texte d'une étape ouvre un input inline (comportement déjà en place dans `SubtaskEditableRow`). Enter valide, Escape annule, vidage supprime.
- **Réordonnancement** : drag-handle `⋮⋮` à gauche de chaque étape **à venir uniquement** (pas l'étape courante, pas les terminées). Visible au hover sur la card.
- **Cochage de l'étape courante** : son passage à `done` fait remonter automatiquement la suivante en position "ÉTAPE EN COURS" (dérivation, pas de mutation explicite de l'ordre).
- **Auto-complétion de la tâche parente** : quand toutes les étapes sont `done`, la tâche n'est **pas** automatiquement marquée `done`. La card affiche un état visuel discret ("Toutes les étapes sont faites — clique sur ✓ pour clôturer") mais la clôture reste un acte manuel via le bouton ✓ existant.
- **Tâches sans étapes** : aucun changement, la card reste compacte comme aujourd'hui.

**Wording côté modale d'édition** :
- Label `Sous-tâches` → `Étapes`
- Placeholder `Nouvelle sous-tâche...` → `Ajouter une étape...`

### 2. Code couleur secteur dans le panneau "Aujourd'hui"

Aujourd'hui, le badge secteur n'est rendu que pour `context === "backlog"`. On ajoute deux signaux dans le contexte `today` :

- **Bande verticale 4px** plein-hauteur à gauche de la card, dans la couleur du secteur (réutilisation des tokens `border-*-500/30` déjà présents dans `SECTOR_BADGE`).
- **Label secteur en small-caps** au-dessus du titre (`text-[10px] tracking-[0.15em] uppercase`), dans la couleur du secteur.

Aucun badge plein dans le contexte `today` (le badge plein reste réservé au backlog où la liste est plus longue et le scan textuel plus utile).

Une nouvelle map `SECTOR_BAR` (couleur de bordure uniquement, sans bg/text) est ajoutée à côté de `SECTOR_BADGE` dans `TaskCard.tsx`.

### 3. Rituel "Démarrer ma journée"

**Trigger** : panneau "Aujourd'hui" vide ET au moins une tâche dans le backlog.

**Affichage à la place de l'empty state actuel du panneau "Aujourd'hui"** :

- Texte : "Ta journée n'a pas commencé."
- CTA principal : `⚡ Démarrer ma journée` (bouton variant `default`, accent jaune)
- Lien secondaire discret : "ou ajouter une tâche →" (déclenche la modale d'ajout existante)

Si le backlog est vide, on retombe sur l'empty state simple actuel (juste le bouton "Ajouter une tâche", aucun rituel proposé).

**Comportement au clic** : ouverture d'une `Dialog` large (`sm:max-w-2xl`) intitulée "Choisis tes tâches du jour".

**Contenu de la modale** : toutes les tâches du backlog (`status !== "done"` ET `todayFocus === false`), regroupées en sections, chacune introduite par un séparateur titré et un compteur :

1. **EN RETARD** — `deadline < today`
2. **AUJOURD'HUI** — `deadline === today`
3. **CETTE SEMAINE** — `today < deadline <= today + 7j`
4. **BACKLOG** — toutes les autres (sans deadline ou deadline > today + 7j), triées par `createdAt` décroissant

Pour chaque tâche, une row affichant : checkbox + bande couleur secteur + label secteur small-caps + titre + deadline (avec marqueur ⚠ si en retard).

**Pré-cochage** : tâches des sections "EN RETARD" et "AUJOURD'HUI" uniquement.

**Pas de limite de scroll**. La modale gère son propre scroll vertical.

**Footer** : compteur "N tâches sélectionnées" + boutons `Annuler` et `⚡ C'est parti`.

**Validation** : à la confirmation, toutes les tâches cochées passent `todayFocus = true` (un seul `setTasks` batch). La modale ferme. Le panneau "Aujourd'hui" affiche les nouvelles tâches.

**Pas de notion de jour calendaire** : aucun reset automatique à minuit, aucune remise dans le backlog. Les tâches dans "Aujourd'hui" y restent jusqu'à clôture manuelle ou retour au backlog via drag/⚡. Le rituel ne se redéclenche que lorsque "Aujourd'hui" redevient vide.

### 4. Suppression de l'auto-promotion silencieuse

Le `useEffect` `promotedRef` (`Tasks.tsx` lignes 51-64) qui auto-promeut les tâches en retard / dues aujourd'hui à l'ouverture est **supprimé**. Il devient redondant avec le rituel volontaire et son comportement opaque (apparition de tâches dans Today sans intention) va à contre-courant de l'esprit du rituel.

## Architecture

### Fichiers touchés

| Fichier | Changement |
|---|---|
| `src/modules/tasks/components/Tasks.tsx` | Suppression de `promotedRef` + `useEffect` associé. Ajout de l'état d'ouverture du `DayStartDialog`. Branchement du nouveau composant. |
| `src/modules/tasks/components/TodayPanel.tsx` | Empty state enrichi (bouton "Démarrer ma journée" si backlog non vide, sinon empty state actuel). |
| `src/modules/tasks/components/TaskCard.tsx` | Ajout de `SECTOR_BAR`. Refonte du rendu `context === "today"` : bande gauche + label secteur small-caps + bloc "étapes" (étape courante mise en avant + suite repliée + drag-handles). |
| `src/modules/tasks/components/TaskModal.tsx` | Renommage UI "Sous-tâches" → "Étapes". |
| `src/modules/tasks/components/DayStartDialog.tsx` | **Nouveau** — modale du rituel, regroupement par sections, pré-cochage, validation batch. |

### Découpage des composants

- `DayStartDialog` est un nouveau composant indépendant, prend en props `open`, `onClose`, `tasks` (le backlog), `onConfirm(selectedIds: string[])`. Il gère son propre état local (sélection). `Tasks.tsx` lui passe le backlog filtré et reçoit la liste des IDs cochés au confirme.
- Le rendu "étapes" de la card devient un sous-composant `TaskStepsBlock` interne à `TaskCard.tsx` pour garder la card lisible. Il prend en props la tâche et les handlers existants (`onSubtaskToggle`, `onSubtaskRename`, `onSubtaskAdd`, `onSubtaskReorder`).
- `onSubtaskReorder(taskId, fromIndex, toIndex)` est un nouveau handler à ajouter dans `Tasks.tsx`, qui réordonne le tableau `subtasks` via `setTasks`.

### Drag-and-drop des étapes

Réutilisation de `@dnd-kit` déjà importé. Un `SortableContext` interne à `TaskStepsBlock`, restreint aux étapes "à venir" (excluant la courante et les terminées). L'imbrication avec le DnD parent (today ↔ backlog) doit être testée — au besoin, séparer en `DndContext` distinct ou utiliser des `id` namespacés pour éviter les conflits de drop targets.

### Data model

**Aucun changement.** Le tableau `subtasks` existant porte déjà l'ordre. La notion d'"étape en cours" est entièrement dérivée à l'affichage (`subtasks.find(s => !s.done)`).

## Edge cases

- **Tâche sans étape** : rendu compact actuel, pas de bloc "étapes".
- **Tâche avec une seule étape** : on affiche le bloc "ÉTAPE EN COURS" avec le titre en gros, sans la sous-section "Suite". Le compteur `(0/1)` ou `(1/1)` est masqué tant qu'il n'y a pas d'étape "à venir".
- **Toutes les étapes cochées** : la card affiche le message "Toutes les étapes sont faites — clique sur ✓ pour clôturer", pas d'auto-complétion.
- **Backlog vide au moment du rituel** : le bouton "Démarrer ma journée" n'apparaît pas, on garde l'empty state actuel.
- **Tâche du backlog ajoutée pendant que Today contient déjà des éléments** : le bouton ⚡ "Faire aujourd'hui" reste fonctionnel, inchangé. Le rituel ne s'affiche pas tant que Today contient au moins une tâche.
- **Réordonnancement et étape courante** : drag uniquement sur les étapes à venir, donc la position de l'étape courante n'est jamais modifiée par drag. Si l'utilisateur veut promouvoir une étape future en courante, il doit cocher la courante d'abord.

## Tests

Pas de suite de tests automatisés dans le projet. Validation par tests manuels :

- Création d'une tâche avec 4 étapes, vérifier l'ordre et l'étape courante mise en avant.
- Cochage de l'étape courante, vérification que la suivante remonte.
- Drag d'une étape future vers une autre position, vérification de l'ordre persisté.
- Suppression de toutes les tâches du panneau "Aujourd'hui", apparition du bouton "Démarrer ma journée".
- Ouverture du `DayStartDialog`, sélection mixte, validation, vérification du passage en `todayFocus`.
- Vérification visuelle de la bande couleur + label secteur sur les cards Today pour chaque secteur.
- Tâche en retard dans le rituel : vérifier qu'elle est bien dans la section EN RETARD avec le marqueur ⚠ et pré-cochée.
- Backlog vide : vérifier que le bouton "Démarrer ma journée" n'apparaît pas.

## Hors scope

Les éléments suivants ont été évoqués pendant la phase brainstorming et **explicitement exclus** de ce design :

- Limite stricte du nombre de tâches dans "Aujourd'hui" (cap à 3/5).
- Notion d'énergie / moment de la journée (matin admin vs soir création).
- Vue "une seule tâche à la fois" sur le panneau Today (focus monomaniaque).
- Debrief de fin de journée.
- Affichage des étapes dans le backlog.
- Score IA de tri dans le rituel (on garde le tri par deadline, transparent).
- Promotion d'une étape en tâche autonome (ou inversement).
- Échéance par étape (les étapes héritent uniquement de la deadline parente).
