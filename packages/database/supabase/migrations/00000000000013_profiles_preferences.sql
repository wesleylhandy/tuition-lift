-- Migration: Add preferences JSONB to profiles (005 Coach Execution Engine)
-- Purpose: FR-013b — Snooze Micro-Task; stores { micro_task_snoozed_until: string }

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferences jsonb;
