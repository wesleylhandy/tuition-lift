-- Migration: Add onboarding_complete, gpa_weighted, gpa_unweighted (008 Quick Onboarder)
-- Extends 002 profiles; gpa column retained for backward compatibility (drop in follow-up migration).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gpa_weighted numeric(4, 2)
  CHECK (gpa_weighted IS NULL OR (gpa_weighted >= 0 AND gpa_weighted <= 6));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gpa_unweighted numeric(3, 2)
  CHECK (gpa_unweighted IS NULL OR (gpa_unweighted >= 0 AND gpa_unweighted <= 4));

-- Migrate existing gpa to gpa_unweighted (assume legacy data is unweighted)
UPDATE public.profiles
SET gpa_unweighted = gpa
WHERE gpa IS NOT NULL AND gpa_unweighted IS NULL;
