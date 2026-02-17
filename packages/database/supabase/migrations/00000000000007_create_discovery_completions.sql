-- Migration: discovery_completions table for notification and status polling (003 US1)
-- Per data-model.md §9; discovery_run_id for 006 dismissals scoping.
-- RLS: user_id = auth.uid()

CREATE TABLE public.discovery_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_run_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_discovery_completions_user_id ON public.discovery_completions(user_id);
CREATE INDEX idx_discovery_completions_discovery_run_id ON public.discovery_completions(discovery_run_id);
CREATE INDEX idx_discovery_completions_thread_id ON public.discovery_completions(thread_id);

ALTER TABLE public.discovery_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discovery_completions_select_own"
  ON public.discovery_completions
  FOR SELECT
  USING (auth.uid() = user_id);
