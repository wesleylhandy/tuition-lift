-- Migration: Seed career_outcomes (009 T041)
-- Purpose: Sample year-5 income by major for ROI comparison
-- Per research §3; BLS OEWS approximate. Production: extend via BLS API or CIP→SOC mapping.
-- Idempotent: skip if any seed row exists.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.career_outcomes LIMIT 1) THEN
    INSERT INTO public.career_outcomes (major_name, career_path, mean_annual_wage, source, data_year) VALUES
      ('Computer Science', 'Software Developer', 120000, 'bls', 2024),
      ('Nursing', 'Registered Nurse', 85000, 'bls', 2024),
      ('Business Administration', 'Management', 105000, 'bls', 2024),
      ('Electrical Engineering', 'Electrical Engineer', 105000, 'bls', 2024),
      ('Mechanical Engineering', 'Mechanical Engineer', 95000, 'bls', 2024),
      ('Accounting', 'Accountant', 78000, 'bls', 2024),
      ('Marketing', 'Marketing Manager', 140000, 'bls', 2024),
      ('Education', 'Teacher', 62000, 'bls', 2024),
      ('Psychology', 'Psychologist', 85000, 'bls', 2024),
      ('Criminal Justice', 'Police Officer', 65000, 'bls', 2024),
      ('Automotive Technology', 'Auto Technician', 48000, 'bls', 2024),
      ('Welding', 'Welder', 48000, 'bls', 2024),
      ('HVAC', 'HVAC Technician', 55000, 'bls', 2024),
      ('Dental Hygiene', 'Dental Hygienist', 81000, 'bls', 2024),
      ('Radiologic Technology', 'Radiologic Technologist', 67000, 'bls', 2024);
  END IF;
END $$;
