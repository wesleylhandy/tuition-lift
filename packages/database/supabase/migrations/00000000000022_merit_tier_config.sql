-- Migration: Create merit_tier_config table (009)
-- Purpose: Award-year-scoped merit tier cutoffs (GPA/SAT/ACT per tier; gpa_min_no_test for test-optional)
-- RLS: Service role write; anon/service read for agent and matching logic.
-- Per data-model.md §3b

CREATE TABLE public.merit_tier_config (
  award_year integer NOT NULL,
  tier_name text NOT NULL,
  gpa_min numeric(3,2) NULL,
  gpa_max numeric(3,2) NULL,
  sat_min integer NULL,
  sat_max integer NULL,
  act_min integer NULL,
  act_max integer NULL,
  gpa_min_no_test numeric(3,2) NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (award_year, tier_name)
);

ALTER TABLE public.merit_tier_config ENABLE ROW LEVEL SECURITY;

-- Public read for agent (load-profile, discovery) and tier matching
CREATE POLICY "merit_tier_config_select_public"
  ON public.merit_tier_config
  FOR SELECT
  USING (true);
