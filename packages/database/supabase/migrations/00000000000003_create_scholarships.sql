-- Migration: Create scholarships table
-- RLS: Public read (anon/authenticated); insert/update/delete via service-role only (curated data).

CREATE TABLE public.scholarships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  amount numeric(12, 2),
  deadline date,
  url text,
  trust_score integer NOT NULL DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
  category scholarship_category,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;

-- Public read for discovery and Trust Filter
CREATE POLICY "scholarships_select_public"
  ON public.scholarships
  FOR SELECT
  USING (true);

-- Indexes for discovery and Trust Filter (data-model §Indexes)
CREATE INDEX idx_scholarships_deadline ON public.scholarships(deadline);
CREATE INDEX idx_scholarships_category ON public.scholarships(category);
