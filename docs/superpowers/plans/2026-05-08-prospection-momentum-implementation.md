# Prospection Momentum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework Live prospection into a focused outreach workflow with expandable rows, touchpoint history, hidden momentum scoring, and reliability tiers.

**Architecture:** Keep the current module boundaries (`useLiveData` + `ProspectionPage`) and extend `user_live_prospection` with two new columns. Store touchpoints directly in prospection rows (JSONB), compute derived fields (momentum level and last contact) client-side, and preserve existing manual status flow/auto-relance behavior.

**Tech Stack:** Next.js App Router, React 18, TypeScript strict mode, Supabase, SWR, Tailwind, Lucide.

---

## File Structure (before tasks)

- **Create** `supabase/migrations/<timestamp>_add_prospection_touchpoints.sql`
  - Adds `touchpoints` and `reliability_tier` columns.
- **Modify** `src/hooks/useLiveData.ts`
  - Extends prospection domain types and row mappers.
  - Guarantees `lastContact` is derived from touchpoints before persist.
- **Modify** `src/modules/live/components/ProspectionPage.tsx`
  - Replaces dense table with accordion rows.
  - Adds touchpoint timeline and inline quick-add.
  - Adds reliability-tier form control and momentum indicator.
- **Create** `src/modules/live/components/prospection-momentum.ts` (small pure helper module)
  - Centralizes momentum scoring and level mapping for easy testing and reuse.
- **Create** `src/modules/live/components/prospection-momentum.test.ts` (Node test runner)
  - Validates scoring, decay, and reliability thresholds without UI harness.

---

### Task 1: Add DB schema for touchpoints and reliability tier

**Files:**
- Create: `supabase/migrations/<timestamp>_add_prospection_touchpoints.sql`
- Verify: `supabase/migrations/<timestamp>_add_prospection_touchpoints.sql`

- [ ] **Step 1: Write migration file**

```sql
ALTER TABLE user_live_prospection
  ADD COLUMN IF NOT EXISTS touchpoints jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reliability_tier text NOT NULL DEFAULT 'neutral';
```

- [ ] **Step 2: Add tier constraint**

```sql
ALTER TABLE user_live_prospection
  ADD CONSTRAINT user_live_prospection_reliability_tier_check
  CHECK (reliability_tier IN ('easy', 'neutral', 'hard'));
```

- [ ] **Step 3: Add rollback block in same migration**

```sql
ALTER TABLE user_live_prospection
  DROP CONSTRAINT IF EXISTS user_live_prospection_reliability_tier_check;

ALTER TABLE user_live_prospection
  DROP COLUMN IF EXISTS reliability_tier,
  DROP COLUMN IF EXISTS touchpoints;
```

- [ ] **Step 4: Validate SQL syntax**

Run: `rg "user_live_prospection" supabase/migrations/<timestamp>_add_prospection_touchpoints.sql`  
Expected: 3 matching statements (add columns, add check, rollback).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/<timestamp>_add_prospection_touchpoints.sql
git commit -m "feat: add prospection touchpoints and reliability tier schema"
```

---

### Task 2: Extend live data types and mapper normalization

**Files:**
- Modify: `src/hooks/useLiveData.ts`
- Test: `npx tsc --noEmit`

- [ ] **Step 1: Write failing type usage in helper import target**

Add this temporary usage at bottom of `useLiveData.ts` to force missing types compile error before implementation:

```ts
// TEMP red test
type _TouchpointShapeCheck = ProspectionEntry["touchpoints"][number];
```

- [ ] **Step 2: Run type-check to verify failure**

Run: `npx tsc --noEmit`  
Expected: FAIL with `Property 'touchpoints' does not exist on type 'ProspectionEntry'`.

- [ ] **Step 3: Implement new domain types and normalization**

Add near existing prospection types:

```ts
export type ProspectionChannel = "mail" | "instagram" | "phone" | "in-person";
export type ProspectionDirection = "outbound" | "inbound" | "no-answer";
export type ReliabilityTier = "easy" | "neutral" | "hard";

export type ContactTouchpoint = {
  id: string;
  date: string;
  channel: ProspectionChannel;
  direction?: ProspectionDirection;
  note?: string;
};
```

Extend `ProspectionEntry`:

```ts
  touchpoints: ContactTouchpoint[];
  reliabilityTier: ReliabilityTier;
```

Add helpers and mapper wiring:

```ts
function getLastContactFromTouchpoints(touchpoints: ContactTouchpoint[]): string | undefined {
  const withDate = touchpoints
    .map((tp) => ({ ...tp, ts: new Date(tp.date).getTime() }))
    .filter((tp) => Number.isFinite(tp.ts));
  if (withDate.length === 0) return undefined;
  withDate.sort((a, b) => b.ts - a.ts);
  return withDate[0].date;
}
```

`prospectionToRow` must always persist `last_contact` from touchpoints:

```ts
const lastContact = getLastContactFromTouchpoints(e.touchpoints);
...
last_contact: lastContact ?? null,
touchpoints: e.touchpoints ?? [],
reliability_tier: e.reliabilityTier ?? "neutral",
```

`rowToProspection`:

```ts
const touchpoints = ((row.touchpoints as ContactTouchpoint[]) ?? []).filter(Boolean);
return {
  ...
  touchpoints,
  reliabilityTier: (row.reliability_tier as ReliabilityTier) ?? "neutral",
  lastContact: getLastContactFromTouchpoints(touchpoints),
};
```

- [ ] **Step 4: Remove temporary failing check and run type-check**

Run: `npx tsc --noEmit`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useLiveData.ts
git commit -m "feat: add prospection touchpoint types and mapper normalization"
```

---

### Task 3: Add pure momentum engine + tests

**Files:**
- Create: `src/modules/live/components/prospection-momentum.ts`
- Create: `src/modules/live/components/prospection-momentum.test.ts`
- Test: `node --test src/modules/live/components/prospection-momentum.test.ts`

- [ ] **Step 1: Write failing tests first**

Create `prospection-momentum.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { computeMomentumScore, getMomentumLevel } from "./prospection-momentum";

test("phone no-answer gives 0 points", () => {
  const score = computeMomentumScore([
    { id: "1", date: "2026-05-08", channel: "phone", direction: "no-answer" },
  ]);
  assert.equal(score, 0);
});

test("hard tier requires higher threshold than easy", () => {
  const score = 6;
  assert.equal(getMomentumLevel(score, "easy"), "active");
  assert.equal(getMomentumLevel(score, "hard"), "warm");
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test src/modules/live/components/prospection-momentum.test.ts`  
Expected: FAIL because module exports do not exist yet.

- [ ] **Step 3: Implement minimal momentum engine**

Create `prospection-momentum.ts` with:

```ts
const TOUCHPOINT_POINTS = {
  mail: { outbound: 2, inbound: 5 },
  instagram: { outbound: 1, inbound: 4 },
  phone: { outbound: 3, inbound: 5, "no-answer": 0 },
  "in-person": { default: 6 },
} as const;
```

```ts
export function computeMomentumScore(touchpoints: ContactTouchpoint[], now = Date.now()) {
  return touchpoints.reduce((acc, tp) => {
    const base = getTouchpointPoints(tp);
    if (base <= 0) return acc;
    const ageDays = Math.max(0, (now - new Date(tp.date).getTime()) / (1000 * 60 * 60 * 24));
    return acc + base * Math.pow(0.5, ageDays / 14);
  }, 0);
}
```

```ts
export function getMomentumLevel(score: number, tier: ReliabilityTier): MomentumLevel {
  const t = THRESHOLDS[tier];
  if (score > t.hot) return "hot";
  if (score > t.active) return "active";
  if (score > t.warm) return "warm";
  if (score > 0.5) return "idle";
  return "inactive";
}
```

- [ ] **Step 4: Run tests + type-check**

Run:
- `node --test src/modules/live/components/prospection-momentum.test.ts`
- `npx tsc --noEmit`

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/live/components/prospection-momentum.ts src/modules/live/components/prospection-momentum.test.ts
git commit -m "feat: add prospection momentum scoring engine"
```

---

### Task 4: Refactor ProspectionPage table into accordion-first outreach UI

**Files:**
- Modify: `src/modules/live/components/ProspectionPage.tsx`
- Reference pattern: `src/modules/contacts/components/ContactsPage.tsx`
- Test: `npm run lint`

- [ ] **Step 1: Add failing UI assertion via lint-unfriendly placeholder (temporary)**

Insert a temporary impossible symbol in JSX to ensure change area is reached, e.g. `{__REPLACE_WITH_ACCORDION__}`.

- [ ] **Step 2: Run lint to verify failure**

Run: `npm run lint`  
Expected: FAIL with `__REPLACE_WITH_ACCORDION__ is not defined`.

- [ ] **Step 3: Implement accordion table + simplified columns**

Core changes:
- Add `expandedId` state.
- Replace row render from single `<tr>` to `<Fragment>` with summary row + expandable detail row.
- New header columns: toggle, venue, city, momentum, status, last contact, actions.
- Remove inline contact/email/instagram/phone/notes columns.
- Keep existing status dropdown.

Key rendering structure:

```tsx
<Fragment key={entry.id}>
  <tr onClick={() => setExpandedId((prev) => (prev === entry.id ? null : entry.id))}>
    <td><ChevronRight className={cn(isExpanded && "rotate-90")} /></td>
    <td>{entry.venueName}</td>
    <td>{entry.city || "—"}</td>
    <td>{renderMomentumBadge(entry)}</td>
    <td>{renderStatusDropdown(entry)}</td>
    <td>{formatDateDisplay(lastContact)}</td>
    <td>{renderActions(entry)}</td>
  </tr>
  <tr>
    <td colSpan={7} className="p-0">
      <div className={cn("grid transition-[grid-template-rows]", isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">{/* details + touchpoints */}</div>
      </div>
    </td>
  </tr>
</Fragment>
```

- [ ] **Step 4: Add touchpoint timeline and quick-add form**

Implement local draft state per expanded row:

```tsx
const [touchpointDrafts, setTouchpointDrafts] = useState<Record<string, TouchpointDraft>>({});
```

Add handlers:
- `addTouchpoint(entryId)`
- `deleteTouchpoint(entryId, touchpointId)`
- `updateTouchpointDraft(entryId, patch)`

Rules:
- `channel === "in-person"` => hide direction input.
- `channel === "phone"` => directions include `"no-answer"`.
- Save updates via `setEntries(...)` optimistic update.

- [ ] **Step 5: Run lint + type-check**

Run:
- `npm run lint`
- `npx tsc --noEmit`

Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/live/components/ProspectionPage.tsx
git commit -m "feat: redesign prospection table with accordion and touchpoint workflow"
```

---

### Task 5: Update create/edit dialog for reliability tier + remove manual last contact

**Files:**
- Modify: `src/modules/live/components/ProspectionPage.tsx`
- Test: `npm run lint`

- [ ] **Step 1: Write failing temporary check**

Temporarily reference missing `form.reliabilityTier` before adding it to form shape.

- [ ] **Step 2: Run type-check to verify failure**

Run: `npx tsc --noEmit`  
Expected: FAIL with `Property 'reliabilityTier' does not exist`.

- [ ] **Step 3: Implement form model update**

Update `emptyForm` and edit/create flows:

```ts
const emptyForm = {
  venueName: "",
  city: "",
  contact: "",
  email: "",
  instagram: "",
  phone: "",
  status: "À contacter" as Status,
  notes: "",
  reliabilityTier: "neutral" as ReliabilityTier,
};
```

Persist in `saveEntry`:

```ts
reliabilityTier: form.reliabilityTier,
touchpoints: existingTouchpointsOrEmpty,
lastContact: getLastContactFromTouchpoints(existingTouchpointsOrEmpty),
```

Dialog UI:
- Remove `DatePicker` field for `lastContact`.
- Add `Reliability` 3-option segmented control.

- [ ] **Step 4: Run lint + type-check**

Run:
- `npm run lint`
- `npx tsc --noEmit`

Expected: both PASS.

- [ ] **Step 5: Manual QA**

Run: `npm run dev`  
Check:
1. Create prospect with each tier.
2. Expand row, add mail/instagram/phone/in-person touchpoints.
3. Confirm in-person hides direction.
4. Confirm phone no-answer appears in timeline but does not increase momentum badge.
5. Confirm no direct `lastContact` edit exists in dialog.
6. Confirm status dropdown behavior and auto-relance remain intact.

- [ ] **Step 6: Commit**

```bash
git add src/modules/live/components/ProspectionPage.tsx
git commit -m "feat: add reliability tier and remove manual last-contact editing"
```

---

### Task 6: Final verification and cleanup

**Files:**
- Verify: changed files from tasks 1-5

- [ ] **Step 1: Run full validation commands**

Run:
- `npm run lint`
- `npx tsc --noEmit`

Expected: all PASS with no new errors in touched files.

- [ ] **Step 2: Inspect diff for scope control**

Run: `git diff -- src/hooks/useLiveData.ts src/modules/live/components/ProspectionPage.tsx src/modules/live/components/prospection-momentum.ts supabase/migrations`

Expected: only planned concerns (schema, mapper types, momentum engine, prospection UI).

- [ ] **Step 3: Write short release note entry**

Create note text (for PR body/changelog):

```md
- Refonte du tableau Prospection en mode accordéon orienté démarchage
- Ajout d'un historique de touchpoints multi-canaux et d'un score de momentum caché
- Ajout du niveau de fiabilité prospect et suppression de l'édition manuelle du dernier contact
```

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: ship prospection momentum and touchpoint workflow"
```

---

## Spec Coverage Check

- **Data model (`touchpoints`, `reliabilityTier`)** → Tasks 1, 2, 5.
- **Momentum engine (hidden score + decay + tier thresholds)** → Task 3 + table rendering in Task 4.
- **Simplified table & accordion UX** → Task 4.
- **Inline touchpoint tracking with channel-specific direction rules** → Task 4.
- **Reliability tier in dialog and last-contact auto derivation** → Task 5.
- **Keep manual status + existing auto-relance behavior** → Tasks 2, 4, 5.

No gaps detected against `docs/superpowers/specs/2026-05-08-prospection-momentum-design.md`.
