-- Migration: Create scholarship_cycle_verifications table (014 Award Year Intelligence)
-- Purpose: Per-cycle verification history; re-verification checks for past-deadline scholarships
-- RLS: Public read (agent, web); service-role write
-- Per data-model.md §2.3

CREATE TABLE public.scholarship_cycle_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scholarship_id uuid NOT NULL REFERENCES public.scholarships(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scholarship_cycle_verifications_scholarship_academic_year_key
    UNIQUE (scholarship_id, academic_year),
  CONSTRAINT scholarship_cycle_verifications_academic_year_format
    CHECK (academic_year ~ '^\d{4}-\d{4}$')
);

ALTER TABLE public.scholarship_cycle_verifications ENABLE ROW LEVEL SECURITY;

-- Public read for agent (db-first lookup) and web
CREATE POLICY "scholarship_cycle_verifications_select_public"
  ON public.scholarship_cycle_verifications
  FOR SELECT
  USING (true);

-- Indexes for "verified for cycle X?" lookups
CREATE INDEX idx_scholarship_cycle_verifications_scholarship_id
  ON public.scholarship_cycle_verifications(scholarship_id);
CREATE INDEX idx_scholarship_cycle_verifications_academic_year
  ON public.scholarship_cycle_verifications(academic_year);
