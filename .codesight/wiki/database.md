# Database

> **Navigation aid.** Schema shapes and field types extracted via AST. Read the actual schema source files before writing migrations or query logic.

**unknown** — 14 models

### user_document_folders

pk: `id` (uuid) · fk: user_id

- `id`: uuid _(pk)_
- `user_id`: uuid _(required, fk)_
- `name`: text _(required)_

### user_documents

pk: `id` (uuid) · fk: user_id, folder_id

- `id`: uuid _(pk)_
- `user_id`: uuid _(required, fk)_
- `title`: text _(required)_
- `folder_id`: text _(fk)_
- `link`: text
- `category`: text
- `source_module`: text
- `notes`: text
- `date_added`: date
- `date_modified`: date

### user_drive_storage

pk: `user_id` (uuid) · fk: user_id

- `user_id`: uuid _(pk, fk)_
- `storage_used_bytes`: bigint _(required)_

### mailing_campaigns

pk: `id` (text) · fk: user_id

- `id`: text _(pk)_
- `user_id`: uuid _(required, fk)_
- `name`: text
- `date_envoi`: timestamp(tz)
- `envoyes`: integer _(required)_
- `from_email`: text
- `subject`: text
- `accroche`: text
- `content_html`: text
- `ouverts`: integer _(required)_
- `pct_ouverture`: numeric(5
- `clics`: integer _(required)_
- `pct_clics`: numeric(5

### drive_locked_storage_templates

pk: `id` (bigint(auto))

- `id`: bigint(auto) _(pk)_
- `path`: text _(required)_
- `is_active`: boolean _(required)_

### presskit_links

pk: `id` (text)

- `id`: text _(pk)_
- `payload`: jsonb _(required)_

### presskit_user_slugs

pk: `user_id` (uuid) · fk: user_id

- `user_id`: uuid _(pk, fk)_
- `slug`: text _(unique)_
- `payload`: jsonb _(required)_

### contract_templates

pk: `id` (uuid) · fk: user_id

- `id`: uuid _(pk)_
- `user_id`: uuid _(required, fk)_
- `title`: text _(required)_
- `html_content`: text _(required)_
- `variable_keys`: jsonb _(required)_

### user_contract_signatures

pk: `id` (uuid) · fk: user_id

- `id`: uuid _(pk)_
- `user_id`: uuid _(required, fk)_
- `label`: text _(required)_
- `storage_path`: text _(required)_
- `mime_type`: text
- `file_size_bytes`: bigint
- `is_active`: boolean _(required)_

### contracts

pk: `id` (uuid) · fk: user_id, template_id

- `id`: uuid _(pk)_
- `user_id`: uuid _(required, fk)_
- `template_id`: uuid _(required, fk)_
- `title`: text _(required)_
- `status_updated_at`: timestamp(tz) _(required)_
- `signed_at`: timestamp(tz)
- `sent_at`: timestamp(tz)

### calendar_events

pk: `id` (uuid) · fk: user_id, source_id

- `id`: uuid _(pk)_
- `user_id`: uuid _(required, fk)_
- `date`: date _(required)_
- `time`: time
- `label`: text _(required)_
- `sub_label`: text
- `sector`: text _(required)_
- `type`: text _(required)_
- `place`: text
- `source_module`: text _(required)_
- `source_id`: text _(fk)_

### ical_tokens

pk: `id` (uuid) · fk: user_id

- `id`: uuid _(pk)_
- `user_id`: uuid _(required, fk)_
- `token`: uuid _(required)_

### task_suggestions

pk: `id` (uuid) · fk: user_id

- `id`: uuid _(pk)_
- `user_id`: uuid _(fk)_
- `date`: date _(required)_
- `suggestions`: jsonb _(required)_

### user_tasks

pk: `id` (text) · fk: user_id

- `id`: text _(pk)_
- `user_id`: uuid _(fk)_
- `title`: text _(required)_
- `status`: text _(required)_
- `today_focus`: boolean _(required)_
- `description`: text
- `deadline`: text
- `sector`: text
- `subtasks`: jsonb _(required)_

## Schema Source Files

Search for ORM schema declarations:
- Drizzle: `pgTable` / `mysqlTable` / `sqliteTable`
- Prisma: `prisma/schema.prisma`
- TypeORM: `@Entity()` decorator
- SQLAlchemy: class inheriting `Base`

---
_Back to [overview.md](./overview.md)_