-- Migration: Add scholarships.source column for provenance
-- Nullable for backward compatibility; Scout confirm sets source = 'manual'
-- See specs/016-manual-scout-ui/data-model.md §2

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS source text
  CHECK (source IS NULL OR source IN ('manual', 'search', 'warehouse', 'institution'));
