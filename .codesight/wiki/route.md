# Route

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Route subsystem handles **13 routes** and touches: auth, cache, db, ai, payment.

## Routes

- `GET` `/api/calendar/ical/[token]` params(token) [auth, cache]
  `app/api/calendar/ical/[token]/route.ts`
- `POST` `/api/calendar/migrate` → out: { error } [auth]
  `app/api/calendar/migrate/route.ts`
- `POST` `/api/mail/send` → out: { error, subject, html, fromEmail" } [auth]
  `app/api/mail/send/route.ts`
- `GET` `/api/mail/track/click` [auth, db]
  `app/api/mail/track/click/route.ts`
- `GET` `/api/mail/track/open` [auth, db, cache]
  `app/api/mail/track/open/route.ts`
- `POST` `/api/mail/track/record` → out: { error } [auth]
  `app/api/mail/track/record/route.ts`
- `POST` `/api/phono/apply-metadata`
  `app/api/phono/apply-metadata/route.ts`
- `GET` `/api/presskit/[id]` params(id) → out: { error }
  `app/api/presskit/[id]/route.ts`
- `GET` `/api/presskit/my-slug` → out: { slug, url } [auth]
  `app/api/presskit/my-slug/route.ts`
- `GET` `/api/presskit/resolve-streaming-links` → out: { error } [auth, cache, upload]
  `app/api/presskit/resolve-streaming-links/route.ts`
- `POST` `/api/presskit/shorten` → out: { error } [auth, db]
  `app/api/presskit/shorten/route.ts`
- `POST` `/api/tasks/ai-suggestions` → out: { error } [auth, cache, ai]
  `app/api/tasks/ai-suggestions/route.ts`
- `POST` `/api/waitlist` → out: { ok, error } [payment]
  `app/api/waitlist/route.ts`

## Source Files

Read these before implementing or modifying this subsystem:
- `app/api/calendar/ical/[token]/route.ts`
- `app/api/calendar/migrate/route.ts`
- `app/api/mail/send/route.ts`
- `app/api/mail/track/click/route.ts`
- `app/api/mail/track/open/route.ts`
- `app/api/mail/track/record/route.ts`
- `app/api/phono/apply-metadata/route.ts`
- `app/api/presskit/[id]/route.ts`
- `app/api/presskit/my-slug/route.ts`
- `app/api/presskit/resolve-streaming-links/route.ts`
- `app/api/presskit/shorten/route.ts`
- `app/api/tasks/ai-suggestions/route.ts`
- `app/api/waitlist/route.ts`

---
_Back to [overview.md](./overview.md)_