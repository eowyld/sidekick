# Empty States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer deux primitives UI partagées (`EmptyState`, `NoResult`) et les appliquer sur 29 pages-feuilles à travers tous les modules SIDEKICK.

**Architecture:** Deux composants dans `src/components/ui/` calqués sur `PageError` et `PageLoader` existants. Chaque page-feuille remplace son ancien pattern ad-hoc (texte gris inline ou Card avec texte centré) par le composant approprié. Les sous-sections internes et les pickers dans les modales ne sont pas touchés.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Lucide React, `cn()` de `@/lib/utils`

---

## Fichiers créés ou modifiés

**Créés :**
- `src/components/ui/empty-state.tsx`
- `src/components/ui/no-result.tsx`

**Modifiés (par module) :**
- `src/modules/tasks/components/BacklogPanel.tsx`
- `src/modules/tasks/components/AiSuggestions.tsx`
- `src/modules/contacts/components/ContactsPage.tsx`
- `src/modules/calendar/components/GlobalCalendarPage.tsx`
- `src/modules/admin/components/StatutsPage.tsx`
- `src/modules/admin/components/ProceduresPage.tsx`
- `src/modules/admin/components/ContractsPage.tsx`
- `src/modules/live/components/TourDatesPage.tsx`
- `src/modules/live/components/RehearsalsPage.tsx`
- `src/modules/live/components/EquipmentPage.tsx`
- `src/modules/live/components/ProspectionPage.tsx`
- `src/modules/phono/components/CatalogPage.tsx`
- `src/modules/phono/components/SessionsStudioPage.tsx`
- `src/modules/edition/components/WorksPage.tsx`
- `src/modules/edition/components/SyncPage.tsx`
- `src/modules/incomes/components/InvoicesPage.tsx`
- `src/modules/incomes/components/RoyaltiesImports.tsx`
- `src/modules/incomes/components/CopyrightHistorique.tsx`
- `src/modules/incomes/components/IntermittenceMissions.tsx`
- `src/modules/marketing/components/MailingPage.tsx`
- `src/modules/marketing/components/PresskitPage.tsx`
- `src/modules/marketing/components/MarketingCalendar.tsx`
- `src/modules/projects/components/ProjectsPage.tsx`
- `src/modules/projects/components/ArchivesPage.tsx`

---

## Task 1 : Composant `EmptyState`

**Files:**
- Create: `src/components/ui/empty-state.tsx`

- [ ] **Créer le composant**

```tsx
// src/components/ui/empty-state.tsx
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center flex-1 gap-4 py-24 text-center",
        className
      )}
    >
      <Icon size={48} style={{ color: "rgba(245,245,245,0.4)" }} />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium" style={{ color: "rgba(245,245,245,0.9)" }}>
          {title}
        </p>
        <p
          className="text-sm max-w-md"
          style={{ color: "rgba(245,245,245,0.7)" }}
        >
          {description}
        </p>
      </div>
      {action && (
        <Button variant="default" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {secondaryAction && (
        <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
          {secondaryAction.label}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Vérifier le typage**

```bash
npx tsc --noEmit 2>&1 | grep empty-state
```

Résultat attendu : aucune ligne d'erreur.

- [ ] **Commit**

```bash
git add src/components/ui/empty-state.tsx
git commit -m "feat: add EmptyState UI primitive"
```

---

## Task 2 : Composant `NoResult`

**Files:**
- Create: `src/components/ui/no-result.tsx`

- [ ] **Créer le composant**

```tsx
// src/components/ui/no-result.tsx
import { SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NoResultProps {
  query?: string;
  hasFilters?: boolean;
  onReset?: () => void;
  className?: string;
}

function buildMessage(query?: string, hasFilters?: boolean): string {
  if (query && hasFilters) return `Aucun résultat pour « ${query} » avec ces filtres.`;
  if (query) return `Aucun résultat pour « ${query} ».`;
  if (hasFilters) return "Aucun résultat avec ces filtres.";
  return "Aucun résultat.";
}

export function NoResult({ query, hasFilters, onReset, className }: NoResultProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        className
      )}
    >
      <SearchX size={32} style={{ color: "rgba(245,245,245,0.4)" }} />
      <p className="text-sm" style={{ color: "rgba(245,245,245,0.7)" }}>
        {buildMessage(query, hasFilters)}
      </p>
      {onReset && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          Réinitialiser les filtres
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Vérifier le typage**

```bash
npx tsc --noEmit 2>&1 | grep no-result
```

Résultat attendu : aucune ligne d'erreur.

- [ ] **Commit**

```bash
git add src/components/ui/no-result.tsx
git commit -m "feat: add NoResult UI primitive"
```

---

## Task 3 : Tasks — BacklogPanel & AiSuggestions

**Files:**
- Modify: `src/modules/tasks/components/BacklogPanel.tsx`
- Modify: `src/modules/tasks/components/AiSuggestions.tsx`

Repérer dans chaque fichier la condition qui affiche "Aucune tâche" ou équivalent et remplacer par le composant.

- [ ] **Lire BacklogPanel pour localiser l'état vide**

```bash
grep -n "Aucun\|empty\|length === 0\|tasks\.length" src/modules/tasks/components/BacklogPanel.tsx
```

- [ ] **Modifier BacklogPanel**

Ajouter les imports en haut du fichier (après les imports existants) :
```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Inbox } from "lucide-react";
```

Remplacer le bloc d'état vide (texte gris ou vide implicite quand `tasks.length === 0`) par :
```tsx
{tasks.length === 0 ? (
  <EmptyState
    icon={Inbox}
    title="Ton backlog est vide"
    description="Tout ce que tu dois faire sans date précise atterrit ici. Ajoute une tâche pour t'en souvenir plus tard."
    action={{ label: "Ajouter une tâche", onClick: onAddTask }}
  />
) : (
  /* liste existante */
)}
```

> Note : `onAddTask` doit être une prop passée depuis le parent (`TasksPage` ou équivalent). Si elle n'existe pas, vérifier comment le bouton "Ajouter" est déclenché depuis le parent et passer le handler en prop.

- [ ] **Lire AiSuggestions pour localiser l'état vide**

```bash
grep -n "Aucun\|empty\|suggestions\|length" src/modules/tasks/components/AiSuggestions.tsx | head -20
```

- [ ] **Modifier AiSuggestions**

Ajouter les imports :
```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Sparkles } from "lucide-react";
```

Remplacer l'état vide existant par :
```tsx
{suggestions.length === 0 && (
  <EmptyState
    icon={Sparkles}
    title="Pas encore de suggestions"
    description="Ajoute quelques tâches, l'IA te proposera ensuite comment les organiser dans ta semaine."
  />
)}
```

- [ ] **Vérifier le typage**

```bash
npx tsc --noEmit 2>&1 | grep -E "BacklogPanel|AiSuggestions"
```

- [ ] **Vérifier visuellement**

Lancer `npm run dev`, naviguer vers `/tasks`, vider le backlog et vérifier que l'état vide s'affiche correctement.

- [ ] **Commit**

```bash
git add src/modules/tasks/components/BacklogPanel.tsx src/modules/tasks/components/AiSuggestions.tsx
git commit -m "feat: empty states for Tasks (Backlog, AI suggestions)"
```

---

## Task 4 : Contacts

**Files:**
- Modify: `src/modules/contacts/components/ContactsPage.tsx`

- [ ] **Localiser les états vides existants**

```bash
grep -n "Aucun\|length === 0\|contacts\.length\|filteredContacts" src/modules/contacts/components/ContactsPage.tsx
```

- [ ] **Ajouter les imports**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { NoResult } from "@/components/ui/no-result";
import { Users } from "lucide-react";
```

- [ ] **Remplacer l'état vide (aucun contact)**

La condition quand `contacts.length === 0` (liste globale vide, pas de filtre actif) :
```tsx
{contacts.length === 0 ? (
  <EmptyState
    icon={Users}
    title="Ton carnet d'adresses est vide"
    description="Tourneurs, labels, presse, partenaires : regroupe ici tous tes contacts pro."
    action={{ label: "Ajouter un contact", onClick: () => setOpenAdd(true) }}
    secondaryAction={{ label: "Importer depuis un CSV", onClick: () => console.warn("Import CSV : fonctionnalité à venir") }}
  />
) : filteredContacts.length === 0 ? (
  <NoResult
    query={search || undefined}
    hasFilters={roleFilter !== "__all__"}
    onReset={() => { setSearch(""); setRoleFilter("__all__"); }}
  />
) : (
  /* table existante */
)}
```

> Adapter les noms de variables (`search`, `roleFilter`, `setOpenAdd`, etc.) aux noms réels du composant — vérifier avec le grep précédent.

- [ ] **Supprimer l'ancien texte gris** (la `<p>` existante qui faisait office d'état vide).

- [ ] **Vérifier le typage**

```bash
npx tsc --noEmit 2>&1 | grep ContactsPage
```

- [ ] **Test visuel** : naviguer vers `/contacts`, vérifier état vide + recherche sans résultat.

- [ ] **Commit**

```bash
git add src/modules/contacts/components/ContactsPage.tsx
git commit -m "feat: empty states for Contacts"
```

---

## Task 5 : Calendar

**Files:**
- Modify: `src/modules/calendar/components/GlobalCalendarPage.tsx`

- [ ] **Localiser l'état vide**

```bash
grep -n "Aucun\|length === 0\|events\|vide" src/modules/calendar/components/GlobalCalendarPage.tsx | head -20
```

- [ ] **Ajouter les imports**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { NoResult } from "@/components/ui/no-result";
import { Calendar } from "lucide-react";
```

- [ ] **Remplacer l'état vide**

Quand aucun événement et pas de filtre :
```tsx
<EmptyState
  icon={Calendar}
  title="Aucun événement planifié"
  description="Ton agenda regroupe automatiquement tes dates de tournée, répétitions, sorties, et événements que tu ajoutes à la main."
  action={{ label: "Ajouter un événement", onClick: () => setOpenAdd(true) }}
/>
```

Quand filtre actif sans résultat :
```tsx
<NoResult
  hasFilters
  onReset={() => resetFilters()}
/>
```

> Adapter aux noms de variables et handlers réels du composant.

- [ ] **Vérifier le typage**

```bash
npx tsc --noEmit 2>&1 | grep GlobalCalendarPage
```

- [ ] **Commit**

```bash
git add src/modules/calendar/components/GlobalCalendarPage.tsx
git commit -m "feat: empty states for Calendar"
```

---

## Task 6 : Admin — Statuts, Procédures, Contrats

**Files:**
- Modify: `src/modules/admin/components/StatutsPage.tsx`
- Modify: `src/modules/admin/components/ProceduresPage.tsx`
- Modify: `src/modules/admin/components/ContractsPage.tsx`

- [ ] **Localiser les états vides dans les trois fichiers**

```bash
grep -n "Aucun\|length === 0\|vide" src/modules/admin/components/StatutsPage.tsx src/modules/admin/components/ProceduresPage.tsx src/modules/admin/components/ContractsPage.tsx
```

- [ ] **StatutsPage — ajouter les imports et remplacer l'état vide**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { IdCard } from "lucide-react";
```

```tsx
{statuts.length === 0 && (
  <EmptyState
    icon={IdCard}
    title="Ajoute tes statuts"
    description="Intermittent, micro-entreprise, SACEM, SACD… Référence ici tes statuts pour garder une vue claire sur ta situation administrative et les connecter aux différents modules Sidekick."
    action={{ label: "Ajouter un statut", onClick: () => setOpenAdd(true) }}
  />
)}
```

- [ ] **ProceduresPage — ajouter les imports et remplacer l'état vide**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { ListChecks } from "lucide-react";
```

```tsx
{procedures.length === 0 && (
  <EmptyState
    icon={ListChecks}
    title="Aucune procédure enregistrée"
    description="Démarches récurrentes, checklists, process à suivre : garde-les ici pour ne rien oublier."
    action={{ label: "Ajouter une procédure", onClick: () => setOpenAdd(true) }}
  />
)}
```

- [ ] **ContractsPage — ajouter les imports et remplacer l'état vide**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { FileSignature } from "lucide-react";
```

```tsx
{contracts.length === 0 && (
  <EmptyState
    icon={FileSignature}
    title="Aucun contrat pour le moment"
    description="Centralise tes contrats d'édition, de management, de cession, et leurs signatures."
    action={{ label: "Ajouter un contrat", onClick: () => setOpenAdd(true) }}
    secondaryAction={{ label: "Créer à partir d'un template", onClick: () => setOpenTemplate(true) }}
  />
)}
```

> Adapter les noms de handlers réels (vérifier avec le grep).

- [ ] **Vérifier le typage**

```bash
npx tsc --noEmit 2>&1 | grep -E "StatutsPage|ProceduresPage|ContractsPage"
```

- [ ] **Commit**

```bash
git add src/modules/admin/components/StatutsPage.tsx src/modules/admin/components/ProceduresPage.tsx src/modules/admin/components/ContractsPage.tsx
git commit -m "feat: empty states for Admin (Statuts, Procédures, Contrats)"
```

---

## Task 7 : Live — TourDates, Répétitions

**Files:**
- Modify: `src/modules/live/components/TourDatesPage.tsx`
- Modify: `src/modules/live/components/RehearsalsPage.tsx`

- [ ] **Localiser les états vides**

```bash
grep -n "Aucun\|length === 0\|upcomingDates\|pastDates\|rehearsal" src/modules/live/components/TourDatesPage.tsx | head -20
grep -n "Aucun\|length === 0" src/modules/live/components/RehearsalsPage.tsx | head -20
```

- [ ] **TourDatesPage — imports**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { MapPin } from "lucide-react";
```

- [ ] **TourDatesPage — remplacer l'état vide**

L'`EmptyState` global ne s'affiche que si **ni** `upcomingDates` **ni** `pastDates` n'ont de contenu. Les petits textes gris pour chaque section individuelle ("Aucune date à venir", "Aucune date passée") **restent inchangés**.

```tsx
{upcomingDates.length === 0 && pastDates.length === 0 ? (
  <EmptyState
    icon={MapPin}
    title="Aucune date de tournée"
    description="Dates à venir, dates passées, transport, logement, fiche technique, note de frais : tout se gère ici."
    action={{ label: "Ajouter une date", onClick: () => setOpenAdd(true) }}
  />
) : (
  /* sections existantes avec leurs petits textes gris */
)}
```

- [ ] **RehearsalsPage — imports et état vide**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Music2 } from "lucide-react";
```

```tsx
{rehearsals.length === 0 && (
  <EmptyState
    icon={Music2}
    title="Aucune répétition planifiée"
    description="Planifie tes sessions de répétition, les musiciens présents, les morceaux travaillés."
    action={{ label: "Planifier une répétition", onClick: () => setOpenAdd(true) }}
  />
)}
```

- [ ] **Vérifier le typage**

```bash
npx tsc --noEmit 2>&1 | grep -E "TourDatesPage|RehearsalsPage"
```

- [ ] **Commit**

```bash
git add src/modules/live/components/TourDatesPage.tsx src/modules/live/components/RehearsalsPage.tsx
git commit -m "feat: empty states for Live (TourDates, Répétitions)"
```

---

## Task 8 : Live — Matériel & Prospection

**Files:**
- Modify: `src/modules/live/components/EquipmentPage.tsx`
- Modify: `src/modules/live/components/ProspectionPage.tsx`

- [ ] **Localiser les états vides**

```bash
grep -n "Aucun\|length === 0\|inventory\|lists\|prospect" src/modules/live/components/EquipmentPage.tsx | head -20
grep -n "Aucun\|length === 0" src/modules/live/components/ProspectionPage.tsx | head -20
```

- [ ] **EquipmentPage — imports**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Package, ClipboardList } from "lucide-react";
```

- [ ] **EquipmentPage — inventaire vide**

```tsx
{inventory.length === 0 && (
  <EmptyState
    icon={Package}
    title="Ton inventaire est vide"
    description="Référence tout ton matériel (instruments, pédaliers, câbles, backline) pour le retrouver vite."
    action={{ label: "Ajouter du matériel", onClick: () => setOpenAddItem(true) }}
  />
)}
```

- [ ] **EquipmentPage — listes vides**

```tsx
{lists.length === 0 && (
  <EmptyState
    icon={ClipboardList}
    title="Aucune liste de matériel"
    description="Crée des listes pour préparer tes dates et créer tes fiches techniques : tournée été, résidence, plateau solo…"
    action={{ label: "Créer une liste", onClick: () => setOpenAddList(true) }}
  />
)}
```

> `EquipmentPage` a deux sections (inventaire et listes). Chaque section a son propre état vide indépendant. Adapter les noms de variables et handlers.

- [ ] **ProspectionPage — imports et état vide**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Target } from "lucide-react";
```

```tsx
{prospects.length === 0 && (
  <EmptyState
    icon={Target}
    title="Aucune prospection en cours"
    description="Suivi de tes démarches pour décrocher des dates : salles, festivals, tourneurs contactés."
    action={{ label: "Ajouter un prospect", onClick: () => setOpenAdd(true) }}
  />
)}
```

- [ ] **Vérifier le typage**

```bash
npx tsc --noEmit 2>&1 | grep -E "EquipmentPage|ProspectionPage"
```

- [ ] **Commit**

```bash
git add src/modules/live/components/EquipmentPage.tsx src/modules/live/components/ProspectionPage.tsx
git commit -m "feat: empty states for Live (Matériel, Prospection)"
```

---

## Task 9 : Phono — Catalogue (3 tabs)

**Files:**
- Modify: `src/modules/phono/components/CatalogPage.tsx`

- [ ] **Localiser les états vides existants**

```bash
grep -n "Aucun\|length === 0\|tracks\|albums\|podcasts" src/modules/phono/components/CatalogPage.tsx | head -30
```

- [ ] **Ajouter les imports**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Music, Disc3, Mic } from "lucide-react";
```

- [ ] **Tab Titres — remplacer l'état vide page-level**

Le tab Titres affiche actuellement une `<Card>` avec texte centré quand `tracks.length === 0`. La remplacer par :
```tsx
{tracks.length === 0 ? (
  <EmptyState
    icon={Music}
    title="Aucun titre dans ton catalogue"
    description="Recense tous tes titres : masters, versions instrumentales, remixes, featurings. Tu pourras ensuite les rattacher à un album ou EP."
    action={{ label: "Ajouter un titre", onClick: () => setOpenAddTrack(true) }}
  />
) : /* liste + NoResult pour recherche */ (
  filteredTracks.length === 0 ? (
    <NoResult query={trackSearch || undefined} onReset={() => setTrackSearch("")} />
  ) : (
    /* liste de tracks existante */
  )
)}
```

- [ ] **Tab Albums — remplacer l'état vide page-level**

```tsx
{albums.length === 0 ? (
  <EmptyState
    icon={Disc3}
    title="Aucun album ni EP"
    description="Regroupe tes titres en albums ou EP pour organiser ton catalogue et préparer tes sorties."
    action={{ label: "Ajouter un album ou EP", onClick: () => setOpenAddAlbum(true) }}
  />
) : (
  /* liste albums */
)}
```

- [ ] **Tab Podcasts — remplacer l'état vide page-level**

```tsx
{podcasts.length === 0 ? (
  <EmptyState
    icon={Mic}
    title="Aucun podcast"
    description="DJ sets, mixes, émissions : référence ici les podcasts dans lesquels tu apparais ou que tu produis."
    action={{ label: "Ajouter un podcast", onClick: () => setOpenAddPodcast(true) }}
  />
) : (
  /* liste podcasts */
)}
```

- [ ] **Ajouter l'import `NoResult`** si pas encore présent :

```tsx
import { NoResult } from "@/components/ui/no-result";
```

- [ ] **Ne pas toucher** les pickers de tracks dans les modales (liste "Ajouter une track à un album", tracklist podcast) — ils gardent leur petit texte gris existant.

- [ ] **Vérifier le typage**

```bash
npx tsc --noEmit 2>&1 | grep CatalogPage
```

- [ ] **Test visuel** : vérifier les 3 tabs (Titres / Albums / Podcasts) en état vide, puis avec une recherche sans résultat sur Titres.

- [ ] **Commit**

```bash
git add src/modules/phono/components/CatalogPage.tsx
git commit -m "feat: empty states for Phono (Catalogue — Titres, Albums, Podcasts)"
```

---

## Task 10 : Phono — Sessions Studio

**Files:**
- Modify: `src/modules/phono/components/SessionsStudioPage.tsx`

- [ ] **Localiser les états vides**

```bash
grep -n "Aucun\|length === 0\|sessions\|futur\|pass" src/modules/phono/components/SessionsStudioPage.tsx | head -20
```

- [ ] **Ajouter les imports**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { AudioWaveform } from "lucide-react";
```

- [ ] **Remplacer l'état vide global**

L'`EmptyState` s'affiche uniquement si aucune session n'existe (ni future, ni passée). Les petits textes gris par section restent inchangés.

```tsx
{futureSessions.length === 0 && pastSessions.length === 0 ? (
  <EmptyState
    icon={AudioWaveform}
    title="Aucune session studio"
    description="Sessions à venir, sessions passées, studio, intervenants, morceaux enregistrés : garde l'historique de ton activité studio et récupère tes droits voisins."
    action={{ label: "Planifier une session", onClick: () => setOpenAdd(true) }}
  />
) : (
  /* sections futures + passées avec leurs petits textes gris */
)}
```

- [ ] **Vérifier le typage**

```bash
npx tsc --noEmit 2>&1 | grep SessionsStudioPage
```

- [ ] **Commit**

```bash
git add src/modules/phono/components/SessionsStudioPage.tsx
git commit -m "feat: empty states for Phono (Sessions Studio)"
```

---

## Task 11 : Édition — Œuvres & Sync

**Files:**
- Modify: `src/modules/edition/components/WorksPage.tsx`
- Modify: `src/modules/edition/components/SyncPage.tsx`

- [ ] **Localiser les états vides**

```bash
grep -n "Aucun\|length === 0\|works\|sync" src/modules/edition/components/WorksPage.tsx src/modules/edition/components/SyncPage.tsx | head -20
```

- [ ] **WorksPage — imports et état vide**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen } from "lucide-react";
```

```tsx
{works.length === 0 && (
  <EmptyState
    icon={BookOpen}
    title="Aucune œuvre déposée"
    description="Tes œuvres éditoriales (compositions, textes, arrangements) : référence-les ici et suis leurs dépôts SACEM."
    action={{ label: "Ajouter une œuvre", onClick: () => setOpenAdd(true) }}
  />
)}
```

- [ ] **SyncPage — imports et état vide**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Clapperboard } from "lucide-react";
```

```tsx
{syncs.length === 0 && (
  <EmptyState
    icon={Clapperboard}
    title="Aucune sync pour le moment"
    description="Synchronisations audiovisuelles (pub, film, série, jeu) : suis tes placements, leurs contrats et leurs droits."
    action={{ label: "Ajouter une sync", onClick: () => setOpenAdd(true) }}
  />
)}
```

- [ ] **Vérifier le typage**

```bash
npx tsc --noEmit 2>&1 | grep -E "WorksPage|SyncPage"
```

- [ ] **Commit**

```bash
git add src/modules/edition/components/WorksPage.tsx src/modules/edition/components/SyncPage.tsx
git commit -m "feat: empty states for Édition (Œuvres, Sync)"
```

---

## Task 12 : Incomes — Factures, Royalties, Copyright, Intermittence

**Files:**
- Modify: `src/modules/incomes/components/InvoicesPage.tsx`
- Modify: `src/modules/incomes/components/RoyaltiesImports.tsx`
- Modify: `src/modules/incomes/components/CopyrightHistorique.tsx`
- Modify: `src/modules/incomes/components/IntermittenceMissions.tsx`

- [ ] **Localiser les états vides**

```bash
grep -n "Aucun\|length === 0" src/modules/incomes/components/InvoicesPage.tsx src/modules/incomes/components/RoyaltiesImports.tsx src/modules/incomes/components/CopyrightHistorique.tsx src/modules/incomes/components/IntermittenceMissions.tsx
```

- [ ] **InvoicesPage**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Receipt } from "lucide-react";
```

```tsx
{invoices.length === 0 && (
  <EmptyState
    icon={Receipt}
    title="Aucune facture émise"
    description="Émets, suis et archive tes factures : cachets, prestations, royalties. Relances et paiements en un coup d'œil."
    action={{ label: "Créer une facture", onClick: () => setOpenAdd(true) }}
  />
)}
```

- [ ] **RoyaltiesImports**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { FileSpreadsheet } from "lucide-react";
```

```tsx
{imports.length === 0 && (
  <EmptyState
    icon={FileSpreadsheet}
    title="Aucun import de royalties"
    description="Importe tes relevés DSP (Spotify, Apple Music, Deezer…) ou de distributeur en CSV pour suivre tes revenus de streaming."
    action={{ label: "Importer un CSV", onClick: () => setOpenImport(true) }}
  />
)}
```

- [ ] **CopyrightHistorique**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Coins } from "lucide-react";
```

```tsx
{versements.length === 0 && (
  <EmptyState
    icon={Coins}
    title="Aucun versement enregistré"
    description="Historique de tes versements SACEM et autres sociétés de gestion collective : montants, périodes, catégories de droits."
    action={{ label: "Ajouter un versement", onClick: () => setOpenAdd(true) }}
  />
)}
```

- [ ] **IntermittenceMissions**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Briefcase } from "lucide-react";
```

```tsx
{missions.length === 0 && (
  <EmptyState
    icon={Briefcase}
    title="Aucune mission déclarée"
    description="Référence tes missions (concerts, sessions, captations) avec cachet, employeur et AEM : tu gardes la main sur tes heures et ton régime."
    action={{ label: "Ajouter une mission", onClick: () => setOpenAdd(true) }}
  />
)}
```

- [ ] **Vérifier le typage**

```bash
npx tsc --noEmit 2>&1 | grep -E "InvoicesPage|RoyaltiesImports|CopyrightHistorique|IntermittenceMissions"
```

- [ ] **Commit**

```bash
git add src/modules/incomes/components/InvoicesPage.tsx src/modules/incomes/components/RoyaltiesImports.tsx src/modules/incomes/components/CopyrightHistorique.tsx src/modules/incomes/components/IntermittenceMissions.tsx
git commit -m "feat: empty states for Incomes (Factures, Royalties, Copyright, Intermittence)"
```

---

## Task 13 : Marketing — Mailing (Campagnes, Contacts, Segments)

**Files:**
- Modify: `src/modules/marketing/components/MailingPage.tsx`

- [ ] **Localiser les états vides**

```bash
grep -n "Aucun\|length === 0\|campaigns\|contacts\|segments\|tab" src/modules/marketing/components/MailingPage.tsx | head -30
```

- [ ] **Ajouter les imports**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { NoResult } from "@/components/ui/no-result";
import { Send, UsersRound, Filter } from "lucide-react";
```

- [ ] **Tab Campagnes**

```tsx
{campaigns.length === 0 && (
  <EmptyState
    icon={Send}
    title="Aucune campagne"
    description="Crée et envoie des newsletters à ta fanbase : annonces de sortie, dates, actualités."
    action={{ label: "Créer une campagne", onClick: () => setOpenAddCampaign(true) }}
  />
)}
```

- [ ] **Tab Contacts**

```tsx
{mailingContacts.length === 0 ? (
  <EmptyState
    icon={UsersRound}
    title="Aucun contact mailing"
    description="Ajoute les emails de ta fanbase pour pouvoir l'informer de tes sorties et de tes dates."
    action={{ label: "Ajouter un contact", onClick: () => setOpenAddContact(true) }}
    secondaryAction={{ label: "Importer depuis un CSV", onClick: () => console.warn("Import CSV : fonctionnalité à venir") }}
  />
) : filteredMailingContacts.length === 0 ? (
  <NoResult
    query={mailingSearch || undefined}
    onReset={() => setMailingSearch("")}
  />
) : (
  /* liste existante */
)}
```

- [ ] **Tab Segments**

```tsx
{segments.length === 0 && (
  <EmptyState
    icon={Filter}
    title="Aucun segment"
    description="Groupe tes contacts par ville, centre d'intérêt ou source pour cibler tes envois."
    action={{ label: "Créer un segment", onClick: () => setOpenAddSegment(true) }}
  />
)}
```

- [ ] **Vérifier le typage**

```bash
npx tsc --noEmit 2>&1 | grep MailingPage
```

- [ ] **Commit**

```bash
git add src/modules/marketing/components/MailingPage.tsx
git commit -m "feat: empty states for Marketing (Mailing — Campagnes, Contacts, Segments)"
```

---

## Task 14 : Marketing — Presskit & Calendar

**Files:**
- Modify: `src/modules/marketing/components/PresskitPage.tsx`
- Modify: `src/modules/marketing/components/MarketingCalendar.tsx`

- [ ] **Localiser les états vides**

```bash
grep -n "Aucun\|length === 0\|presskit\|configured\|events" src/modules/marketing/components/PresskitPage.tsx src/modules/marketing/components/MarketingCalendar.tsx | head -20
```

- [ ] **PresskitPage — imports et état vide**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Newspaper } from "lucide-react";
```

```tsx
{!presskitConfigured && (
  <EmptyState
    icon={Newspaper}
    title="Ton presskit n'est pas encore configuré"
    description="Bio, photos HD, réseaux, citations presse, liens d'écoute : une page publique à partager avec la presse, les programmateurs, les partenaires."
    action={{ label: "Configurer mon presskit", onClick: () => setOpenConfig(true) }}
  />
)}
```

> Adapter la condition selon comment le composant détecte si le presskit est configuré (profil vide, champ `null`, etc.).

- [ ] **MarketingCalendar — imports et état vide**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarDays } from "lucide-react";
```

```tsx
{events.length === 0 && (
  <EmptyState
    icon={CalendarDays}
    title="Aucun événement marketing"
    description="Planifie tes annonces de sortie, posts réseaux, campagnes presse sur un calendrier éditorial dédié."
    action={{ label: "Ajouter un événement", onClick: () => setOpenAdd(true) }}
  />
)}
```

- [ ] **Vérifier le typage**

```bash
npx tsc --noEmit 2>&1 | grep -E "PresskitPage|MarketingCalendar"
```

- [ ] **Commit**

```bash
git add src/modules/marketing/components/PresskitPage.tsx src/modules/marketing/components/MarketingCalendar.tsx
git commit -m "feat: empty states for Marketing (Presskit, Calendar)"
```

---

## Task 15 : Projects — ProjectsPage & ArchivesPage

**Files:**
- Modify: `src/modules/projects/components/ProjectsPage.tsx`
- Modify: `src/modules/projects/components/ArchivesPage.tsx`

- [ ] **Localiser les états vides**

```bash
grep -n "Aucun\|length === 0\|projects\|archives" src/modules/projects/components/ProjectsPage.tsx src/modules/projects/components/ArchivesPage.tsx | head -20
```

- [ ] **ProjectsPage — imports et état vide**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { FolderKanban } from "lucide-react";
```

```tsx
{projects.length === 0 && (
  <EmptyState
    icon={FolderKanban}
    title="Aucun projet en cours"
    description="Un projet rassemble un album, une tournée, une campagne : fédère les tâches, dates, contacts et documents liés à un même objectif."
    action={{ label: "Créer un projet", onClick: () => setOpenAdd(true) }}
  />
)}
```

- [ ] **ArchivesPage — imports et état vide (sans CTA)**

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Archive } from "lucide-react";
```

```tsx
{archives.length === 0 && (
  <EmptyState
    icon={Archive}
    title="Aucun projet archivé"
    description="Retrouve ici tes projets terminés : albums sortis, tournées passées, campagnes closes."
  />
)}
```

- [ ] **Vérifier le typage**

```bash
npx tsc --noEmit 2>&1 | grep -E "ProjectsPage|ArchivesPage"
```

- [ ] **Commit**

```bash
git add src/modules/projects/components/ProjectsPage.tsx src/modules/projects/components/ArchivesPage.tsx
git commit -m "feat: empty states for Projects (liste, archives)"
```

---

## Task 16 : Vérification finale

- [ ] **TypeScript global**

```bash
npx tsc --noEmit
```

Résultat attendu : 0 erreur (ou uniquement des erreurs pré-existantes non liées à cette itération).

- [ ] **Lancer le serveur dev et parcourir chaque module**

```bash
npm run dev
```

Pour chaque module ci-dessous, vider les données (via Supabase dev ou `npm run reset-data`) et vérifier :
1. État vide → `EmptyState` affiché avec icône, titre, description, CTA
2. Cliquer le CTA → action déclenchée (modale, navigation)
3. Ajouter une entrée → `EmptyState` disparaît
4. Pour les pages avec recherche → saisir une recherche sans résultat → `NoResult` affiché avec bon message

Modules à vérifier : Tasks (Backlog, AI), Contacts, Calendar, Admin (Statuts, Procédures, Contrats), Live (TourDates, Répétitions, Matériel×2, Prospection), Phono (Catalogue×3 tabs, Sessions), Édition (Œuvres, Sync), Incomes (Factures, Royalties, Copyright, Intermittence), Marketing (Mailing×3, Presskit, Calendar), Projects (liste, archives).

- [ ] **Commit final si tout est propre**

```bash
git add -p  # vérifier qu'il ne reste rien de non-commité
git status  # doit être clean
```
