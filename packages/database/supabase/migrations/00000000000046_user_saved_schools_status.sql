-- Migration: Add status to user_saved_schools for college list (applied, accepted, committed).
-- RLS: Add UPDATE policy; existing SELECT/INSERT/DELETE unchanged.

ALTER TABLE public.user_saved_schools
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'applied';

ALTER TABLE public.user_saved_schools
  ADD CONSTRAINT user_saved_schools_status_check
  CHECK (status IN ('applied', 'accepted', 'committed'));

-- User: UPDATE own saved schools (status changes)
CREATE POLICY "user_saved_schools_update_own"
  ON public.user_saved_schools
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
