<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into SIDEKICK. The integration covers client-side event tracking across key user flows (login, task management, project management, royalty income), server-side event tracking for AI suggestion generation, user identification on sign-in via Supabase auth state changes, and automatic exception capture via `capture_exceptions: true`.

Client-side PostHog is initialized through `instrumentation-client.ts` (the recommended approach for Next.js 15.3+), with a reverse proxy configured in `next.config.mjs` to route PostHog traffic through `/ingest/` for better ad-blocker resilience. A shared server-side client was created at `src/lib/posthog-server.ts` for use in API routes.

| Event | Description | File |
|---|---|---|
| `login_clicked` | User clicks the Google sign-in button | `src/app/(auth)/login/page.tsx` |
| `signed_out` | User signs out of the application | `src/context/AuthContext.tsx` |
| `task_created` | User saves a new task via the task modal | `src/modules/tasks/components/TaskModal.tsx` |
| `task_updated` | User saves changes to an existing task | `src/modules/tasks/components/TaskModal.tsx` |
| `task_completed` | User marks a task as done | `src/modules/tasks/components/TaskCard.tsx` |
| `task_added_to_today` | User adds a backlog task to today's focus panel | `src/modules/tasks/components/TaskCard.tsx` |
| `royalty_entry_added` | User manually adds a royalty entry | `src/modules/incomes/components/RoyaltiesManualModal.tsx` |
| `royalty_entry_updated` | User updates an existing royalty entry | `src/modules/incomes/components/RoyaltiesManualModal.tsx` |
| `project_status_changed` | User changes the status of a project | `src/modules/projects/components/ProjectDashboard.tsx` |
| `project_deleted` | User deletes a project | `src/modules/projects/components/ProjectDashboard.tsx` |
| `ai_suggestions_requested` | AI task suggestions were generated (server-side) | `app/api/tasks/ai-suggestions/route.ts` |
| `ai_suggestions_served_from_cache` | AI suggestions were served from cache (server-side) | `app/api/tasks/ai-suggestions/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://eu.posthog.com/project/164766/dashboard/638410
  - **Login → First Task Created (Activation Funnel)**: https://eu.posthog.com/project/164766/insights/hz8ju2wX
  - **Task Activity (Weekly)**: https://eu.posthog.com/project/164766/insights/7Hk92OoW
  - **AI Suggestions Usage**: https://eu.posthog.com/project/164766/insights/r8P1cQ5M
  - **Royalty Entries Added (Monthly)**: https://eu.posthog.com/project/164766/insights/IWs7rsMg
  - **Project Engagement (Status Changes & Deletions)**: https://eu.posthog.com/project/164766/insights/eduLbUWJ

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
