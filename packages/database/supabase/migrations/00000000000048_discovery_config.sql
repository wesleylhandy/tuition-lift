-- Migration: Create discovery_config table for rate limits and deep-scout bounds.
-- RLS: Public read (agent, web); service-role write.
-- Per data-model.md §2.4

CREATE TABLE public.discovery_config (
  id text NOT NULL PRIMARY KEY,
  cooldown_minutes integer NOT NULL DEFAULT 60,
  per_day_cap integer NOT NULL DEFAULT 5,
  max_depth integer NOT NULL DEFAULT 2,
  max_links_per_page integer NOT NULL DEFAULT 50,
  max_records_per_run integer NOT NULL DEFAULT 500,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discovery_config ENABLE ROW LEVEL SECURITY;

-- Public read for agent and web (trigger checks, deep-scout limits)
CREATE POLICY "discovery_config_select_public"
  ON public.discovery_config
  FOR SELECT
  USING (true);

-- Seed default config (idempotent)
INSERT INTO public.discovery_config (id, cooldown_minutes, per_day_cap, max_depth, max_links_per_page, max_records_per_run)
VALUES ('default', 60, 5, 2, 50, 500)
ON CONFLICT (id) DO NOTHING;
