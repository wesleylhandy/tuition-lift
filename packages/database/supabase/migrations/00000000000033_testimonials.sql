-- Migration: Create testimonials table (011)
-- Purpose: Curated student testimonials for social proof section on landing page
-- RLS: Public SELECT (anon + authenticated). INSERT/UPDATE/DELETE service-role only. No user writes.
-- Per data-model.md and specs/011-landing-marketing-ui

CREATE TABLE public.testimonials (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  quote text NOT NULL CHECK (char_length(quote) <= 500),
  star_rating integer NOT NULL CHECK (star_rating >= 1 AND star_rating <= 5),
  avatar_url text,
  student_name text NOT NULL,
  class_year text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Public read for landing page testimonials display
CREATE POLICY "testimonials_select_public"
  ON public.testimonials
  FOR SELECT
  USING (true);

-- Index for ordered fetch by display_order
CREATE INDEX idx_testimonials_display_order ON public.testimonials(display_order);
