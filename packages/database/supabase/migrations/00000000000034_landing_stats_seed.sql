-- Migration: Seed landing_stats (011 T034)
-- Purpose: Default platform metrics for landing page display ($2.4M lifted, 15K students, 94% match)
-- Per quickstart.md and contracts/landing-sections.md. Idempotent via ON CONFLICT.

INSERT INTO public.landing_stats (
  stat_key,
  total_debt_lifted_cents,
  student_count,
  match_rate_percent
) VALUES
  ('default', 240000000, 15000, 94)
ON CONFLICT (stat_key) DO NOTHING;
