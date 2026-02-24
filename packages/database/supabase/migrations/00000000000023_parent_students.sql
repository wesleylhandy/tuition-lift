-- Migration: Create parent_students link table (009)
-- Purpose: Link parent profiles to student profiles for ROI/contribution access
-- RLS: Parent SELECT only; Student SELECT, INSERT, DELETE. Unlink initiated by student.
-- Per data-model.md §4

CREATE TABLE public.parent_students (
  parent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_id, student_id),
  CONSTRAINT parent_students_no_self_link CHECK (parent_id != student_id)
);

ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

-- Parent: SELECT own links (can see which students they are linked to)
CREATE POLICY "parent_students_select_parent"
  ON public.parent_students
  FOR SELECT
  USING (auth.uid() = parent_id);

-- Student: SELECT own links (can see which parents are linked)
CREATE POLICY "parent_students_select_student"
  ON public.parent_students
  FOR SELECT
  USING (auth.uid() = student_id);

-- Student: INSERT (initiate link)
CREATE POLICY "parent_students_insert_student"
  ON public.parent_students
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Student: DELETE (unlink; parent loses access immediately)
CREATE POLICY "parent_students_delete_student"
  ON public.parent_students
  FOR DELETE
  USING (auth.uid() = student_id);

-- Indexes for common lookups
CREATE INDEX idx_parent_students_parent_id ON public.parent_students(parent_id);
CREATE INDEX idx_parent_students_student_id ON public.parent_students(student_id);
