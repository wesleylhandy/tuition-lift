-- Migration: Create scout_submissions table for Scout rate limiting
-- RLS: Authenticated users can manage only own rows (user_id = auth.uid())
-- See specs/016-manual-scout-ui/contracts/scout-rate-limit-api.md §3, data-model.md §1

CREATE TABLE public.scout_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, academic_year)
);

ALTER TABLE public.scout_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own scout submissions"
  ON public.scout_submissions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
