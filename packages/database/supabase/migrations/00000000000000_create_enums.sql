-- Migration: Create enums used by waitlist, profiles, scholarships, and applications
-- Enums must exist before tables that reference them

-- Scholarship categories for discovery and Trust Filter (scholarships)
CREATE TYPE scholarship_category AS ENUM (
  'merit',
  'need_based',
  'minority',
  'field_specific',
  'other'
);

-- Application workflow status (applications)
CREATE TYPE application_status AS ENUM (
  'draft',
  'submitted',
  'awarded',
  'rejected',
  'withdrawn'
);

-- Pell eligibility for Financial Aid Layer (profiles)
CREATE TYPE pell_eligibility_status AS ENUM (
  'eligible',
  'ineligible',
  'unknown'
);
