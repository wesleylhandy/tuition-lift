-- Migration: Add need_match_score to applications (014 Award Year Intelligence)
-- Purpose: Persist 0–100 score when tracking from Discovery Feed; null for Scout path
-- Idempotent: ADD COLUMN IF NOT EXISTS

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS need_match_score numeric(5, 2);
