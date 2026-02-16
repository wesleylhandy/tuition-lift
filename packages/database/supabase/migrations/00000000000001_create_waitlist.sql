-- Migration: Create waitlist table
-- RLS: Service-role only INSERT; no anon/authenticated access. Server Actions use service-role for validated, rate-limited inserts.

CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  segment text CHECK (segment IN ('high_school', 'undergraduate', 'masters', 'doctoral') OR segment IS NULL),
  referral_code text NOT NULL UNIQUE,
  referred_by uuid REFERENCES public.waitlist(id),
  referral_count integer NOT NULL DEFAULT 0,
  unlock_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: Enable; no policies for anon/authenticated (default deny). Service-role bypasses RLS for Server Action inserts.
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Index for referrer count queries (T025)
CREATE INDEX idx_waitlist_referred_by ON public.waitlist(referred_by);
