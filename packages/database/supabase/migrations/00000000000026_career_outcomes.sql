-- Migration: Create career_outcomes table (009)
-- Purpose: Year-5 income by major (CIP) / occupation (SOC) for ROI comparison
-- RLS: Public read. Upsert via service role.
-- Per data-model.md §7

CREATE TABLE public.career_outcomes (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  cip_code text NULL,
  soc_code text NULL,
  major_name text NOT NULL,
  career_path text NULL,
  mean_annual_wage numeric(12,2) NULL,
  source text NULL CHECK (source IS NULL OR source IN ('bls', 'manual')),
  data_year integer NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.career_outcomes ENABLE ROW LEVEL SECURITY;

-- Public read for ROI comparison and agent
CREATE POLICY "career_outcomes_select_public"
  ON public.career_outcomes
  FOR SELECT
  USING (true);

-- Indexes per data-model.md §7: cip_code, soc_code, major_name
CREATE INDEX idx_career_outcomes_cip_code ON public.career_outcomes(cip_code);
CREATE INDEX idx_career_outcomes_soc_code ON public.career_outcomes(soc_code);
CREATE INDEX idx_career_outcomes_major_name ON public.career_outcomes(major_name);
