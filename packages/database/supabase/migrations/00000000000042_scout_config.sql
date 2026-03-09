-- Migration: Create scout_config table for global Scout settings
-- RLS: Public SELECT; admin updates via service-role
-- See specs/016-manual-scout-ui/data-model.md §1a

CREATE TABLE public.scout_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_submission_limit integer NOT NULL DEFAULT 15,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scout_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scout_config_select_public"
  ON public.scout_config FOR SELECT USING (true);

-- Single default row (limit 15 per cycle)
INSERT INTO public.scout_config (scout_submission_limit) VALUES (15);
