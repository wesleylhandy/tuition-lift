-- Migration: Alter profiles.sai from integer to text for application-level encryption.
-- Per FR-014: SAI stored encrypted; decrypt on read via @repo/db decryptSai.
-- Legacy: existing integer values converted to text (e.g. 12345 -> '12345').
-- decryptSai supports both encrypted base64 and legacy plaintext during transition.

-- Drop CHECK constraint; it uses integer comparison (sai >= -1500) incompatible with text.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_sai_check;

ALTER TABLE public.profiles
  ALTER COLUMN sai TYPE text
  USING CASE WHEN sai IS NOT NULL THEN sai::text ELSE NULL END;
