-- Migration: Create applications table
-- RLS: Authenticated users CRUD only their own rows (user_id = auth.uid()).
-- Unique: (user_id, scholarship_id, academic_year) — FR-013.

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scholarship_id uuid NOT NULL REFERENCES public.scholarships(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  status application_status NOT NULL DEFAULT 'draft',
  momentum_score numeric(5, 2),
  submitted_at timestamptz,
  last_progress_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, scholarship_id, academic_year)
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Owner can read own applications
CREATE POLICY "applications_select_own"
  ON public.applications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Owner can insert own applications
CREATE POLICY "applications_insert_own"
  ON public.applications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owner can update own applications
CREATE POLICY "applications_update_own"
  ON public.applications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owner can delete own applications
CREATE POLICY "applications_delete_own"
  ON public.applications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for user/app listing (data-model §Indexes)
CREATE INDEX idx_applications_user_id ON public.applications(user_id);
CREATE INDEX idx_applications_scholarship_id ON public.applications(scholarship_id);
