# sidekick-app — AI Context Map

> **Stack:** next-app | none | react | typescript

> 17 routes | 14 models | 163 components | 23 lib files | 11 env vars | 0 middleware
> **Token savings:** this file is ~7,600 tokens. Without it, AI exploration would cost ~83,800 tokens. **Saves ~76,200 tokens per conversation.**

---

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

---

# Schema

### user_document_folders
- id: uuid (pk)
- user_id: uuid (required, fk)
- name: text (required)

### user_documents
- id: uuid (pk)
- user_id: uuid (required, fk)
- title: text (required)
- folder_id: text (fk)
- link: text
- category: text
- source_module: text
- notes: text
- date_added: date
- date_modified: date

### user_drive_storage
- user_id: uuid (pk, fk)
- storage_used_bytes: bigint (required)

### mailing_campaigns
- id: text (pk)
- user_id: uuid (required, fk)
- name: text
- date_envoi: timestamp(tz)
- envoyes: integer (required)
- from_email: text
- subject: text
- accroche: text
- content_html: text
- ouverts: integer (required)
- pct_ouverture: numeric(5
- clics: integer (required)
- pct_clics: numeric(5

### drive_locked_storage_templates
- id: bigint(auto) (pk)
- path: text (required)
- is_active: boolean (required)

### presskit_links
- id: text (pk)
- payload: jsonb (required)

### presskit_user_slugs
- user_id: uuid (pk, fk)
- slug: text (unique)
- payload: jsonb (required)

### contract_templates
- id: uuid (pk)
- user_id: uuid (required, fk)
- title: text (required)
- html_content: text (required)
- variable_keys: jsonb (required)

### user_contract_signatures
- id: uuid (pk)
- user_id: uuid (required, fk)
- label: text (required)
- storage_path: text (required)
- mime_type: text
- file_size_bytes: bigint
- is_active: boolean (required)

### contracts
- id: uuid (pk)
- user_id: uuid (required, fk)
- template_id: uuid (required, fk)
- title: text (required)
- status_updated_at: timestamp(tz) (required)
- signed_at: timestamp(tz)
- sent_at: timestamp(tz)

### calendar_events
- id: uuid (pk)
- user_id: uuid (required, fk)
- date: date (required)
- time: time
- label: text (required)
- sub_label: text
- sector: text (required)
- type: text (required)
- place: text
- source_module: text (required)
- source_id: text (fk)

### ical_tokens
- id: uuid (pk)
- user_id: uuid (required, fk)
- token: uuid (required)

### task_suggestions
- id: uuid (pk)
- user_id: uuid (fk)
- date: date (required)
- suggestions: jsonb (required)

### user_tasks
- id: text (pk)
- user_id: uuid (fk)
- title: text (required)
- status: text (required)
- today_focus: boolean (required)
- description: text
- deadline: text
- sector: text
- subtasks: jsonb (required)

---

# Components

- **Page** — `app/(app)/admin/contrats/page.tsx`
- **TemplatePage** [client] — `app/(app)/admin/contrats/template/page.tsx`
- **AdminDemarchesPage** — `app/(app)/admin/demarches/page.tsx`
- **AdminDocumentsPage** — `app/(app)/admin/documents/page.tsx`
- **AdminPage** — `app/(app)/admin/page.tsx`
- **AdminStatutsPage** — `app/(app)/admin/statuts/page.tsx`
- **CalendarRoute** — `app/(app)/calendar/page.tsx`
- **ContactsRoutePage** — `app/(app)/contacts/page.tsx`
- **DashboardRoute** — `app/(app)/dashboard/page.tsx`
- **EditionPage** — `app/(app)/edition/page.tsx`
- **EditionSyncPage** — `app/(app)/edition/sync/page.tsx`
- **IncomesDroitsAuteurPage** — `app/(app)/incomes/droits-auteur/page.tsx`
- **IncomesDroitsVoisinsPage** — `app/(app)/incomes/droits-voisins/page.tsx`
- **IncomesFacturationPage** — `app/(app)/incomes/facturation/page.tsx`
- **IncomesIntermittencePage** — `app/(app)/incomes/intermittence/page.tsx`
- **IncomesPage** — `app/(app)/incomes/page.tsx`
- **IncomesRoyaltiesPage** — `app/(app)/incomes/royalties/page.tsx`
- **AppLayout** [client] — `app/(app)/layout.tsx`
- **LiveMaterielPage** — `app/(app)/live/materiel/page.tsx`
- **LivePage** — `app/(app)/live/page.tsx`
- **LiveProspectionPage** — `app/(app)/live/prospection/page.tsx`
- **LiveRepetitionsPage** — `app/(app)/live/repetitions/page.tsx`
- **LiveRepresentationsPage** — `app/(app)/live/representations/page.tsx`
- **CalendrierEditorialPage** — `app/(app)/marketing/calendrier-editorial/page.tsx`
- **MailingRoute** — `app/(app)/marketing/mailing/page.tsx`
- **MaillingPage** — `app/(app)/marketing/mailling/page.tsx`
- **MarketingPage** — `app/(app)/marketing/page.tsx`
- **PresskitRoute** — `app/(app)/marketing/presskit/page.tsx`
- **PublicationsPage** — `app/(app)/marketing/publications/page.tsx`
- **PhonoCataloguePage** — `app/(app)/phono/catalogue/page.tsx`
- **PhonoPage** — `app/(app)/phono/page.tsx`
- **PhonoSessionsStudioPage** — `app/(app)/phono/sessions-studio/page.tsx`
- **ProjectDetailPage** — props: params — `app/(app)/projects/[id]/page.tsx`
- **ProjectArchivesPage** — `app/(app)/projects/archives/page.tsx`
- **ActiveProjectsPage** — `app/(app)/projects/page.tsx`
- **MailSettingsRoute** — `app/(app)/settings/mail/page.tsx`
- **SettingsRoute** — `app/(app)/settings/page.tsx`
- **SettingsCustomizationRoute** — `app/(app)/settings/personnalisation/page.tsx`
- **TasksRoute** — `app/(app)/tasks/page.tsx`
- **InscriptionPage** [client] — `app/(auth)/inscription/page.tsx`
- **LoginPage** [client] — `app/(auth)/login/page.tsx`
- **ArticlePage** — props: params — `app/(blog)/blog/[slug]/page.tsx`
- **CategoriePage** — props: params — `app/(blog)/blog/categorie/[slug]/page.tsx`
- **BlogIndexPage** — `app/(blog)/blog/page.tsx`
- **BlogLayout** [client] — `app/(blog)/layout.tsx`
- **LandingTestPage** [client] — `app/landing-test/page.tsx`
- **RootLayout** — `app/layout.tsx`
- **PresskitViewClient** [client] — props: payloadParam, payloadDirect — `app/presskit/view/PresskitViewClient.tsx`
- **PresskitViewIdPage** — props: params — `app/presskit/view/[id]/page.tsx`
- **PresskitViewPage** — props: searchParams — `app/presskit/view/page.tsx`
- **ResetDataPage** [client] — `app/reset-data/page.tsx`
- **TestSupabasePage** [client] — `app/test-supabase/page.tsx`
- **Page** — `src/app/(app)/admin/contrats/page.tsx`
- **TemplatePage** [client] — `src/app/(app)/admin/contrats/template/page.tsx`
- **Page** — `src/app/(app)/admin/documents/page.tsx`
- **AdminPage** — `src/app/(app)/admin/page.tsx`
- **CalendarPage** — `src/app/(app)/calendar/page.tsx`
- **ContactsRoutePage** — `src/app/(app)/contacts/page.tsx`
- **DashboardPage** — `src/app/(app)/dashboard/page.tsx`
- **EditionPage** — `src/app/(app)/edition/page.tsx`
- **IncomesDroitsAuteurPage** — `src/app/(app)/incomes/droits-auteur/page.tsx`
- **IncomesDroitsVoisinsPage** — `src/app/(app)/incomes/droits-voisins/page.tsx`
- **IncomesFacturationPage** — `src/app/(app)/incomes/facturation/page.tsx`
- **IncomesIntermittencePage** — `src/app/(app)/incomes/intermittence/page.tsx`
- **IncomesPage** — `src/app/(app)/incomes/page.tsx`
- **IncomesRoyaltiesPage** — `src/app/(app)/incomes/royalties/page.tsx`
- **AppLayout** — `src/app/(app)/layout.tsx`
- **LiveMaterielPage** — `src/app/(app)/live/materiel/page.tsx`
- **LivePage** — `src/app/(app)/live/page.tsx`
- **LiveRepetitionsPage** — `src/app/(app)/live/repetitions/page.tsx`
- **LiveRepresentationsPage** — `src/app/(app)/live/representations/page.tsx`
- **MarketingPage** — `src/app/(app)/marketing/page.tsx`
- **PhonoCataloguePage** — `src/app/(app)/phono/catalogue/page.tsx`
- **PhonoPage** — `src/app/(app)/phono/page.tsx`
- **PhonoSessionsStudioPage** — `src/app/(app)/phono/sessions-studio/page.tsx`
- **SettingsCustomizationRoute** — `src/app/(app)/settings/personnalisation/page.tsx`
- **TasksRoutePage** — `src/app/(app)/tasks/page.tsx`
- **LoginPage** — `src/app/(auth)/login/page.tsx`
- **DriveLayout** — `src/app/drive/layout.tsx`
- **Page** — `src/app/drive/page.tsx`
- **LandingTestPage** — `src/app/landing-test/page.tsx`
- **RootLayout** [client] — `src/app/layout.tsx`
- **LandingPage** — `src/app/page.tsx`
- **BlogBreadcrumb** — props: categorie, articleTitle — `src/components/blog/BlogBreadcrumb.tsx`
- **BlogCTA** [client] — props: module, moduleLabel, variant — `src/components/blog/BlogCTA.tsx`
- **BlogCard** — props: article — `src/components/blog/BlogCard.tsx`
- **BlogContent** — `src/components/blog/BlogContent.tsx`
- **BlogHeader** — props: article — `src/components/blog/BlogHeader.tsx`
- **BlogInternalLink** [client] — props: module, label — `src/components/blog/BlogInternalLink.tsx`
- **BlogSidebar** — props: articlesLies — `src/components/blog/BlogSidebar.tsx`
- **AuthGuard** [client] — `src/components/layout/AuthGuard.tsx`
- **Header** [client] — `src/components/layout/Header.tsx`
- **SettingsSidebar** [client] — `src/components/layout/SettingsSidebar.tsx`
- **AdminOverviewPage** [client] — `src/modules/admin/components/AdminOverviewPage.tsx`
- **ContractsPage** [client] — `src/modules/admin/components/ContractsPage.tsx`
- **DocumentsPage** [client] — `src/modules/admin/components/DocumentsPage.tsx`
- **IntermittenceDashboardPage** — `src/modules/admin/components/IntermittenceDashboardPage.tsx`
- **IntermittenceMissionsPage** — `src/modules/admin/components/IntermittenceMissionsPage.tsx`
- **ProceduresPage** [client] — `src/modules/admin/components/ProceduresPage.tsx`
- **StatutsPage** [client] — `src/modules/admin/components/StatutsPage.tsx`
- **StructuresPage** — `src/modules/admin/components/StructuresPage.tsx`
- **ContractInstanceEditor** [client] — props: open, onOpenChange, mode, templates, signatures, initial, initialTemplateId, onSave — `src/modules/admin/components/contract/ContractInstanceEditor.tsx`
- **SignaturePad** [client] — props: onFileReady — `src/modules/admin/components/contract/SignaturePad.tsx`
- **TemplateEditor** [client] — props: open, onOpenChange, mode, initial, onSave — `src/modules/admin/components/contract/TemplateEditor.tsx`
- **TemplateEditorFullPage** [client] — props: mode, initial, onSave, onCancel — `src/modules/admin/components/contract/TemplateEditorFullPage.tsx`
- **GlobalCalendarPage** [client] — `src/modules/calendar/components/GlobalCalendarPage.tsx`
- **ICalSyncPanel** [client] — props: allEvents — `src/modules/calendar/components/ICalSyncPanel.tsx`
- **ContactsPage** [client] — `src/modules/contacts/components/ContactsPage.tsx`
- **ProspectionPage** — `src/modules/contacts/components/ProspectionPage.tsx`
- **DashboardPage** [client] — `src/modules/dashboard/components/DashboardPage.tsx`
- **ProfilePage** — `src/modules/dashboard/components/ProfilePage.tsx`
- **SyncPage** [client] — `src/modules/edition/components/SyncPage.tsx`
- **WorksPage** [client] — `src/modules/edition/components/WorksPage.tsx`
- **CopyrightDashboard** [client] — props: entries — `src/modules/incomes/components/CopyrightDashboard.tsx`
- **CopyrightHistorique** [client] — props: releves, onDelete — `src/modules/incomes/components/CopyrightHistorique.tsx`
- **CopyrightPage** [client] — `src/modules/incomes/components/CopyrightPage.tsx`
- **IncomesOverviewPage** — `src/modules/incomes/components/IncomesOverviewPage.tsx`
- **IntermittenceDashboard** — props: missions, onNavigate, onAddMission — `src/modules/incomes/components/IntermittenceDashboard.tsx`
- **IntermittenceMissions** — props: intermittenceMissions, setIntermittenceMissions, onAddMission, onEditMission, onDeleteMission — `src/modules/incomes/components/IntermittenceMissions.tsx`
- **IntermittenceModal** — props: open, onClose, onSave, mission — `src/modules/incomes/components/IntermittenceModal.tsx`
- **IntermittencePage** [client] — `src/modules/incomes/components/IntermittencePage.tsx`
- **InvoicesPage** [client] — `src/modules/incomes/components/InvoicesPage.tsx`
- **NeighboringRightsPage** — `src/modules/incomes/components/NeighboringRightsPage.tsx`
- **RoyaltiesDashboard** [client] — props: entries — `src/modules/incomes/components/RoyaltiesDashboard.tsx`
- **RoyaltiesImports** [client] — props: imports, manualEntries, defaultTab, onImport, onTabChange, onAddManual, onEditManual, onDeleteManual — `src/modules/incomes/components/RoyaltiesImports.tsx`
- **RoyaltiesManualModal** [client] — props: open, onClose, onSave, entry — `src/modules/incomes/components/RoyaltiesManualModal.tsx`
- **RoyaltiesPage** [client] — `src/modules/incomes/components/RoyaltiesPage.tsx`
- **EquipmentPage** [client] — `src/modules/live/components/EquipmentPage.tsx`
- **LiveOverviewPage** [client] — `src/modules/live/components/LiveOverviewPage.tsx`
- **ProspectionPage** [client] — `src/modules/live/components/ProspectionPage.tsx`
- **RehearsalsPage** [client] — `src/modules/live/components/RehearsalsPage.tsx`
- **TourDatesPage** [client] — `src/modules/live/components/TourDatesPage.tsx`
- **MailingPage** [client] — `src/modules/marketing/components/MailingPage.tsx`
- **MarketingCalendar** [client] — `src/modules/marketing/components/MarketingCalendar.tsx`
- **MarketingOverviewPage** — `src/modules/marketing/components/MarketingOverviewPage.tsx`
- **PresskitPage** [client] — `src/modules/marketing/components/PresskitPage.tsx`
- **MAILING_STORAGE_KEYS** — `src/modules/marketing/data/mailing.tsx`
- **AlbumsPage** — `src/modules/phono/components/AlbumsPage.tsx`
- **CatalogPage** [client] — `src/modules/phono/components/CatalogPage.tsx`
- **PhonoOverviewPage** — `src/modules/phono/components/PhonoOverviewPage.tsx`
- **SessionsPage** — `src/modules/phono/components/SessionsPage.tsx`
- **SessionsStudioPage** [client] — `src/modules/phono/components/SessionsStudioPage.tsx`
- **TracksPage** — `src/modules/phono/components/TracksPage.tsx`
- **ArchivesPage** [client] — `src/modules/projects/components/ArchivesPage.tsx`
- **ProjectArchiveRow** [client] — props: project, onUnarchive — `src/modules/projects/components/ProjectArchiveRow.tsx`
- **ProjectCard** [client] — props: project, onEdit, onArchive, onDelete — `src/modules/projects/components/ProjectCard.tsx`
- **ProjectDashboard** [client] — props: projectId — `src/modules/projects/components/ProjectDashboard.tsx`
- **ProjectModal** [client] — props: open, onClose, project — `src/modules/projects/components/ProjectModal.tsx`
- **ProjectsPage** [client] — `src/modules/projects/components/ProjectsPage.tsx`
- **EditionSection** [client] — props: project — `src/modules/projects/components/sections/EditionSection.tsx`
- **LiveSection** [client] — props: project — `src/modules/projects/components/sections/LiveSection.tsx`
- **PhonoSection** [client] — props: project — `src/modules/projects/components/sections/PhonoSection.tsx`
- **WorkTrackLinker** [client] — props: project — `src/modules/projects/components/sections/WorkTrackLinker.tsx`
- **CustomizationPage** [client] — `src/modules/settings/components/CustomizationPage.tsx`
- **MailSettingsPage** [client] — `src/modules/settings/components/MailSettingsPage.tsx`
- **SettingsPage** [client] — `src/modules/settings/components/SettingsPage.tsx`
- **AiSuggestions** [client] — props: userId, tasks, calendarEvents, enabledModules, aiInstructions, onAdd — `src/modules/tasks/components/AiSuggestions.tsx`
- **BacklogPanel** [client] — props: tasks, userId, enabledModules, aiInstructions, calendarEvents, onStatusChange, onAddToToday, onEdit, onDelete, onAddSuggestion — `src/modules/tasks/components/BacklogPanel.tsx`
- **TaskCard** [client] — props: task, context, onStatusChange, onAddToToday, onRemoveFromToday, onEdit, onDelete, dragHandleProps, isDragging, onSubtaskToggle — `src/modules/tasks/components/TaskCard.tsx`
- **TaskModal** [client] — props: open, onClose, onSave, task, allowedSectors — `src/modules/tasks/components/TaskModal.tsx`
- **Tasks** [client] — `src/modules/tasks/components/Tasks.tsx`
- **TasksPage** — `src/modules/tasks/components/TasksPage.tsx`
- **TodayPanel** [client] — props: tasks, onStatusChange, onRemoveFromToday, onEdit, onDelete, onSubtaskToggle, onSubtaskAdd, onSubtaskRename — `src/modules/tasks/components/TodayPanel.tsx`

---

# Libraries

- `src/hooks/useContractsData.ts` — function useContractsData: () => void
- `src/hooks/useDriveData.ts` — function useDriveData: () => UseDriveDataResult, interface UseDriveDataResult
- `src/hooks/useLocalStorage.ts` — function useLocalStorage: (key, initialValue) => [T, (value: T | ((val: T) => T)) => void]
- `src/hooks/useSidekickData.ts` — function useSidekickData: () => void
- `src/hooks/useTasksData.ts` — function useTasksData: () => void
- `src/lib/blog.ts`
  - function getArticles: () => BlogArticleMeta[]
  - function getArticleBySlug: (slug) => BlogArticle | null
  - function getArticlesByCategorie: (categorie) => BlogArticleMeta[]
  - function getArticlesLies: (article, limit) => BlogArticleMeta[]
  - function getAllCategories: () => BlogCategorie[]
- `src/lib/calendar-sync.ts` — function syncEventToSupabase: (event, action, userId) => Promise<void>
- `src/lib/contracts-db.ts`
  - function fetchUserContractTemplates: (supabase, userId) => Promise<ContractTemplate[]>
  - function insertContractTemplate: (supabase, userId, payload) => Promise<ContractTemplate>
  - function updateContractTemplate: (supabase, userId, templateId, payload) => Promise<ContractTemplate>
  - function deleteContractTemplate: (supabase, userId, templateId) => Promise<void>
  - function fetchUserContracts: (supabase, userId) => Promise<ContractInstance[]>
  - function insertContract: (supabase, userId, payload, unknown>;
    htmlContent) => Promise<ContractInstance>
  - _...13 more_
- `src/lib/date-format.ts`
  - function isValidDateFr: (value) => boolean
  - function isoToFr: (isoDate) => string
  - function frToIso: (frDate) => string
  - function toDisplayDate: (dateStr) => string
  - const DATE_FORMAT_PLACEHOLDER
- `src/lib/drive-db.ts`
  - function fetchUserFolders: (supabase, userId) => Promise<DriveFolder[]>
  - function fetchUserDocuments: (supabase, userId) => Promise<DriveDocument[]>
  - function getUserStorageUsed: (supabase, userId) => Promise<number>
  - function addStorageUsed: (supabase, userId, bytes) => Promise<void>
  - function subtractStorageUsed: (supabase, userId, bytes) => Promise<void>
  - function insertDocument: (supabase, userId, doc) => Promise<DriveDocument>
  - _...29 more_
- `src/lib/ical-generator.ts` — function generateICalContent: (events) => string, type ICalEvent
- `src/lib/sidekick-store.ts`
  - function getStorageKey: (userId) => string
  - function mergeWithDefaults: (partial) => SidekickData
  - interface Todo
  - interface AdminStatus
  - interface AdminStructure
  - interface AdminProcedure
  - _...38 more_
- `src/lib/supabase-server.ts` — function createServerSupabase: () => void
- `src/lib/supabase.ts` — function createClient: () => void
- `src/lib/utils.ts` — function cn: (...classes) => void
- `src/modules/incomes/parsers/cdbaby.ts` — function parseCdBaby: (headers, rows) => RoyaltyEntry[]
- `src/modules/incomes/parsers/copyright-types.ts`
  - function getPaysLabel: (code) => string
  - function formatEUR: (n) => string
  - interface CopyrightEntry
  - interface CopyrightReleve
  - type TypeUtilisation
  - type TypeDroit
  - _...6 more_
- `src/modules/incomes/parsers/distrokid.ts` — function parseDistroKid: (headers, rows) => RoyaltyEntry[]
- `src/modules/incomes/parsers/parse-period.ts` — function parsePeriod: (raw) => string
- `src/modules/incomes/parsers/soundcloud.ts` — function parseSoundCloud: (headers, rows) => RoyaltyEntry[]
- `src/modules/incomes/parsers/tunecore.ts` — function parseTuneCore: (headers, rows) => RoyaltyEntry[]
- `src/modules/marketing/data/calendrier-editorial.ts`
  - function normalizeEditorialEvent: (event) => EditorialEvent
  - interface EditorialEvent
  - interface EditorialEventForm
  - type EditorialPlatform
  - type EditorialStatus
  - type EditorialContentType
  - _...4 more_
- `src/modules/marketing/lib/presskit-share.ts`
  - function encodePresskitForShare: (profile) => string
  - function decodePresskitFromShare: (encoded) => PresskitProfile | null
  - function getPresskitShareUrl: (encoded) => string

---

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

---

# Dependency Graph

## Most Imported Files (change these carefully)

- `src/components/ui/button.tsx` — imported by **52** files
- `src/components/ui/input.tsx` — imported by **29** files
- `src/components/ui/card.tsx` — imported by **25** files
- `src/lib/sidekick-store.ts` — imported by **23** files
- `src/components/ui/textarea.tsx` — imported by **23** files
- `src/lib/supabase.ts` — imported by **21** files
- `src/hooks/useSidekickData.ts` — imported by **20** files
- `src/components/ui/label.tsx` — imported by **18** files
- `src/lib/utils.ts` — imported by **15** files
- `src/hooks/useLocalStorage.ts` — imported by **14** files
- `types/blog.ts` — imported by **13** files
- `src/lib/supabase-server.ts` — imported by **12** files
- `src/components/ui/utils.ts` — imported by **11** files
- `src/components/ui/date-picker.tsx` — imported by **11** files
- `src/components/ui/checkbox.tsx` — imported by **7** files
- `src/modules/incomes/parsers/royalties-types.ts` — imported by **7** files
- `src/components/ui/badge.tsx` — imported by **6** files
- `src/components/ui/dialog.tsx` — imported by **6** files
- `src/lib/date-format.ts` — imported by **5** files
- `src/hooks/useContractsData.ts` — imported by **4** files

## Import Map (who imports what)

- `src/components/ui/button.tsx` ← `app/(auth)/inscription/page.tsx`, `app/(auth)/login/page.tsx`, `app/landing-test/page.tsx`, `src/app/landing-test/page.tsx`, `src/components/layout/Header.tsx` +47 more
- `src/components/ui/input.tsx` ← `app/(auth)/inscription/page.tsx`, `app/(auth)/login/page.tsx`, `app/landing-test/page.tsx`, `src/modules/admin/components/ContractsPage.tsx`, `src/modules/admin/components/DocumentsPage.tsx` +24 more
- `src/components/ui/card.tsx` ← `app/landing-test/page.tsx`, `src/app/landing-test/page.tsx`, `src/modules/admin/components/AdminOverviewPage.tsx`, `src/modules/admin/components/ContractsPage.tsx`, `src/modules/admin/components/DocumentsPage.tsx` +20 more
- `src/lib/sidekick-store.ts` ← `app/reset-data/page.tsx`, `src/hooks/useTasksData.ts`, `src/modules/admin/components/ProceduresPage.tsx`, `src/modules/admin/components/StatutsPage.tsx`, `src/modules/edition/components/SyncPage.tsx` +18 more
- `src/components/ui/textarea.tsx` ← `src/modules/admin/components/ContractsPage.tsx`, `src/modules/admin/components/ProceduresPage.tsx`, `src/modules/admin/components/StatutsPage.tsx`, `src/modules/admin/components/contract/ContractInstanceEditor.tsx`, `src/modules/admin/components/contract/TemplateEditor.tsx` +18 more
- `src/lib/supabase.ts` ← `app/(auth)/inscription/page.tsx`, `app/(auth)/login/page.tsx`, `app/(blog)/layout.tsx`, `app/reset-data/page.tsx`, `app/test-supabase/page.tsx` +16 more
- `src/hooks/useSidekickData.ts` ← `src/components/layout/Sidebar.tsx`, `src/modules/admin/components/AdminOverviewPage.tsx`, `src/modules/admin/components/ProceduresPage.tsx`, `src/modules/admin/components/StatutsPage.tsx`, `src/modules/calendar/components/GlobalCalendarPage.tsx` +15 more
- `src/components/ui/label.tsx` ← `app/(auth)/inscription/page.tsx`, `app/(auth)/login/page.tsx`, `app/landing-test/page.tsx`, `src/modules/calendar/components/ICalSyncPanel.tsx`, `src/modules/contacts/components/ContactsPage.tsx` +13 more
- `src/lib/utils.ts` ← `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/utils.ts` +10 more
- `src/hooks/useLocalStorage.ts` ← `src/modules/calendar/components/GlobalCalendarPage.tsx`, `src/modules/contacts/components/ContactsPage.tsx`, `src/modules/dashboard/components/DashboardPage.tsx`, `src/modules/incomes/components/IntermittencePage.tsx`, `src/modules/incomes/components/InvoicesPage.tsx` +9 more

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_