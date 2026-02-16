-- Migration: Create profiles table
-- RLS: Owner-only; SELECT, INSERT, UPDATE only where auth.uid() = id.

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  intended_major text,
  gpa numeric(3, 2) CHECK (gpa IS NULL OR (gpa >= 0 AND gpa <= 4)),
  state text,
  interests text[],
  sai integer CHECK (sai IS NULL OR (sai >= -1500 AND sai <= 999999)),
  pell_eligibility_status pell_eligibility_status,
  household_size integer CHECK (household_size IS NULL OR household_size > 0),
  number_in_college integer CHECK (number_in_college IS NULL OR number_in_college >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Owner can read own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Owner can insert own profile (on signup)
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Owner can update own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
