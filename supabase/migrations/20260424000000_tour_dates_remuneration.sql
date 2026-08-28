-- supabase/migrations/20260424000000_tour_dates_remuneration.sql
ALTER TABLE user_tour_dates
  ADD COLUMN IF NOT EXISTS invoice_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mission_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
