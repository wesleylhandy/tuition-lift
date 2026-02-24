-- Migration: Add need_blind to scholarship_category enum (009)
-- Purpose: Institutional merit (admissions need-blind) for Merit Hunter discovery
-- Per data-model.md §2

ALTER TYPE scholarship_category ADD VALUE IF NOT EXISTS 'need_blind';
