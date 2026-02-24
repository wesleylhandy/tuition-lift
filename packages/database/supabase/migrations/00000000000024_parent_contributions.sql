-- Migration: Create parent_contributions table (009)
-- Purpose: Parent-provided income and manual scholarships for ROI comparison
-- RLS: Parent INSERT/SELECT own rows; Student SELECT/DELETE own. App merges into profile view.
-- Per data-model.md §5

CREATE TABLE public.parent_contributions (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contribution_type text NOT NULL CHECK (contribution_type IN ('income', 'manual_scholarship')),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parent_contributions_no_self_contribution CHECK (parent_id != student_id)
);

ALTER TABLE public.parent_contributions ENABLE ROW LEVEL SECURITY;

-- Parent: SELECT own contributions (where parent is the contributor)
CREATE POLICY "parent_contributions_select_parent"
  ON public.parent_contributions
  FOR SELECT
  USING (auth.uid() = parent_id);

-- Parent: INSERT own contributions (API validates parent is linked to student)
CREATE POLICY "parent_contributions_insert_parent"
  ON public.parent_contributions
  FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

-- Student: SELECT own contributions (can see what parents added)
CREATE POLICY "parent_contributions_select_student"
  ON public.parent_contributions
  FOR SELECT
  USING (auth.uid() = student_id);

-- Student: DELETE own contributions (can remove parent-provided data)
CREATE POLICY "parent_contributions_delete_student"
  ON public.parent_contributions
  FOR DELETE
  USING (auth.uid() = student_id);

-- Indexes for common lookups
CREATE INDEX idx_parent_contributions_student_id ON public.parent_contributions(student_id);
CREATE INDEX idx_parent_contributions_parent_id ON public.parent_contributions(parent_id);
