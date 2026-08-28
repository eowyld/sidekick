# Config

## Environment Variables

- `ANTHROPIC_API_KEY` (has default) — .env.local
- `GOOGLE_OAUTH_CLIENT_ID` (has default) — .env.local
- `GOOGLE_OAUTH_CLIENT_SECRET` (has default) — .env.local
- `MICROSOFT_OAUTH_CLIENT_ID` (has default) — .env.local
- `MICROSOFT_OAUTH_CLIENT_SECRET` (has default) — .env.local
- `NEXT_PUBLIC_SITE_URL` (has default) — .env.example
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (has default) — .env.local
- `NEXT_PUBLIC_SUPABASE_URL` (has default) — .env.local
- `SUPABASE_SERVICE_ROLE_KEY` (has default) — .env.local
- `VERCEL_URL` **required** — app/layout.tsx
- `WAITLIST_WEBHOOK_URL` (has default) — .env.example

## Config Files

- `.env.example`
- `next.config.mjs`
- `tailwind.config.ts`
- `tsconfig.json`

## Key Dependencies

- @supabase/supabase-js: ^2.93.3
- ai: ^6.0.146
- next: ^16.1.6
- react: 18.3.1
- zod: ^4.3.6
