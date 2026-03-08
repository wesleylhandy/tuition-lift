-- Migration: Create merit_first_config table (014 Award Year Intelligence)
-- Purpose: Configurable SAI threshold for Merit-First Mode; when profile SAI > threshold, prioritize Need-Blind/merit-tier
-- RLS: Public read (agent); service-role write
-- Per data-model.md §2.4; pattern mirrors sai_zone_config (009)

CREATE TABLE public.merit_first_config (
  award_year integer NOT NULL PRIMARY KEY,
  merit_first_sai_threshold integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.merit_first_config ENABLE ROW LEVEL SECURITY;

-- Public read for agent (Advisor flow, Merit-First Mode)
CREATE POLICY "merit_first_config_select_public"
  ON public.merit_first_config
  FOR SELECT
  USING (true);
