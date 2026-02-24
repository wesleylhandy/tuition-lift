-- Migration: Create institutions table (009)
-- Purpose: Alternative path catalog (4-year, community college, trade school, city college)
-- RLS: Public read. Insert/update via service role or admin.
-- Per data-model.md §6

CREATE TABLE public.institutions (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  institution_type text NOT NULL CHECK (institution_type IN ('4_year', 'community_college', 'trade_school', 'city_college')),
  state text NULL,
  url text NULL,
  sticker_price numeric(12,2) NULL,
  automatic_merit numeric(12,2) NULL,
  net_price numeric(12,2) NULL,
  coa numeric(12,2) NULL,
  source text NULL CHECK (source IS NULL OR source IN ('college_scorecard', 'manual', 'search')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- Public read for ROI comparison, COA comparison, and agent
CREATE POLICY "institutions_select_public"
  ON public.institutions
  FOR SELECT
  USING (true);

-- Indexes per data-model.md §6: institution_type, state, name (GIN for search)
CREATE INDEX idx_institutions_institution_type ON public.institutions(institution_type);
CREATE INDEX idx_institutions_state ON public.institutions(state);
CREATE INDEX idx_institutions_name_gin ON public.institutions USING GIN (to_tsvector('english', name));
