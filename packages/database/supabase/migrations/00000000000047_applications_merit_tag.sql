-- Migration: Add merit_tag to applications for Coach prioritization.
-- Persisted when Tracking from discovery; e.g. "merit", "need_blind"

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS merit_tag text;
