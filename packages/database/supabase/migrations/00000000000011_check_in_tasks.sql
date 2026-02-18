-- Migration: Create check_in_tasks table (005 Coach Execution Engine)
-- Purpose: FR-011 — Check-in 21 days after submission ("Have you heard back?")

CREATE TYPE check_in_status AS ENUM (
  'pending',
  'completed',
  'dismissed'
);

CREATE TABLE public.check_in_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  due_at timestamptz NOT NULL,
  status check_in_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id, application_id)
);

ALTER TABLE public.check_in_tasks ENABLE ROW LEVEL SECURITY;

-- User can read own rows (GET /api/coach/game-plan, notifications)
CREATE POLICY "check_in_tasks_select_own"
  ON public.check_in_tasks
  FOR SELECT
  USING (auth.uid() = user_id);

-- User can update own rows (POST /api/coach/check-in/complete)
CREATE POLICY "check_in_tasks_update_own"
  ON public.check_in_tasks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- INSERT: Coach workflows (Inngest) via service role only

-- Indexes for batch scheduling and user lookups
CREATE INDEX idx_check_in_tasks_user_id ON public.check_in_tasks(user_id);
CREATE INDEX idx_check_in_tasks_due_at ON public.check_in_tasks(due_at);
