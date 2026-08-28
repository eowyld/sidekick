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
