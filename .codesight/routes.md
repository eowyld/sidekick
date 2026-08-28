# Routes

- `GET` `/api/calendar/ical/[token]` params(token) [auth, cache]
- `POST` `/api/calendar/migrate` → out: { error } [auth]
- `GET` `/api/mail/oauth/google/callback` [auth]
- `GET` `/api/mail/oauth/google/start` → out: { error } [auth]
- `GET` `/api/mail/oauth/outlook/callback` [auth]
- `GET` `/api/mail/oauth/outlook/start` [auth]
- `POST` `/api/mail/send` → out: { error, subject, html, fromEmail" } [auth]
- `GET` `/api/mail/track/click` [auth, db]
- `GET` `/api/mail/track/open` [auth, db, cache]
- `POST` `/api/mail/track/record` → out: { error } [auth]
- `POST` `/api/phono/apply-metadata`
- `GET` `/api/presskit/[id]` params(id) → out: { error }
- `GET` `/api/presskit/my-slug` → out: { slug, url } [auth]
- `GET` `/api/presskit/resolve-streaming-links` → out: { error } [auth, cache, upload]
- `POST` `/api/presskit/shorten` → out: { error } [auth, db]
- `POST` `/api/tasks/ai-suggestions` → out: { error } [auth, cache, ai]
- `POST` `/api/waitlist` → out: { ok, error } [payment]
