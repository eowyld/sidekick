# PostHog — Analytics, Error Tracking & Feedback Testeurs Alpha

**Date:** 2026-04-23
**Statut:** Approuvé

---

## Contexte

  SIDEKICK entre en phase alpha avec >10 testeurs externes. On installe PostHog pour couvrir trois besoins simultanément : analytics d'usage, error tracking, et collecte de feedback testeurs. Un seul outil, un seul dashboard.

---

## Architecture générale

Un `PostHogProvider` client wrappé dans `app/layout.tsx` initialise PostHog une fois pour toute l'app. L'autocapture, le session replay et la capture d'exceptions sont activés dès l'init.

Un `PostHogPageView` client component écoute `usePathname` et appelle `posthog.capture('$pageview')` à chaque changement de route — pattern requis pour Next.js App Router (les Server Components ne peuvent pas appeler PostHog directement).

Les events custom sont appelés directement dans les composants existants via `posthog.capture()`, sans layer d'abstraction.

Un `GlobalErrorBoundary` React class component dans `app/(app)/layout.tsx` catch les erreurs non gérées de l'app shell.

---

## Variables d'environnement

```
NEXT_PUBLIC_POSTHOG_KEY=<clé projet PostHog>
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

À ajouter dans `.env.local` et dans les variables d'environnement Vercel.

---

## Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `src/components/analytics/PostHogProvider.tsx` | Provider client, initialisation PostHog |
| `src/components/analytics/PostHogPageView.tsx` | Tracking pageview App Router |
| `src/components/analytics/FeedbackButton.tsx` | Bouton flottant feedback |
| `src/components/analytics/GlobalErrorBoundary.tsx` | Error boundary avec report PostHog |
| `app/(app)/error.tsx` | Fallback UI Next.js + report PostHog (à créer) |

---

## Fichiers modifiés

| Fichier | Modification |
|---|---|
| `app/layout.tsx` | Wrap avec `PostHogProvider` + `PostHogPageView` |
| `app/(app)/layout.tsx` | Wrap avec `GlobalErrorBoundary` + ajout `FeedbackButton` |
| `app/(app)/error.tsx` | Création + fallback UI + report PostHog |
| Composants modules | Ajout `posthog.capture()` sur les actions listées |

---

## Identification des testeurs

Au login Supabase :
```ts
posthog.identify(user.id, {
  email: user.email,
  name: user.user_metadata.full_name
})
```

Au logout : `posthog.reset()`

Permet de lier chaque session, event et feedback à un testeur nommé dans le dashboard PostHog.

---

## Error Tracking

- `capture_exceptions: true` dans l'init PostHog — capture automatique des erreurs JS non catchées et promesses rejetées
- `GlobalErrorBoundary` dans `app/(app)/layout.tsx` — capture les erreurs React avec `posthog.capture('error_caught', { error, stack, pathname })`
- `app/(app)/error.tsx` — fallback UI Next.js + report PostHog

---

## Events custom

### Tasks
- `task_created`
- `task_completed`
- `task_deleted`
- `ai_suggestion_converted`

### Calendar
- `event_created`
- `event_deleted`

### Phono
- `track_created`
- `album_created`
- `podcast_created`
- `session_created`

### Live — Tour dates
- `tour_date_created`
- `tour_date_deleted`
- `tour_transport_added`
- `tour_accommodation_added`
- `tour_fee_added`

### Live — Répétitions
- `rehearsal_created`
- `rehearsal_deleted`
- `rehearsal_fee_added`
- `rehearsal_equipment_added`

### Live — Matériel
- `equipment_list_created`
- `equipment_item_added`

### Contacts
- `contact_created`
- `contact_deleted`

### Incomes
- `invoice_created`
- `invoice_downloaded`
- `mission_created`
- `royalties_import_uploaded`

### Droits d'auteurs
- `publishing_statement_imported`

### Édition
- `work_created`
- `work_track_linked`

### Marketing
- `post_created`
- `mail_sent`
- `campaign_saved_draft`
- `campaign_loaded`
- `presskit_pdf_downloaded`
- `presskit_link_copied`
- `presskit_reset`

### Admin
- `status_created`
- `procedure_created`
- `contract_created`
- `contract_template_created`
- `contract_signature_created`

### Projets
- `project_created`

### Documents
- `file_added`
- `file_deleted`
- `file_renamed`
- `file_moved`

### Paramètres
- `password_changed`
- `profile_name_updated`
- `gmail_connected`
- `outlook_connected`
- `module_visibility_updated`

### Auth
- `user_signed_in`
- `user_signed_out`

Chaque event inclut des propriétés contextuelles minimales (ex: `{ module: 'tasks', source: 'modal' }`). Aucune donnée personnelle (contenu des champs, noms de fichiers, titres de tracks) n'est envoyée.

---

## Widget Feedback

**Bouton flottant** (`FeedbackButton`) :
- Positionné `fixed bottom-6 right-6` sur toutes les pages de l'app shell
- Design : fond `rgba(44,44,46,0.72)` + `backdrop-blur`, icône Lucide `MessageSquare`, accent `#F0FF00` au hover
- Au clic : déclenche une PostHog Survey via l'API programmatique PostHog

---

## Surveys PostHog

Configurées dans le dashboard PostHog (sans code). Format : NPS + question ouverte en français ("Qu'est-ce qui t'a bloqué aujourd'hui ?").

**Conditions de déclenchement :**

1. Après 5 minutes cumulées sur l'app
2. Après la création de 10 items au total (tous modules confondus)
3. Maximum une fois par semaine par testeur
4. Survey hebdomadaire récurrente — uniquement si le testeur s'est connecté plus d'une fois dans la semaine

Tout le feedback atterrit dans PostHog Surveys dashboard, lié aux sessions et events du testeur.

---

## Ce qui n'est pas dans ce design

- Sentry (non nécessaire pour l'alpha, PostHog couvre l'error tracking)
- Formulaire feedback custom React (PostHog Surveys suffit)
- Notifications Slack/email (dashboard PostHog uniquement)
- Backend custom pour les events (tout côté client)
