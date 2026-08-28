ALTER TABLE user_live_prospection
  ADD COLUMN IF NOT EXISTS instagram text NOT NULL DEFAULT '';
