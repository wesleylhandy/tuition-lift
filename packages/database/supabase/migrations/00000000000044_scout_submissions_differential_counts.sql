-- Migration: Add url_count and file_count to scout_submissions (Phase 9)
-- Enables differential rate limiting: URL/name vs file submissions
-- See specs/016-manual-scout-ui/data-model.md §1 Phase 9, contracts/scout-rate-limit-api.md §5

ALTER TABLE public.scout_submissions
  ADD COLUMN IF NOT EXISTS url_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS file_count integer NOT NULL DEFAULT 0;

-- Backfill: treat existing count as file_count for backward compat (conservative)
UPDATE public.scout_submissions
SET file_count = count
WHERE url_count = 0 AND file_count = 0 AND count > 0;
