# Auth

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Auth subsystem handles **4 routes** and touches: auth.

## Routes

- `GET` `/api/mail/oauth/google/callback` [auth]
  `app/api/mail/oauth/google/callback/route.ts`
- `GET` `/api/mail/oauth/google/start` → out: { error } [auth]
  `app/api/mail/oauth/google/start/route.ts`
- `GET` `/api/mail/oauth/outlook/callback` [auth]
  `app/api/mail/oauth/outlook/callback/route.ts`
- `GET` `/api/mail/oauth/outlook/start` [auth]
  `app/api/mail/oauth/outlook/start/route.ts`

## Source Files

Read these before implementing or modifying this subsystem:
- `app/api/mail/oauth/google/callback/route.ts`
- `app/api/mail/oauth/google/start/route.ts`
- `app/api/mail/oauth/outlook/callback/route.ts`
- `app/api/mail/oauth/outlook/start/route.ts`

---
_Back to [overview.md](./overview.md)_