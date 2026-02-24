-- Migration: Seed sai_zone_config (009 T015)
-- Purpose: Insert default SAI zone boundaries for current and next award years
-- Per data-model.md §3a; research.md §1; tasks.md T015
-- Values: Pell cutoff (~7395 federal), Grey Zone end (~25000), Merit Lean threshold (~30000)
-- Idempotent: ON CONFLICT updates allow re-running without duplicates

INSERT INTO public.sai_zone_config (award_year, pell_cutoff, grey_zone_end, merit_lean_threshold)
VALUES
  (2026, 7395, 25000, 30000),
  (2027, 7395, 25000, 30000)
ON CONFLICT (award_year) DO UPDATE SET
  pell_cutoff = EXCLUDED.pell_cutoff,
  grey_zone_end = EXCLUDED.grey_zone_end,
  merit_lean_threshold = EXCLUDED.merit_lean_threshold,
  updated_at = now();
