-- Migration: Create sai_zone_config table (009)
-- Purpose: Award-year-scoped SAI zone thresholds (Pell cutoff, Grey Zone end, merit-lean threshold)
-- RLS: Service role write; anon/service read for agent and COA comparison.
-- Per data-model.md §3a

CREATE TABLE public.sai_zone_config (
  award_year integer NOT NULL PRIMARY KEY,
  pell_cutoff integer NOT NULL,
  grey_zone_end integer NOT NULL,
  merit_lean_threshold integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sai_zone_config ENABLE ROW LEVEL SECURITY;

-- Public read for agent (load-profile, discovery) and COA comparison
CREATE POLICY "sai_zone_config_select_public"
  ON public.sai_zone_config
  FOR SELECT
  USING (true);
