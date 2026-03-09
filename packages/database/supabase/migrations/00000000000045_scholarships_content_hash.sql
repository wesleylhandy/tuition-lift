-- Migration: Add content_hash to scholarships for identity propagation and dedup.
-- Hash canonical fields (url, title, deadline, amount) at discovery for upsert ON CONFLICT.

ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS content_hash text;

-- Partial unique index: enforces dedup when content_hash is set; allows multiple NULLs (legacy).
CREATE UNIQUE INDEX idx_scholarships_content_hash_unique
  ON public.scholarships(content_hash)
  WHERE content_hash IS NOT NULL;
