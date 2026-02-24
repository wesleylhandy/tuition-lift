-- Migration: Create scout_runs table for Scout status polling
-- RLS: Authenticated users can SELECT/INSERT/UPDATE only own rows (user_id = auth.uid())
-- See specs/007-scout-vision-ingestion/data-model.md §2

-- Scout step enum for run progress
CREATE TYPE scout_step AS ENUM (
  'reading_document',
  'searching_sources',
  'calculating_trust',
  'complete',
  'error'
);

CREATE TABLE public.scout_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step scout_step NOT NULL,
  message text,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_scout_runs_user_id ON public.scout_runs(user_id);

ALTER TABLE public.scout_runs ENABLE ROW LEVEL SECURITY;

-- Owner can select own runs
CREATE POLICY "scout_runs_select_own"
  ON public.scout_runs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Owner can insert own runs (on run start)
CREATE POLICY "scout_runs_insert_own"
  ON public.scout_runs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owner can update own runs (on step change)
CREATE POLICY "scout_runs_update_own"
  ON public.scout_runs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
