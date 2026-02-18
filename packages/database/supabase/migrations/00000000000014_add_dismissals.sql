-- Migration: Add dismissals table
-- RLS: Authenticated users can INSERT/SELECT/DELETE own rows only (no UPDATE - immutable).
-- Per data-model.md: soft-dismiss tracking for Match Inbox; scoped by discovery_run_id.

CREATE TABLE public.dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scholarship_id uuid NOT NULL REFERENCES public.scholarships(id) ON DELETE CASCADE,
  discovery_run_id uuid,
  dismissed_at timestamptz NOT NULL DEFAULT now()
);

-- Unique: (user_id, scholarship_id, discovery_run_id) when run present; (user_id, scholarship_id) when null
CREATE UNIQUE INDEX idx_dismissals_user_scholarship_run
  ON public.dismissals (user_id, scholarship_id, discovery_run_id)
  WHERE discovery_run_id IS NOT NULL;

CREATE UNIQUE INDEX idx_dismissals_user_scholarship_null_run
  ON public.dismissals (user_id, scholarship_id)
  WHERE discovery_run_id IS NULL;

CREATE INDEX idx_dismissals_user_id ON public.dismissals (user_id);

ALTER TABLE public.dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own dismissals"
  ON public.dismissals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select own dismissals"
  ON public.dismissals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dismissals"
  ON public.dismissals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
