# Project Context

This is a typescript project using next-app.

The API has 17 routes. See .codesight/routes.md for the full route map with methods, paths, and tags.
The database has 14 models. See .codesight/schema.md for the full schema with fields, types, and relations.
The UI has 163 components. See .codesight/components.md for the full list with props.

High-impact files (most imported, changes here affect many other files):
- src/components/ui/button.tsx (imported by 52 files)
- src/components/ui/input.tsx (imported by 29 files)
- src/components/ui/card.tsx (imported by 25 files)
- src/lib/sidekick-store.ts (imported by 23 files)
- src/components/ui/textarea.tsx (imported by 23 files)
- src/lib/supabase.ts (imported by 21 files)
- src/hooks/useSidekickData.ts (imported by 20 files)
- src/components/ui/label.tsx (imported by 18 files)

Required environment variables (no defaults):
- VERCEL_URL (app/layout.tsx)

Read .codesight/wiki/index.md for orientation (WHERE things live). Then read actual source files before implementing. Wiki articles are navigation aids, not implementation guides.
Read .codesight/CODESIGHT.md for the complete AI context map including all routes, schema, components, libraries, config, middleware, and dependency graph.
