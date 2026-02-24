-- Migration: Create landing_stats table (011)
-- Purpose: Platform-wide metrics displayed on the landing page (debt lifted, student count, match rate)
-- RLS: Public SELECT (anon + authenticated). INSERT/UPDATE/DELETE service-role only. No user writes.
-- Per data-model.md and specs/011-landing-marketing-ui

CREATE TABLE public.landing_stats (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_key text NOT NULL UNIQUE,
  total_debt_lifted_cents bigint NOT NULL DEFAULT 0 CHECK (total_debt_lifted_cents >= 0),
  student_count integer NOT NULL DEFAULT 0 CHECK (student_count >= 0),
  match_rate_percent integer NOT NULL DEFAULT 0 CHECK (match_rate_percent >= 0 AND match_rate_percent <= 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_stats ENABLE ROW LEVEL SECURITY;

-- Public read for landing page stats display
CREATE POLICY "landing_stats_select_public"
  ON public.landing_stats
  FOR SELECT
  USING (true);
