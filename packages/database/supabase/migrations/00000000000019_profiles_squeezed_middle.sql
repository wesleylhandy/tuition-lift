-- Migration: Add Squeezed Middle & Merit Hunter columns to profiles (009)
-- Purpose: sat_total, act_composite, spikes, merit_filter_preference, award_year
-- Per data-model.md §1

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sat_total integer
  CHECK (sat_total IS NULL OR (sat_total >= 400 AND sat_total <= 1600));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS act_composite integer
  CHECK (act_composite IS NULL OR (act_composite >= 1 AND act_composite <= 36));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS spikes text[];

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS merit_filter_preference text NOT NULL DEFAULT 'show_all'
  CHECK (merit_filter_preference IN ('merit_only', 'show_all'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS award_year integer;
