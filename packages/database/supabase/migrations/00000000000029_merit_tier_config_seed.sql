-- Migration: Seed merit_tier_config (009 T016)
-- Purpose: Insert default merit tier cutoffs for award years 2026, 2027
-- Per data-model.md §3b; research.md §2; tasks.md T016
-- Tiers: presidential, deans, merit, incentive
-- gpa_min_no_test: higher GPA threshold when no test score (test-optional)
-- Idempotent: ON CONFLICT updates allow re-running without duplicates

INSERT INTO public.merit_tier_config (
  award_year,
  tier_name,
  gpa_min,
  gpa_max,
  sat_min,
  sat_max,
  act_min,
  act_max,
  gpa_min_no_test
) VALUES
  -- Presidential/Elite
  (2026, 'presidential', 3.90, 4.00, 1500, 1600, 33, 36, 4.00),
  (2027, 'presidential', 3.90, 4.00, 1500, 1600, 33, 36, 4.00),
  -- Dean's/Excellence
  (2026, 'deans', 3.70, 3.89, 1350, 1490, 29, 32, 3.85),
  (2027, 'deans', 3.70, 3.89, 1350, 1490, 29, 32, 3.85),
  -- Merit/Achievement
  (2026, 'merit', 3.50, 3.69, 1200, 1340, 25, 28, 3.65),
  (2027, 'merit', 3.50, 3.69, 1200, 1340, 25, 28, 3.65),
  -- Incentive/Recognition
  (2026, 'incentive', 3.00, 3.49, 1100, 1190, 21, 24, 3.25),
  (2027, 'incentive', 3.00, 3.49, 1100, 1190, 21, 24, 3.25)
ON CONFLICT (award_year, tier_name) DO UPDATE SET
  gpa_min = EXCLUDED.gpa_min,
  gpa_max = EXCLUDED.gpa_max,
  sat_min = EXCLUDED.sat_min,
  sat_max = EXCLUDED.sat_max,
  act_min = EXCLUDED.act_min,
  act_max = EXCLUDED.act_max,
  gpa_min_no_test = EXCLUDED.gpa_min_no_test,
  updated_at = now();
