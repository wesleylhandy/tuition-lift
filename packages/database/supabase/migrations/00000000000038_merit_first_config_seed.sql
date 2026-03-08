-- Migration: Seed merit_first_config (014 US3 T031)
-- Purpose: Default SAI threshold for Merit-First Mode; SAI above this prioritizes Need-Blind/merit-tier
-- Per data-model.md §2.4; research.md §1; tasks.md T031
-- Values: 15000 (example threshold; adjust per product)
-- Idempotent: ON CONFLICT updates allow re-running without duplicates

INSERT INTO public.merit_first_config (award_year, merit_first_sai_threshold)
VALUES
  (2025, 15000),
  (2026, 15000),
  (2027, 15000),
  (2028, 15000),
  (2029, 15000)
ON CONFLICT (award_year) DO UPDATE SET
  merit_first_sai_threshold = EXCLUDED.merit_first_sai_threshold,
  updated_at = now();
