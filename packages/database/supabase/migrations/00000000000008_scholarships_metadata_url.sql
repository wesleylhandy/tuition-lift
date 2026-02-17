-- Migration: Scholarships metadata JSONB and UNIQUE(url) for 004 Advisor Discovery
-- Per data-model.md §2, FR-015, FR-016: metadata for search provenance; upsert by URL

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS metadata jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Default updated_at for existing rows; trigger for new/updated rows
UPDATE public.scholarships SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.scholarships ALTER COLUMN updated_at SET DEFAULT now();

-- UNIQUE(url) partial index for upsert ON CONFLICT(url); null URLs excluded
CREATE UNIQUE INDEX IF NOT EXISTS scholarships_url_unique
  ON public.scholarships(url)
  WHERE url IS NOT NULL;
