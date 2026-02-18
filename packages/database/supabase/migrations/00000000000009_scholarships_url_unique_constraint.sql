-- Migration: Add UNIQUE constraint on url for Supabase upsert ON CONFLICT.
-- The partial index from 008 doesn't work with PostgREST onConflict; a constraint does.
-- UNIQUE allows multiple NULLs; non-null urls are unique.
DROP INDEX IF EXISTS public.scholarships_url_unique;
ALTER TABLE public.scholarships
  ADD CONSTRAINT scholarships_url_key UNIQUE (url);
