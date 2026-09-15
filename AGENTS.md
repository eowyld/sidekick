# SIDEKICK — Instructions for coding agents

## Project and product context

SIDEKICK is a TypeScript / Next.js 16 App Router application for independent
music artists. It centralises phonography, publishing, live touring,
administration, marketing, contacts, projects, tasks, and income tracking.

- Solo-developed product.
- Production: Vercel frontend and Supabase cloud backend.
- Open alpha target: 21 September 2026, free and without payments.
- `ALPHA.md` is the operational handoff document: scope, schedule, deployment
  checklist, known traps, and product decisions. Read it before planning,
  estimating, or changing alpha scope. Update it only when the work genuinely
  changes its status or decisions.
- Features explicitly closed for the alpha must remain closed. In particular,
  Outlook OAuth and Factur-X are outside the current alpha scope.

## Instruction and source hierarchy

1. Follow the user's current request and any more specific nested `AGENTS.md`.
2. Treat this file as the repository-wide durable guidance for Codex.
3. Use `ALPHA.md` for current product scope and release decisions.
4. Use `.codesight/` as a navigation aid only.
5. Read the relevant implementation files before changing code. The source is
   authoritative when generated maps or older documentation disagree.

`CLAUDE.md` is retained for compatibility with Claude Code. When durable rules
change, keep `AGENTS.md` and `CLAUDE.md` consistent rather than allowing the two
agents to follow different project conventions.

## Required orientation

At the start of implementation work:

1. Read `.codesight/wiki/index.md` to locate the relevant area.
2. Read `.codesight/CODESIGHT.md` or the focused maps when they are useful:
   - `.codesight/routes.md` — API routes
   - `.codesight/schema.md` — database models and relations
   - `.codesight/components.md` — UI components and props
3. Read the actual source files involved and their nearby types, hooks, and
   callers before editing.
4. For planning, estimation, deployment, or alpha decisions, also read the
   relevant sections of `ALPHA.md`.

CodeSight is generated and may lag behind the repository. Never infer runtime
behaviour solely from it.

## Working practices

- Preserve unrelated user changes in a dirty worktree.
- Do not stage, commit, push, or create a pull request unless the user asks.
- Do not make intermediate `git add` operations.
- Keep changes focused; do not opportunistically refactor adjacent code.
- Never expose or copy secrets from `.env.local` into output, source, fixtures,
  screenshots, or logs. Use `.env.example` to document environment variables.
- Prefer existing project patterns and shared components over new abstractions.
- When fixing a bug, identify the data flow and root cause before editing.
- For a new page or module, add its navigation entry to
  `src/components/layout/Sidebar.tsx` in the correct group.

## Verification

Use verification proportional to the change. Available commands:

```bash
npm run dev
npm run build
npm run lint
npx tsc --noEmit
npm run reset-data
```

There is currently no automated test suite. At minimum, run targeted lint or
type checks for code changes when practical. Use `npm run build` for changes
that affect routing, server/client boundaries, configuration, or production
behaviour.

Protected `(app)` routes use `AuthGuard`; unauthenticated `curl` or `fetch`
requests only redirect to `/login`. For UI verification, use the existing
Playwright login pattern in `scripts/shots.mjs` with `SHOT_EMAIL` and
`SHOT_PASSWORD` from `.env.local`. Prefer checking the authenticated page and a
screenshot yourself before asking the user to verify visually. Never print the
credentials.

## Architecture

Primary routing areas:

- `app/(auth)/` — public authentication pages
- `app/(app)/` — protected application shell
- `app/api/` — route handlers
- `app/presskit/` — public presskit pages
- `app/page.tsx` — landing page
- `src/modules/<module>/components/` — module UI and page-level components
- `src/hooks/` — module data hooks
- `src/components/ui/` — shared UI primitives
- `src/components/layout/` — shared application layout

Some generated CodeSight output lists both `app/` and `src/app/`. Confirm the
active implementation and imports in the source before modifying either tree.

## Data persistence and Supabase

All durable module data belongs in Supabase. Each module has a dedicated
`src/hooks/use*Data.ts` hook responsible for loading, optimistic updates, and
rollback on failure. Follow the existing hook for that module.

- Browser components: `createClient` from `@/lib/supabase`
- API routes and Server Components: `createServerSupabase` from
  `@/lib/supabase-server`
- Database migrations: `supabase/migrations/`
- Drive persistence: `src/lib/drive-db.ts`
- Contract persistence: `src/lib/contracts-db.ts`

Optimistic setters capture the previous state synchronously, update state, run
the Supabase operation asynchronously, and roll back on error. Their normal
signature is `setX((prev: T[]) => T[])`.

`useSidekickData` and localStorage contain only migration residue. Do not add
module data to them. Use localStorage only for genuinely transient UI state.
In particular:

- Projects use `useProjectsData`.
- Preferences and module visibility use `usePreferencesData`.
- Calendar module data uses `useCalendarData`.
- Other modules use their corresponding Supabase-backed hook.

Module visibility has historical semantics: a missing `enabledModules` key
means enabled (`enabledModules.x !== false`). Code writing this object must
write `false` explicitly for disabled sectors rather than omit their keys.
Do not confuse user module visibility with `src/lib/coming-soon.ts`, which is a
global product-scope decision.

## Task suggestions

Task suggestions combine deterministic rules in `src/modules/tasks/rules/`
with AI suggestions from `app/api/tasks/ai-suggestions/route.ts`. Add a rule to
the appropriate module rule array. To support a new module, update
`RuleContext`, load the module hook in the task page, and pass the data into the
context. Read the current files first because this area may evolve.

## UI and design system

SIDEKICK is dark-only. Do not introduce light surfaces or light-mode variants.

- Background: `#101010`
- Foreground: `#f5f5f5`
- Muted text: `rgba(245,245,245,0.7)`
- Card: `rgba(44,44,46,0.72)` with blur where established
- Border: `rgba(245,245,245,0.12)`
- Accent / CTA / focus: `#F0FF00`

Use the primitives in `src/components/ui/` instead of recreating controls with
raw HTML. They are custom Radix UI + Tailwind components, not stock shadcn/ui.
Check each component's current variants and props before use. Use `cn()` from
`@/lib/utils` for conditional classes.

- Typography: Archivo via `next/font/google`; do not add another font family.
- Icons: Lucide React only.
- Reuse shared `Button`, `Input`, `Textarea`, `Label`, `Card`, `Dialog`,
  `Select`, `Checkbox`, `Switch`, `Popover`, `Tooltip`, `Badge`, and
  `DatePicker` components where applicable.
- Avoid legacy light utilities such as `bg-white`, `bg-gray-50`, and
  `text-gray-900` in new code, even though global CSS overrides some of them.
- Preserve the established fixed-sidebar and app-shell spacing unless the task
  explicitly redesigns it.

High-impact shared files require extra care and broader verification:

- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/label.tsx`
- `src/lib/sidekick-store.ts`
- `src/lib/supabase.ts`
- `src/hooks/useSidekickData.ts`

## Environment

Consult `.env.example` and the actual consumers before deciding whether a
variable is required. Core Supabase browser configuration uses
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Deployment and
integrations may also require site URL, Vercel URL, Brevo, OAuth, or other
service variables. Do not assume generated CodeSight env summaries are fully
current.
