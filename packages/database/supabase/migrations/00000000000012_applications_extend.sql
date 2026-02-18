-- Migration: Extend applications table (005 Coach Execution Engine)
-- Purpose: Add momentum_score, submitted_at, last_progress_at, confirmed_at per 002 FR-013a if missing
-- Idempotent: ADD COLUMN IF NOT EXISTS for deployments where 002 schema may vary

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS momentum_score numeric(5, 2),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_progress_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
