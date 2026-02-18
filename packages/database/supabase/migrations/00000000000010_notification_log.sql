-- Migration: Create notification_log table (005 Coach Execution Engine)
-- Purpose: Enforce FR-010 (max one email + one dashboard nudge per student per 24h)
-- SC-008: template_name enables auditability; content reconstructable from templates

CREATE TYPE notification_channel AS ENUM (
  'email',
  'dashboard_toast'
);

CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  notification_type text,
  template_name text,
  application_ids uuid[]
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Users can read only their own rows (for GET /api/coach/notifications dashboard toasts)
-- INSERT/UPDATE/DELETE: Coach workflows (Inngest) via service role only
CREATE POLICY "notification_log_select_own"
  ON public.notification_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Index for efficient 24h window check: "has user received email in last 24h?"
CREATE INDEX idx_notification_log_user_channel_sent
  ON public.notification_log(user_id, channel, sent_at DESC);
