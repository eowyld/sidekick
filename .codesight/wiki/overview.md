# sidekick-app — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**sidekick-app** is a typescript project built with next-app.

## Scale

17 API routes · 14 database models · 163 UI components · 11 environment variables

## Subsystems

- **[Auth](./auth.md)** — 4 routes — touches: auth
- **[Route](./route.md)** — 13 routes — touches: auth, cache, db, upload, ai

**Database:** unknown, 14 models — see [database.md](./database.md)

**UI:** 163 components (react) — see [ui.md](./ui.md)

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `src/components/ui/button.tsx` — imported by **52** files
- `src/components/ui/input.tsx` — imported by **29** files
- `src/components/ui/card.tsx` — imported by **25** files
- `src/lib/sidekick-store.ts` — imported by **23** files
- `src/components/ui/textarea.tsx` — imported by **23** files
- `src/lib/supabase.ts` — imported by **21** files

## Required Environment Variables

- `VERCEL_URL` — `app/layout.tsx`

---
_Back to [index.md](./index.md) · Generated 2026-04-09_