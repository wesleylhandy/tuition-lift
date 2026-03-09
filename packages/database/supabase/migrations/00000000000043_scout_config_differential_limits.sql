-- Migration: Add differential rate limits to scout_config (Phase 9)
-- URL/name inputs use Tavily (cheaper); file inputs use Vision LLM (expensive)
-- See specs/016-manual-scout-ui/data-model.md §1a Phase 9, contracts/scout-rate-limit-api.md §5

ALTER TABLE public.scout_config
  ADD COLUMN IF NOT EXISTS scout_url_limit integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS scout_file_limit integer NOT NULL DEFAULT 15;

-- Backfill existing row: use scout_submission_limit for scout_file_limit
UPDATE public.scout_config
SET scout_file_limit = scout_submission_limit;
