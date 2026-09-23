# Live — fiche technique et matériel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un seul bloc Matériel en tête de la fiche technique (listes cochées + ajouts, colonne « à fournir par la salle », quatre catégories), copie d'une fiche, catégories dans le module Matériel, ajout d'un album/EP dans la setlist.

**Architecture:** Deux modules purs (`live-equipment.ts` : catégories, conversion de l'ancienne fiche, résolution du matériel apporté ; `live-model.ts` : types) portent la logique, vérifiés par `scripts/check-live-progress.ts`. L'ancienne fiche est convertie **à la lecture** dans les mappers de `useLiveData` (pas de reprise en masse). Les écrans consomment ces modules. Seule migration SQL : `category` sur l'inventaire.

**Tech Stack:** Next.js 16, React, TypeScript, SWR, Supabase, Tailwind, Radix (`src/components/ui/`), lucide-react, sonner.

**Spec :** `docs/superpowers/specs/2026-09-21-live-fiche-technique-materiel-design.md`

---

## Règles de travail propres à ce dépôt (priment sur le skill)

- **Aucun commit, aucun `git add`, `git push`, `git stash`, `git checkout`, `git restore`, `git reset`** pendant l'exécution (`CLAUDE.md`). L'utilisateur commite lui-même.
- **Ne jamais lancer `supabase db push`**, même en `--dry-run` : le contrôleur s'en charge avec l'utilisateur (des migrations d'un autre chantier sont en attente dans le dépôt).
- **Un autre travail tourne en parallèle sur le dépôt** (autres modules, et parfois les mêmes fichiers : `EventEditPage.tsx` a déjà changé en cours de route). Lire un fichier en entier avant de le modifier, repérer le code **par son contenu et non par son numéro de ligne**, ne rien toucher hors de la tâche.
- **`cn()` ne fusionne pas les classes Tailwind** : pour dimensionner un `Input` / `Select`, mettre la largeur sur un `div` parent, jamais en `className` du primitif.
- **Pas de tiret cadratin (—) dans les textes d'interface.** Les commentaires de code et les titres de PDF ne sont pas concernés.
- **Le compte de captures est le seul compte de la base, avec de vraies données** : ne rien y écrire sans consigne explicite du contrôleur.
- Vérification : `npx tsc --noEmit` (doit ne rien afficher, sauf indication contraire d'une tâche), `npx eslint <fichiers>`, `npx --yes tsx scripts/check-live-progress.ts`.

## Carte des fichiers

| Fichier | Rôle | Tâche |
|---|---|---|
| `src/modules/live/components/shared/SetlistEditor.tsx` | album / EP, libellé | 1 |
| `src/modules/live/lib/live-model.ts` | types `EquipmentCategory`, `SheetItem`, `TechnicalSheet` | 2, 4 |
| `src/modules/live/lib/live-equipment.ts` | catégories, conversion, résolution | 2, 4 |
| `supabase/migrations/20260921220000_live_equipment_category.sql` | colonne `category` | 2 |
| `src/hooks/useLiveData.ts` | catégorie d'inventaire ; conversion à la lecture | 2, 4 |
| `src/modules/live/components/EquipmentPage.tsx` | module Matériel trié par catégorie | 3 |
| `src/modules/live/lib/live-pdf.ts`, `live-progress.ts`, `scripts/check-live-progress.ts`, `src/lib/demo-seed-data.ts` | consommateurs de la fiche | 4 |
| `src/modules/live/components/shared/EquipmentBlock.tsx` | bloc Matériel | 5 |
| `src/modules/live/components/shared/CopyTechnicalDialog.tsx` | copie d'une fiche | 5 |
| `src/modules/live/components/shared/TechnicalEditor.tsx` | fiche technique (réécrit) | 5 |
| `src/modules/live/components/shared/EquipmentChecklist.tsx` | checklist des dates | 5 |
| `src/modules/live/components/shared/EquipmentPicker.tsx` | ancien sélecteur | 5 (supprimé) |
| `ProductionEditPage.tsx`, `EventEditPage.tsx` | branchement | 5 |
| `ALPHA.md` | avancement | 6 |

---

### Task 1: Setlist, sélecteur d'album / EP et libellé

**Files:**
- Modify: `src/modules/live/components/shared/SetlistEditor.tsx`

- [ ] **Step 1: Imports**

Ajouter, sous les imports existants :

```ts
import { toast } from "sonner";
import type { Track } from "@/lib/sidekick-store";
```

- [ ] **Step 2: État, options et action**

Dans `SetlistEditor`, remplacer `const { tracks, error } = usePhonoData();` par :

```ts
    const { tracks, albums, error } = usePhonoData();
```

et, après la ligne `const [source, setSource] = useState("");`, ajouter :

```ts
    const [albumId, setAlbumId] = useState("");
    const albumOptions = albums.filter(a => a.type === "album" || a.type === "ep").map(a => ({ value: a.id, label: `${a.title} · ${a.type === "ep" ? "EP" : "Album"}` }));
    const addAlbum = () => {
        const album = albums.find(a => a.id === albumId);
        if (!album)
            return;
        const present = new Set(value.map(t => t.trackId).filter(Boolean));
        const found = album.trackIds.map(id => tracks.find(t => t.id === id)).filter((t): t is Track => !!t);
        if (!found.length) {
            toast.error("Cet album ne contient encore aucun titre.");
            return;
        }
        const fresh = found.filter(t => !present.has(t.id));
        onChange([...value, ...fresh.map(t => ({ id: crypto.randomUUID(), title: t.title, artist: t.mainArtist, duration: "", note: "", trackId: t.id }))]);
        setAlbumId("");
        const skipped = found.length - fresh.length;
        toast.success(`${fresh.length} titre${fresh.length > 1 ? "s" : ""} ajouté${fresh.length > 1 ? "s" : ""}${skipped ? `, ${skipped} déjà présent${skipped > 1 ? "s" : ""}` : ""}`);
    };
```

- [ ] **Step 2b: Libellé**

Dans le `Choice` « Ajouter à la setlist », remplacer `placeholder="Morceau libre / reprise"` par `placeholder="Morceau libre / nouveau titre"`.

- [ ] **Step 3: Le sélecteur d'album**

Juste après le `</div>` qui ferme le bloc `<div className="mb-4 flex items-end gap-2">` du choix de morceau (celui qui contient le bouton « Ajouter »), ajouter :

```tsx
    {albumOptions.length > 0 && <div className="mb-4 flex items-end gap-2">
    <div className="flex-1">
    <Choice label="Ajouter un album ou un EP" value={albumId} onChange={setAlbumId} placeholder="Choisir un album ou un EP" options={albumOptions}/>
    </div>
    <Button size="sm" variant="secondary" disabled={!albumId} onClick={addAlbum}><Plus size={14} className="mr-1"/>Ajouter l’album</Button>
    </div>}
```

- [ ] **Step 4: Point de contrôle**

Run: `npx tsc --noEmit` → aucune sortie. Run: `npx eslint src/modules/live/components/shared/SetlistEditor.tsx` → aucune sortie.

---

### Task 2: Catégories de matériel : types, aides, migration SQL, hook

**Files:**
- Modify: `src/modules/live/lib/live-model.ts`
- Create: `src/modules/live/lib/live-equipment.ts`
- Create: `supabase/migrations/20260921220000_live_equipment_category.sql`
- Modify: `src/hooks/useLiveData.ts`
- Modify: `src/modules/live/components/EquipmentPage.tsx` (une seule ligne, pour garder `tsc` vert)

- [ ] **Step 1: Types dans `live-model.ts`**

Ajouter, juste avant `export type TechnicalSheet = {` :

```ts
export type EquipmentCategory = "sound" | "light" | "stage" | "other";
/** L'ordre est celui de l'affichage, et de tri partout où du matériel est listé. */
export const EQUIPMENT_CATEGORIES: readonly (readonly [
    EquipmentCategory,
    string
])[] = [["sound", "Son"], ["light", "Lumière"], ["stage", "Scène et implantation"], ["other", "Autre matériel"]];
```

- [ ] **Step 2: Créer `live-equipment.ts`**

```ts
import { EQUIPMENT_CATEGORIES, type EquipmentCategory } from "./live-model";

export const categoryLabel = (category: EquipmentCategory): string => EQUIPMENT_CATEGORIES.find(([key]) => key === category)?.[1] ?? "Autre matériel";

export function categoryRank(category: EquipmentCategory): number {
    const index = EQUIPMENT_CATEGORIES.findIndex(([key]) => key === category);
    return index < 0 ? EQUIPMENT_CATEGORIES.length : index;
}

/** Toute valeur inconnue (ligne d'avant la colonne, donnée corrompue) retombe sur « Autre matériel ». */
export function normalizeCategory(value: unknown): EquipmentCategory {
    return EQUIPMENT_CATEGORIES.some(([key]) => key === value) ? value as EquipmentCategory : "other";
}

/** Ordre du module Matériel : par catégorie, puis par nom. */
export function compareByCategory<T extends { category: EquipmentCategory; name: string }>(a: T, b: T): number {
    return categoryRank(a.category) - categoryRank(b.category) || a.name.localeCompare(b.name, "fr");
}
```

- [ ] **Step 3: La migration**

`supabase/migrations/20260921220000_live_equipment_category.sql` :

```sql
-- Live : chaque matériel de l'inventaire a une catégorie (Son, Lumière, Scène et
-- implantation, Autre). Les lignes existantes passent en « other » : l'artiste les
-- reclasse depuis le module Matériel. Le `check` est posé avec la colonne, donc la
-- migration reste rejouable (la colonne existe déjà = rien ne se passe).
alter table public.user_equipment_inventory
  add column if not exists category text not null default 'other'
  check (category in ('sound', 'light', 'stage', 'other'));
```

- [ ] **Step 4: Le hook**

Dans `src/hooks/useLiveData.ts` :

1. Compléter l'import de types de `live-model` : `import type { EquipmentCategory, LiveDetails, LiveProduction } from "@/modules/live/lib/live-model";` et ajouter `import { normalizeCategory } from "@/modules/live/lib/live-equipment";`.
2. Dans `EquipmentInventoryItem`, ajouter après `condition: string;` :

```ts
  category: EquipmentCategory;
```

3. Dans `inventoryItemToRow`, ajouter après `condition: item.condition,` :

```ts
    category: item.category,
```

4. Dans `rowToInventoryItem`, ajouter après la ligne `condition: (...) ?? String(row.condition),` :

```ts
    category: normalizeCategory(row.category),
```

- [ ] **Step 5: Garder `tsc` vert**

Dans `EquipmentPage.tsx`, le bouton « Ajouter du matériel » crée un matériel : `setItem({ id: crypto.randomUUID(), name: "", quantity: 1, condition: "Bon", comment: "" })`. Ajouter `category: "other"` :

```ts
setItem({ id: crypto.randomUUID(), name: "", quantity: 1, condition: "Bon", category: "other", comment: "" })
```

- [ ] **Step 6: Point de contrôle**

Run: `npx tsc --noEmit` → aucune sortie.

---

### Task 3: Module Matériel : catégorie à la création, inventaire et listes ordonnés

**Files:**
- Modify: `src/modules/live/components/EquipmentPage.tsx`

Lire le fichier en entier d'abord (il est en un seul bloc, dense). Les repères sont donnés par contenu.

- [ ] **Step 1: Imports**

- `import { useState } from "react";` devient `import { Fragment, useState } from "react";`.
- Ajouter : `import { EQUIPMENT_CATEGORIES } from "../lib/live-model";` et `import { compareByCategory, normalizeCategory } from "../lib/live-equipment";`.

- [ ] **Step 2: Inventaire trié**

Remplacer la ligne :

```ts
    const shown = inventory.filter(i => i.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (!condition || i.condition === condition));
```

par :

```ts
    const shown = inventory.filter(i => i.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (!condition || i.condition === condition)).sort(compareByCategory);
```

- [ ] **Step 3: Tableau regroupé par catégorie**

Dans le `<tbody>` du tableau de l'inventaire, l'expression `{shown.map(i => <tr key={i.id} className="border-t …">…</tr>)}` est remplacée par une boucle sur les catégories qui **garde le contenu de la ligne `<tr>` à l'identique** et ajoute une ligne d'en-tête par catégorie non vide :

```tsx
            {EQUIPMENT_CATEGORIES.map(([cat, label]) => {
                const rows = shown.filter(i => i.category === cat);
                if (!rows.length)
                    return null;
                return <Fragment key={cat}>
                <tr className="border-t border-[#F5F5F5]/[.06] bg-[#F5F5F5]/[.04]">
                <td colSpan={5} className="px-5 py-2 text-[10px] font-semibold uppercase tracking-widest text-[#F5F5F5]/50">
                {label}
                <span className="ml-2 opacity-60">{rows.length}</span>
                </td>
                </tr>
                {rows.map(i => /* la <tr key={i.id} …> existante, inchangée */)}
                </Fragment>;
            })}
```

(le commentaire `/* … */` est à remplacer par la `<tr key={i.id} …>…</tr>` existante, telle quelle.)

- [ ] **Step 4: Chips des listes**

Dans la carte d'une liste, remplacer `inventory.filter(i => l.itemIds.includes(i.id)).map(i => <span key={i.id} …` par `inventory.filter(i => l.itemIds.includes(i.id)).sort(compareByCategory).map(i => <span key={i.id} …` (le reste inchangé).

- [ ] **Step 5: Fenêtre de création d'un matériel**

Dans la fenêtre « Ajouter / Modifier le matériel », juste **avant** la `<div className="grid grid-cols-2 gap-4">` qui contient Quantité et État, ajouter :

```tsx
        <Choice label="Catégorie" value={item.category} onChange={category => setItem({ ...item, category: normalizeCategory(category) })} options={EQUIPMENT_CATEGORIES.map(([value, label]) => ({ value, label }))}/>
```

- [ ] **Step 6: Fenêtre d'une liste, cases regroupées**

Dans la fenêtre « Liste de matériel », remplacer `{inventory.map(i => <label key={i.id} className="flex cursor-pointer items-center gap-3 px-1 py-2 text-sm"> … </label>)}` par le même `<label>` **inchangé**, rangé par catégorie avec un titre :

```tsx
            {EQUIPMENT_CATEGORIES.map(([cat, label]) => {
                const rows = inventory.filter(i => i.category === cat).sort(compareByCategory);
                if (!rows.length)
                    return null;
                return <div key={cat}>
                <p className="px-1 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-[#F5F5F5]/40">{label}</p>
                {rows.map(i => /* le <label key={i.id} …> existant, inchangé */)}
                </div>;
            })}
```

Le message `{!inventory.length && <p …>Ajoute d’abord du matériel à ton inventaire.</p>}` reste après.

- [ ] **Step 7: Point de contrôle**

Run: `npx tsc --noEmit` → aucune sortie. Run: `npx eslint src/modules/live/components/EquipmentPage.tsx` → aucune sortie.

---

### Task 4: Nouvelle fiche technique : modèle et consommateurs (hors interface)

**Files:**
- Modify: `src/modules/live/lib/live-model.ts`
- Modify: `src/modules/live/lib/live-equipment.ts`
- Modify: `src/hooks/useLiveData.ts`
- Modify: `src/modules/live/lib/live-pdf.ts`
- Modify: `src/modules/live/lib/live-progress.ts`
- Modify: `scripts/check-live-progress.ts`
- Modify: `src/lib/demo-seed-data.ts`

> **`tsc` sera rouge à la fin de cette tâche, et seulement dans trois fichiers** : `src/modules/live/components/shared/TechnicalEditor.tsx`, `ProductionEditPage.tsx`, `EventEditPage.tsx` (ils sont réécrits à la tâche 5). Toute erreur ailleurs est un défaut de cette tâche.

- [ ] **Step 1: Les types dans `live-model.ts`**

Remplacer le type `TechnicalSheet` existant (les sept champs `team`, `stage`, `sound`, `lights`, `supplied`, `provided`, `contact`) par :

```ts
/** Un élément de matériel dans une fiche technique. `itemId` renvoie à l'inventaire quand l'ajout en vient ; nom, quantité et catégorie sont des copies faites à l'ajout. */
export type SheetItem = {
    id: string;
    name: string;
    quantity: number;
    category: EquipmentCategory;
    itemId?: string;
};
export type TechnicalSheet = {
    contact: string;
    team: string;
    /** « Détails » de chaque catégorie. */
    details: Record<EquipmentCategory, string>;
    /** Matériel apporté EN PLUS des listes cochées (`equipmentListIds`). */
    brought: SheetItem[];
    /** Matériel à fournir par la salle. */
    venue: SheetItem[];
};
```

Remplacer `emptyTechnical` par :

```ts
export const emptyTechnical = (): TechnicalSheet => ({ contact: "", team: "", details: { sound: "", light: "", stage: "", other: "" }, brought: [], venue: [] });
```

Supprimer entièrement `TECHNICAL_FIELDS` (la constante en fin de fichier).

- [ ] **Step 2: Compléter `live-equipment.ts`**

Remplacer la première ligne d'import par :

```ts
import type { EquipmentInventoryItem, EquipmentList } from "@/hooks/useLiveData";
import { EQUIPMENT_CATEGORIES, type EquipmentCategory, type SheetItem, type TechnicalSheet } from "./live-model";
```

et ajouter à la fin du fichier :

```ts
export const DETAIL_PLACEHOLDER: Record<EquipmentCategory, string> = {
    sound: "Entrées, micros, DI, retours, régie ou configuration DJ",
    light: "Ambiances, conduite, besoins spécifiques",
    stage: "Dimensions, disposition, alimentation électrique",
    other: "Tout ce qui ne rentre pas dans les autres catégories",
};

const text = (value: unknown): string => typeof value === "string" ? value : "";

/** Ancien format : une ligne de texte = un élément. Identifiants déterministes, pour ne pas changer d'un chargement à l'autre. */
const linesToItems = (raw: unknown, prefix: string): SheetItem[] => text(raw).split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((name, index) => ({ id: `${prefix}-${index}`, name, quantity: 1, category: "other" as const }));

function cleanItems(raw: unknown[]): SheetItem[] {
    return raw.flatMap((entry, index) => {
        const r = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
        const name = text(r.name).trim();
        if (!name)
            return [];
        const quantity = Number(r.quantity);
        return [{ id: text(r.id) || `item-${index}`, name, quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 1, category: normalizeCategory(r.category), ...(text(r.itemId) ? { itemId: text(r.itemId) } : {}) }];
    });
}

/**
 * Lit une fiche technique, quelle que soit sa forme. Une fiche de l'ancienne forme
 * (textes `stage`, `sound`, `lights`, `supplied`, `provided`) est convertie ; la
 * nouvelle forme est écrite au prochain enregistrement. Une fiche déjà à la nouvelle
 * forme n'est jamais reconvertie.
 */
export function normalizeTechnical(raw: unknown): TechnicalSheet {
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const d = (r.details && typeof r.details === "object" ? r.details : null) as Record<string, unknown> | null;
    return {
        contact: text(r.contact),
        team: text(r.team),
        details: d ? { sound: text(d.sound), light: text(d.light), stage: text(d.stage), other: text(d.other) } : { sound: text(r.sound), light: text(r.lights), stage: text(r.stage), other: "" },
        brought: Array.isArray(r.brought) ? cleanItems(r.brought) : linesToItems(r.supplied, "legacy-brought"),
        venue: Array.isArray(r.venue) ? cleanItems(r.venue) : linesToItems(r.provided, "legacy-venue"),
    };
}

export const cloneTechnical = (sheet: TechnicalSheet): TechnicalSheet => structuredClone(sheet);

/** Une fiche sans rien : ni contact, ni équipe, ni liste, ni ligne, ni détail. */
export function technicalIsEmpty(sheet: TechnicalSheet, listIds: string[] = []): boolean {
    return !sheet.contact.trim() && !sheet.team.trim() && !listIds.length && !sheet.brought.length && !sheet.venue.length && Object.values(sheet.details).every(v => !v.trim());
}

export type BroughtLine = {
    /** Identifiant de l'inventaire, ou de la ligne libre : c'est la clé de `equipmentChecked`. */
    key: string;
    name: string;
    quantity: number;
    category: EquipmentCategory;
    /** Nom de la liste d'où vient l'élément ; absent pour un ajout. */
    listName?: string;
    needsRepair?: boolean;
};

/**
 * Tout le matériel apporté : éléments des listes cochées, puis ajouts. Un ajout
 * tiré de l'inventaire ne double pas la ligne d'une liste qui le contient déjà.
 * Rangé par catégorie, puis par nom.
 */
export function resolveBrought(sheet: TechnicalSheet, listIds: string[], lists: EquipmentList[], inventory: EquipmentInventoryItem[]): BroughtLine[] {
    const lines = new Map<string, BroughtLine>();
    for (const listId of listIds) {
        const list = lists.find(l => l.id === listId);
        if (!list)
            continue;
        for (const itemId of list.itemIds) {
            const item = inventory.find(i => i.id === itemId);
            if (item && !lines.has(item.id))
                lines.set(item.id, { key: item.id, name: item.name, quantity: item.quantity, category: item.category, listName: list.name, needsRepair: item.condition === "A réparer" });
        }
    }
    for (const extra of sheet.brought) {
        const key = extra.itemId ?? extra.id;
        if (!lines.has(key))
            lines.set(key, { key, name: extra.name, quantity: extra.quantity, category: extra.category });
    }
    return [...lines.values()].sort((a, b) => categoryRank(a.category) - categoryRank(b.category) || a.name.localeCompare(b.name, "fr"));
}
```

(`EQUIPMENT_CATEGORIES` reste importé et utilisé par `categoryLabel` / `categoryRank` / `normalizeCategory` plus haut.)

- [ ] **Step 3: Conversion à la lecture dans `useLiveData.ts`**

1. Ajouter à l'import de `live-equipment` : `import { normalizeCategory, normalizeTechnical } from "@/modules/live/lib/live-equipment";`.
2. Ajouter, près des autres fonctions utilitaires de mappers (au-dessus de `tourDateToRow`) :

```ts
/** Les `details` d'un événement : sa fiche technique, si elle en a une, est lue quelle que soit sa forme. */
function normalizeDetails(raw: unknown): LiveDetails {
  const details = ((raw as LiveDetails | null) ?? {}) as LiveDetails;
  return details.technical ? { ...details, technical: normalizeTechnical(details.technical) } : details;
}
```

3. Dans `rowToTourDate` **et** dans `rowToRehearsal`, remplacer `details: (row.details as LiveDetails) ?? {},` par `details: normalizeDetails(row.details),`.
4. Dans `fetchLiveData`, la ligne `productions: productions.error ? [] : (productions.data ?? []).map(row => ({ … technical: emptyTechnical(), ...row.data, id: row.id, title: row.title, kind: row.kind } as LiveProduction)),` devient : retirer `technical: emptyTechnical(), ` des valeurs par défaut et ajouter `technical: normalizeTechnical(row.data?.technical)` **après** `kind: row.kind` (sinon `...row.data` réécrirait la fiche convertie). Si `emptyTechnical` n'est plus utilisé nulle part dans le fichier, retirer son import.

- [ ] **Step 4: PDF**

Dans `live-pdf.ts` : l'import `import { TECHNICAL_FIELDS, setlistDuration, type TechnicalSheet, type SetlistTrack } from "./live-model";` devient

```ts
import { EQUIPMENT_CATEGORIES, setlistDuration, type TechnicalSheet, type SetlistTrack } from "./live-model";
import type { BroughtLine } from "./live-equipment";
```

et la fonction `technicalSections` (une ligne) est remplacée par :

```ts
export function technicalSections(value: TechnicalSheet, brought: BroughtLine[]): DocumentSection[] {
    const line = (quantity: number, name: string) => `${quantity} × ${name}`;
    const sections: DocumentSection[] = [{ title: "Contact technique", lines: [value.contact || "Non renseigné"] }, { title: "Équipe sur scène", lines: [value.team || "Non renseigné"] }];
    for (const [category, label] of EQUIPMENT_CATEGORIES) {
        const mine = brought.filter(b => b.category === category);
        const theirs = value.venue.filter(v => v.category === category);
        const details = value.details[category].trim();
        if (mine.length)
            sections.push({ title: `${label} : apporté`, lines: mine.map(b => line(b.quantity, b.name)) });
        if (theirs.length)
            sections.push({ title: `${label} : à fournir par la salle`, lines: theirs.map(v => line(v.quantity, v.name)) });
        if (details)
            sections.push({ title: `${label} : détails`, lines: [details] });
    }
    if (sections.length === 2)
        sections.push({ title: "Matériel", lines: ["Non renseigné"] });
    return sections;
}
```

- [ ] **Step 5: Étapes calculées**

Dans `live-progress.ts`, remplacer le corps de `showVerdicts` : les lignes `const contact = …; const sound = …;` et les entrées `equipment` et `technical` du `return` par :

```ts
    const sheet = show.technical;
    const contact = (sheet?.contact ?? "").trim();
    const hasBrought = show.equipmentListIds.length > 0 || (sheet?.brought?.length ?? 0) > 0;
    const hasAnything = hasBrought || (sheet?.venue?.length ?? 0) > 0 || Object.values<string>(sheet?.details ?? {}).some(v => v.trim());
```

et dans le `return` :

```ts
        equipment: verdict(hasBrought, [{ label: "Aucun matériel apporté renseigné" }]),
```

```ts
        technical: verdict(!!contact && hasAnything, [...(contact ? [] : [{ label: "Contact technique à renseigner" }]), ...(hasAnything ? [] : [{ label: "Matériel ou détails à renseigner" }])]),
```

(les entrées `setlist` et `rehearsal` ne changent pas).

- [ ] **Step 6: Le script de règles (test d'abord)**

Dans `scripts/check-live-progress.ts` :

1. Ajouter à l'import de `live-links` une ligne :

```ts
import { compareByCategory, normalizeCategory, normalizeTechnical, resolveBrought } from "../src/modules/live/lib/live-equipment";
import type { EquipmentInventoryItem, EquipmentList } from "../src/hooks/useLiveData";
```

2. Remplacer la ligne `const full: LiveProduction = { … technical: { ...emptyTechnical(), contact: "Régie", sound: "2 DI" } };` par :

```ts
const full: LiveProduction = { ...show, setlist: [{ id: "a", title: "A", artist: "", duration: "3:00", note: "" }], equipmentListIds: ["kit"], technical: { ...emptyTechnical(), contact: "Régie", venue: [{ id: "v1", name: "Retours", quantity: 2, category: "sound" }] } };
```

3. Après le bloc « Spectacle : quatre étapes calculées… » (avant « Rattachements à reprendre »), ajouter :

```ts
// Matériel préparé : une liste cochée OU un ajout suffit ; rien = à faire.
const brought = { ...emptyTechnical(), brought: [{ id: "b", name: "Guitare", quantity: 1, category: "other" as const }] };
assert.equal(step({ ...full, equipmentListIds: [], technical: brought }, ctx([]), "equipment").state, "done");
assert.equal(step({ ...full, equipmentListIds: [], technical: emptyTechnical() }, ctx([]), "equipment").state, "todo");
// Fiche technique prête : le contact ET quelque chose (matériel ou détail).
const contactOnly = { ...emptyTechnical(), contact: "Régie" };
assert.equal(step({ ...full, equipmentListIds: [], technical: contactOnly }, ctx([]), "technical").state, "todo");
assert.deepEqual(step({ ...full, equipmentListIds: [], technical: contactOnly }, ctx([]), "technical").blockers.map(b => b.label), ["Matériel ou détails à renseigner"]);
assert.equal(step({ ...full, equipmentListIds: [], technical: { ...contactOnly, details: { ...emptyTechnical().details, stage: "5 x 4 m" } } }, ctx([]), "technical").state, "done");
assert.equal(step({ ...full, technical: { ...emptyTechnical(), details: { ...emptyTechnical().details, sound: "2 DI" } } }, ctx([]), "technical").state, "todo");

// Ancienne fiche convertie à la lecture : textes conservés, lignes en éléments.
const legacy = normalizeTechnical({ contact: "C", team: "T", stage: "5x4 m", sound: "2 DI", lights: "Ambiance", supplied: "Guitare\nPédalier", provided: "Diffusion" });
assert.deepEqual(legacy.details, { sound: "2 DI", light: "Ambiance", stage: "5x4 m", other: "" });
assert.deepEqual(legacy.brought.map(i => i.name), ["Guitare", "Pédalier"]);
assert.equal(legacy.brought[0].category, "other");
assert.equal(legacy.venue[0].id, "legacy-venue-0");
assert.deepEqual(normalizeTechnical(legacy), legacy, "la conversion doit être idempotente");
assert.equal(normalizeTechnical({ ...legacy, supplied: "Ignoré" }).brought.length, 2, "une fiche déjà à la nouvelle forme n'est pas reconvertie");
assert.deepEqual(normalizeTechnical(undefined), emptyTechnical());
assert.equal(normalizeCategory("n'importe quoi"), "other");

// Matériel apporté : listes cochées d'abord, ajout doublon ignoré, rangé par catégorie puis par nom.
const inventory = [{ id: "i1", name: "Micro", quantity: 2, condition: "Bon", category: "sound" }, { id: "i2", name: "Projecteur", quantity: 1, condition: "A réparer", category: "light" }] as EquipmentInventoryItem[];
const lists = [{ id: "L", name: "Kit", description: "", itemIds: ["i2", "i1"] }] as EquipmentList[];
const resolved = resolveBrought({ ...emptyTechnical(), brought: [{ id: "x", name: "Câble", quantity: 3, category: "other" }, { id: "y", itemId: "i1", name: "Micro", quantity: 2, category: "sound" }] }, ["L"], lists, inventory);
assert.deepEqual(resolved.map(l => l.name), ["Micro", "Projecteur", "Câble"]);
assert.equal(resolved[0].listName, "Kit");
assert.equal(resolved[1].needsRepair, true);
assert.equal(resolved.length, 3);
assert.ok(compareByCategory({ category: "sound", name: "Z" }, { category: "light", name: "A" }) < 0);
```

4. Lancer d'abord `npx --yes tsx scripts/check-live-progress.ts` **avant** les Steps 1 à 5 si l'ordre le permet (il doit échouer), puis après : `✓ live-progress / live-links : toutes les règles tiennent`.

- [ ] **Step 7: Données de démo**

Dans `src/lib/demo-seed-data.ts`, remplacer la constante `technical` (ligne `const technical = { ...emptyTechnical(), team: …, provided: "Diffusion, micros et retours" };`) par :

```ts
    const technical = {
      ...emptyTechnical(),
      team: "Chant, guitare, claviers / machines",
      contact: "Contact régie à confirmer",
      details: { sound: "2 micros voix, 2 DI stéréo, 2 retours de scène", light: "", stage: "Espace 5 × 4 m minimum", other: "" },
      brought: [{ id: "demo-brought-1", name: "Machines et pédalier", quantity: 1, category: "other" }],
      venue: [{ id: "demo-venue-1", name: "Diffusion", quantity: 1, category: "sound" }, { id: "demo-venue-2", name: "Retours de scène", quantity: 2, category: "sound" }],
    };
```

et donner une catégorie aux quatre lignes de `user_equipment_inventory` : `demo-equip-1` (guitare) `category: "other"`, `demo-equip-2` (pédalier) `category: "sound"`, `demo-equip-3` (câbles jack) `category: "sound"`, `demo-equip-4` (retour de scène) `category: "sound"`.

- [ ] **Step 8: Point de contrôle**

Run: `npx tsc --noEmit`. Attendu : des erreurs **uniquement** dans `TechnicalEditor.tsx`, `ProductionEditPage.tsx` et `EventEditPage.tsx`. Lister les erreurs dans le rapport.

---

### Task 5: Le bloc Matériel, la copie de fiche, la checklist et le branchement

**Files:**
- Create: `src/modules/live/components/shared/EquipmentBlock.tsx`
- Create: `src/modules/live/components/shared/CopyTechnicalDialog.tsx`
- Rewrite: `src/modules/live/components/shared/TechnicalEditor.tsx`
- Create: `src/modules/live/components/shared/EquipmentChecklist.tsx`
- Modify: `src/modules/live/components/ProductionEditPage.tsx`
- Modify: `src/modules/live/components/EventEditPage.tsx`
- Delete: `src/modules/live/components/shared/EquipmentPicker.tsx`

- [ ] **Step 1: `EquipmentBlock.tsx`**

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLiveData, type EquipmentInventoryItem } from "@/hooks/useLiveData";
import { EQUIPMENT_CATEGORIES, type EquipmentCategory, type SheetItem, type TechnicalSheet } from "../../lib/live-model";
import { DETAIL_PLACEHOLDER, resolveBrought, type BroughtLine } from "../../lib/live-equipment";
import { Choice } from "./LiveUI";

export type SheetChange = { technical: TechnicalSheet; listIds: string[] };

/** Une ligne d'ajout ou de matériel salle : nom et quantité modifiables. */
function ItemRow({ item, onChange, onRemove }: { item: SheetItem; onChange: (v: SheetItem) => void; onRemove: () => void }) {
    return <div className="flex items-center gap-2">
    <div className="min-w-0 flex-1">
    <Input aria-label="Nom du matériel" value={item.name} onChange={e => onChange({ ...item, name: e.target.value })}/>
    </div>
    <div className="w-16 shrink-0">
    <Input aria-label={`Quantité de ${item.name || "ce matériel"}`} type="number" min="1" value={String(item.quantity)} onChange={e => onChange({ ...item, quantity: Math.max(1, Number.parseInt(e.target.value, 10) || 1) })}/>
    </div>
    <Button type="button" variant="ghost" size="icon" aria-label={`Retirer ${item.name || "ce matériel"}`} onClick={onRemove}><Trash2 size={14}/></Button>
    </div>;
}

/** Saisie d'une ligne libre : nom, quantité, Entrée ou « + ». */
function LineAdder({ placeholder, onAdd }: { placeholder: string; onAdd: (name: string, quantity: number) => void }) {
    const [name, setName] = useState("");
    const [quantity, setQuantity] = useState("1");
    const submit = () => {
        const clean = name.trim();
        if (!clean)
            return;
        const parsed = Number.parseInt(quantity, 10);
        onAdd(clean, Number.isInteger(parsed) && parsed > 0 ? parsed : 1);
        setName("");
        setQuantity("1");
    };
    return <div className="flex items-center gap-2">
    <div className="min-w-0 flex-1">
    <Input aria-label={placeholder} placeholder={placeholder} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") {
        e.preventDefault();
        submit();
    } }}/>
    </div>
    <div className="w-16 shrink-0">
    <Input aria-label="Quantité" type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)}/>
    </div>
    <Button type="button" size="icon" variant="secondary" aria-label="Ajouter la ligne" disabled={!name.trim()} onClick={submit}><Plus size={14}/></Button>
    </div>;
}

function CategoryRow({ category, label, sheet, listLines, taken, inventory, patch }: {
    category: EquipmentCategory;
    label: string;
    sheet: TechnicalSheet;
    listLines: BroughtLine[];
    taken: Set<string>;
    inventory: EquipmentInventoryItem[];
    patch: (next: Partial<TechnicalSheet>) => void;
}) {
    const fromLists = listLines.filter(l => l.category === category);
    const extras = sheet.brought.filter(b => b.category === category);
    const venue = sheet.venue.filter(v => v.category === category);
    const pickable = inventory.filter(i => i.category === category && !taken.has(i.id)).sort((a, b) => a.name.localeCompare(b.name, "fr"));
    const id = `details-${category}`;
    return <section className="rounded-lg border border-[#F5F5F5]/[.08] bg-[#101010]/30 p-4">
    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[.14em] text-[#F5F5F5]/55">{label}</h3>
    <div className="grid gap-5 md:grid-cols-2">
    <div className="space-y-2">
    <p className="text-xs text-[#F5F5F5]/50">Apporté</p>
    {fromLists.map(line => <div key={line.key} className="flex items-center justify-between gap-3 rounded-md bg-[#101010]/40 px-3 py-2 text-sm">
        <span className="min-w-0 truncate">{line.name}<span className="ml-2 text-xs text-[#F5F5F5]/40">liste {line.listName}</span></span>
        <span className="shrink-0 text-xs text-[#F5F5F5]/50">× {line.quantity}</span>
        </div>)}
    {extras.map(item => <ItemRow key={item.id} item={item} onChange={next => patch({ brought: sheet.brought.map(b => b.id === item.id ? next : b) })} onRemove={() => patch({ brought: sheet.brought.filter(b => b.id !== item.id) })}/>)}
        {pickable.length > 0 && <Choice label="Depuis l’inventaire" placeholder="Choisir un matériel" value="" onChange={itemId => {
        const found = inventory.find(i => i.id === itemId);
        if (found)
            patch({ brought: [...sheet.brought, { id: crypto.randomUUID(), itemId: found.id, name: found.name, quantity: found.quantity, category }] });
    }} options={pickable.map(i => ({ value: i.id, label: `${i.name} × ${i.quantity}` }))}/>}
    <LineAdder placeholder="Autre matériel apporté" onAdd={(name, quantity) => patch({ brought: [...sheet.brought, { id: crypto.randomUUID(), name, quantity, category }] })}/>
    </div>
    <div className="space-y-2">
    <p className="text-xs text-[#F5F5F5]/50">À fournir par la salle</p>
    {venue.map(item => <ItemRow key={item.id} item={item} onChange={next => patch({ venue: sheet.venue.map(v => v.id === item.id ? next : v) })} onRemove={() => patch({ venue: sheet.venue.filter(v => v.id !== item.id) })}/>)}
    <LineAdder placeholder="Matériel demandé à la salle" onAdd={(name, quantity) => patch({ venue: [...sheet.venue, { id: crypto.randomUUID(), name, quantity, category }] })}/>
    </div>
    </div>
    <div className="mt-4 space-y-2">
    <Label htmlFor={id} className="text-xs text-[#F5F5F5]/65">Détails</Label>
    <Textarea id={id} rows={3} placeholder={DETAIL_PLACEHOLDER[category]} value={sheet.details[category]} onChange={e => patch({ details: { ...sheet.details, [category]: e.target.value } })}/>
    </div>
    </section>;
}

/** Le bloc Matériel de la fiche technique : listes cochées, ajouts, matériel demandé à la salle, par catégorie. */
export function EquipmentBlock({ sheet, listIds, onChange }: { sheet: TechnicalSheet; listIds: string[]; onChange: (v: SheetChange) => void }) {
    const { equipmentLists: lists, equipmentInventory: inventory } = useLiveData();
    const patch = (next: Partial<TechnicalSheet>) => onChange({ technical: { ...sheet, ...next }, listIds });
    // Les éléments des listes s'affichent seuls (lecture seule) ; les ajouts gardent leur ordre de saisie.
    const listLines = resolveBrought({ ...sheet, brought: [] }, listIds, lists, inventory);
    const taken = new Set([...listLines.map(l => l.key), ...sheet.brought.map(b => b.itemId).filter((x): x is string => !!x)]);
    return <div className="space-y-4">
    <div>
    <div className="mb-2 flex items-center justify-between">
    <p className="text-xs font-medium text-[#F5F5F5]/70">Listes de matériel</p>
    <Link href="/live/materiel" className="text-xs text-emerald-300 hover:underline">Gérer</Link>
    </div>
    <div className="flex flex-wrap gap-2">
        {lists.map(l => <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#F5F5F5]/10 px-3 py-2 text-xs hover:border-emerald-400/40">
        <Checkbox checked={listIds.includes(l.id)} onCheckedChange={v => onChange({ technical: sheet, listIds: v ? [...listIds, l.id] : listIds.filter(x => x !== l.id) })}/>
        {l.name}
        </label>)}
        {!lists.length && <p className="text-sm text-[#F5F5F5]/55">Crée une liste dans Matériel pour l’emporter d’un clic.</p>}
    </div>
    </div>
        {EQUIPMENT_CATEGORIES.map(([category, label]) => <CategoryRow key={category} category={category} label={label} sheet={sheet} listLines={listLines} taken={taken} inventory={inventory} patch={patch}/>)}
    </div>;
}
```

- [ ] **Step 2: `CopyTechnicalDialog.tsx`**

```tsx
"use client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLiveData } from "@/hooks/useLiveData";
import { KIND_META, type LiveProduction } from "../../lib/live-model";
import { plural, showsOf } from "../../lib/live-links";
import { technicalIsEmpty } from "../../lib/live-equipment";

/** Choisit le spectacle ou le DJ set dont on reprend la fiche technique. */
export function CopyTechnicalDialog({ open, onOpenChange, excludeId, onPick }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    excludeId?: string;
    onPick: (source: LiveProduction) => void;
}) {
    const { productions } = useLiveData();
    const sources = showsOf(productions).filter(p => p.id !== excludeId);
    return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
    <DialogHeader>
    <DialogTitle>Copier une fiche technique</DialogTitle>
    <DialogDescription>Choisis le spectacle ou le DJ set dont tu veux reprendre la fiche : contact, équipe, matériel et détails.</DialogDescription>
    </DialogHeader>
    <div className="max-h-80 space-y-2 overflow-y-auto">
        {sources.map(p => {
            const empty = technicalIsEmpty(p.technical, p.equipmentListIds);
            return <button key={p.id} type="button" disabled={empty} onClick={() => onPick(p)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-[#F5F5F5]/10 px-4 py-3 text-left text-sm transition-colors hover:border-[#F0FF00]/40 disabled:cursor-not-allowed disabled:opacity-40">
            <span className="min-w-0">
            <span className="block truncate font-medium">{p.title || "Sans titre"}</span>
            <span className="text-xs text-[#F5F5F5]/45">{KIND_META[p.kind].label}</span>
            </span>
            <span className="shrink-0 text-xs text-[#F5F5F5]/55">{empty ? "Fiche vide" : `${plural(p.equipmentListIds.length, "liste")} · ${plural(p.technical.brought.length + p.technical.venue.length, "ligne")}`}</span>
            </button>;
        })}
        {!sources.length && <p className="text-sm text-[#F5F5F5]/55">Aucun autre spectacle ou DJ set.</p>}
    </div>
    </DialogContent>
    </Dialog>;
}
```

- [ ] **Step 3: `TechnicalEditor.tsx` (réécrit)**

```tsx
"use client";
import { useState } from "react";
import { Copy, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { LiveProduction, TechnicalSheet } from "../../lib/live-model";
import { cloneTechnical, technicalIsEmpty } from "../../lib/live-equipment";
import { Panel, TextField } from "./LiveUI";
import { CopyTechnicalDialog } from "./CopyTechnicalDialog";
import { EquipmentBlock, type SheetChange } from "./EquipmentBlock";

/**
 * Fiche technique : le matériel en tête, puis le contact et l'équipe. `listIds`
 * (les listes de matériel cochées) voyage avec la fiche : un seul `onChange` pour
 * les deux, afin qu'une copie de fiche remplace tout d'un geste.
 */
export function TechnicalEditor({ value, listIds, onChange, excludeId }: {
    value: TechnicalSheet;
    listIds: string[];
    onChange: (v: SheetChange) => void;
    /** Le live en cours d'édition : on ne se copie pas soi-même. */
    excludeId?: string;
}) {
    const [copying, setCopying] = useState(false);
    const { confirm, confirmDialog } = useConfirm();
    const pick = async (source: LiveProduction) => {
        setCopying(false);
        if (!technicalIsEmpty(value, listIds) && !(await confirm({ title: "Remplacer la fiche technique ?", description: `La fiche actuelle sera remplacée par celle de « ${source.title} ».`, confirmLabel: "Remplacer" })))
            return;
        onChange({ technical: cloneTechnical(source.technical), listIds: [...source.equipmentListIds] });
    };
    return <Panel title="Fiche technique" icon={SlidersHorizontal} color="#A78BFA" description="Le matériel à emporter et à demander, puis les informations à transmettre au lieu." action={<Button type="button" size="xs" variant="secondary" onClick={() => setCopying(true)}><Copy size={12} className="mr-1"/>Copier une fiche technique</Button>}>
    <div className="space-y-6">
    <EquipmentBlock sheet={value} listIds={listIds} onChange={onChange}/>
    <div className="grid gap-5 md:grid-cols-2">
    <TextField label="Contact technique" area placeholder="Nom, téléphone, email" value={value.contact} onChange={contact => onChange({ technical: { ...value, contact }, listIds })}/>
    <TextField label="Équipe sur scène" area placeholder="Artistes, instruments, techniciens" value={value.team} onChange={team => onChange({ technical: { ...value, team }, listIds })}/>
    </div>
    </div>
    <CopyTechnicalDialog open={copying} onOpenChange={setCopying} excludeId={excludeId} onPick={pick}/>
    {confirmDialog}
    </Panel>;
}
```

- [ ] **Step 4: `EquipmentChecklist.tsx`**

```tsx
"use client";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLiveData } from "@/hooks/useLiveData";
import { EQUIPMENT_CATEGORIES, type TechnicalSheet } from "../../lib/live-model";
import { resolveBrought } from "../../lib/live-equipment";
import { Panel } from "./LiveUI";

/** « Matériel à emporter » d'une date ou d'une répétition : le matériel apporté de la fiche technique, avec ses cases à cocher. */
export function EquipmentChecklist({ sheet, listIds, checked, onCheck, onOpenTechnical }: {
    sheet: TechnicalSheet;
    listIds: string[];
    checked: Record<string, boolean>;
    onCheck: (v: Record<string, boolean>) => void;
    onOpenTechnical?: () => void;
}) {
    const { equipmentLists, equipmentInventory } = useLiveData();
    const lines = resolveBrought(sheet, listIds, equipmentLists, equipmentInventory);
    const done = lines.filter(l => checked[l.key]).length;
    return <Panel title="Matériel à emporter" icon={PackageCheck} color="#34D399" action={onOpenTechnical && <Button type="button" size="xs" variant="secondary" onClick={onOpenTechnical}>Modifier dans la fiche technique</Button>}>
    {!lines.length ? <p className="text-sm text-[#F5F5F5]/55">Aucun matériel apporté pour l’instant. Il se choisit dans la fiche technique.</p> : <div className="space-y-4">
        <p className="text-xs text-[#F5F5F5]/50">{done} / {lines.length} vérifiés pour cette date</p>
        {EQUIPMENT_CATEGORIES.map(([category, label]) => {
            const rows = lines.filter(l => l.category === category);
            if (!rows.length)
                return null;
            return <div key={category} className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5F5F5]/40">{label}</p>
            {rows.map(line => <label key={line.key} className="flex cursor-pointer items-center gap-3 rounded-md bg-[#101010]/30 px-3 py-2.5 text-sm">
                <Checkbox checked={!!checked[line.key]} onCheckedChange={v => onCheck({ ...checked, [line.key]: !!v })}/>
                <span className="flex-1">{line.name}</span>
                {line.needsRepair && <span className="text-xs text-amber-300">À réparer</span>}
                <span className="text-xs text-[#F5F5F5]/50">× {line.quantity}</span>
                </label>)}
            </div>;
        })}
    </div>}
    </Panel>;
}
```

- [ ] **Step 5: Brancher `ProductionEditPage.tsx`**

1. Imports : retirer `import { EquipmentPicker } from "./shared/EquipmentPicker";` ; ajouter `import { resolveBrought } from "../lib/live-equipment";`.
2. Dans `ProductionForm`, ajouter `equipmentLists, equipmentInventory` à la déstructuration de `useLiveData()`.
3. Le bouton « Fiche technique PDF » : `technicalSections(form.technical)` devient `technicalSections(form.technical, resolveBrought(form.technical, form.equipmentListIds, equipmentLists, equipmentInventory))`.
4. Remplacer les deux lignes
   `<EquipmentPicker listIds={form.equipmentListIds} onChange={equipmentListIds => patch({ equipmentListIds })}/>`
   `<TechnicalEditor value={form.technical} onChange={technical => patch({ technical })}/>`
   par :

```tsx
    <TechnicalEditor value={form.technical} listIds={form.equipmentListIds} excludeId={form.id} onChange={({ technical, listIds }) => patch({ technical, equipmentListIds: listIds })}/>
```

- [ ] **Step 6: Brancher `EventEditPage.tsx`**

Lire le fichier en entier (il est modifié en parallèle) et repérer par contenu :

1. Imports : retirer `import { EquipmentPicker } from "./shared/EquipmentPicker";`, ajouter `import { EquipmentChecklist } from "./shared/EquipmentChecklist";` et `import { cloneTechnical, resolveBrought } from "../lib/live-equipment";`.
2. `initialDetails` : `technical: show?.technical ?? emptyTechnical()` → `technical: show ? cloneTechnical(show.technical) : emptyTechnical()`.
3. `applyShow` : `technical: { ...p.technical }` → `technical: cloneTechnical(p.technical)`. `applyTour` : `technical: { ...switching.technical }` → `technical: cloneTechnical(switching.technical)`.
4. `roadmap` : l'élément `{ title: "Matériel", lines: live.equipmentInventory.filter(…).map(i => …) }` devient :

```ts
{ title: "Matériel", lines: resolveBrought(form.details.technical ?? emptyTechnical(), form.details.equipmentListIds ?? [], live.equipmentLists, live.equipmentInventory).map(l => `${form.details.equipmentChecked?.[l.key] ? "[OK]" : "[  ]"} ${l.quantity} × ${l.name}`) }
```

5. `publishSetlist` : `technical: form.details.technical ?? emptyTechnical()` → `technical: cloneTechnical(form.details.technical ?? emptyTechnical())`.
6. Répétition (`{rehearsal && <><EquipmentPicker … />`) **et** onglet Logistique (`{tab === "logistics" && <>… <EquipmentPicker … />`) : remplacer chaque `<EquipmentPicker … />` (avec ses props `listIds`, `onChange`, `checked`, `onCheck`) par :

```tsx
<EquipmentChecklist sheet={form.details.technical ?? emptyTechnical()} listIds={form.details.equipmentListIds ?? []} checked={form.details.equipmentChecked ?? {}} onCheck={equipmentChecked => details({ equipmentChecked })} onOpenTechnical={() => setTab("technical")}/>
```

7. Onglet Fiche technique : le bouton PDF `technicalSections(form.details.technical ?? emptyTechnical())` devient `technicalSections(form.details.technical ?? emptyTechnical(), resolveBrought(form.details.technical ?? emptyTechnical(), form.details.equipmentListIds ?? [], live.equipmentLists, live.equipmentInventory))`, et `<TechnicalEditor value={…} onChange={technical => details({ technical })}/>` devient :

```tsx
<TechnicalEditor value={form.details.technical ?? emptyTechnical()} listIds={form.details.equipmentListIds ?? []} onChange={({ technical, listIds }) => details({ technical, equipmentListIds: listIds })}/>
```

- [ ] **Step 7: Supprimer l'ancien sélecteur**

Run: `grep -rn "EquipmentPicker" src app` → ne doit plus afficher que le fichier lui-même. Puis `rm src/modules/live/components/shared/EquipmentPicker.tsx` et relancer le grep : aucune sortie.

- [ ] **Step 8: Point de contrôle**

Run: `npx tsc --noEmit` → **aucune sortie**. Run: `npx eslint src/modules/live` → aucune sortie. Run: `npx --yes tsx scripts/check-live-progress.ts` → `✓ …`.

---

### Task 6: Vérification (contrôleur)

Pas confié à un sous-agent : elle demande la migration en production et le compte de captures.

- [ ] **Step 1:** `npx tsc --noEmit`, `npx eslint src/modules/live src/hooks/useLiveData.ts`, script de règles, `npm run build`.
- [ ] **Step 2:** Migration : demander l'accord à l'utilisateur, `db push --linked --dry-run`, n'appliquer que si la liste ne contient que `20260921220000_live_equipment_category.sql` (sinon en rendre compte et demander).
- [ ] **Step 3:** Vérification de bout en bout sur des lignes de test préfixées `zz-test-fiche-`, supprimées ensuite avec contrôle des compteurs : ancienne fiche convertie, cases d'une liste, ajouts, copie d'une fiche, checklist d'une date, tri de l'inventaire par catégorie, ajout d'un album.
- [ ] **Step 4:** Mettre à jour `ALPHA.md` (avancement, migration, recette de déploiement).
