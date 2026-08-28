ALTER TABLE user_live_prospection
  ADD COLUMN IF NOT EXISTS touchpoints jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reliability_tier text NOT NULL DEFAULT 'neutral';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_live_prospection_reliability_tier_check'
  ) THEN
    ALTER TABLE user_live_prospection
      ADD CONSTRAINT user_live_prospection_reliability_tier_check
      CHECK (reliability_tier IN ('easy', 'neutral', 'hard'));
  END IF;
END $$;
