-- Migration: Extend profiles for discovery criteria (014 US7)
-- Purpose: first_generation, parent_employer_category, identity_eligibility_categories
-- Per 002/008; 014 specifies query-generation behavior when present.
-- All nullable — optional attributes for discovery expansion (C1).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_generation boolean;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parent_employer_category text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identity_eligibility_categories text[];
