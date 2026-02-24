-- Migration: Create user_saved_schools table (009)
-- Purpose: Users save institutions for COA comparison (avg COA vs SAI → Need-to-Merit transition)
-- RLS: User SELECT/INSERT/DELETE own rows.
-- Per data-model.md §6a

CREATE TABLE public.user_saved_schools (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, institution_id)
);

ALTER TABLE public.user_saved_schools ENABLE ROW LEVEL SECURITY;

-- User: SELECT own saved schools
CREATE POLICY "user_saved_schools_select_own"
  ON public.user_saved_schools
  FOR SELECT
  USING (auth.uid() = user_id);

-- User: INSERT own saved schools
CREATE POLICY "user_saved_schools_insert_own"
  ON public.user_saved_schools
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User: DELETE own saved schools
CREATE POLICY "user_saved_schools_delete_own"
  ON public.user_saved_schools
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for common lookups (user lists their schools; COA comparison joins institutions)
CREATE INDEX idx_user_saved_schools_user_id ON public.user_saved_schools(user_id);
CREATE INDEX idx_user_saved_schools_institution_id ON public.user_saved_schools(institution_id);
