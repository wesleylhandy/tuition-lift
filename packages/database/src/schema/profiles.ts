/**
 * Zod schema for profiles table validation.
 * Includes Financial Aid Layer: sai, pell_eligibility_status, household_size, number_in_college.
 * Squeezed Middle: sat_total, act_composite, spikes, merit_filter_preference, award_year (009).
 * updated_at used for optimistic locking (FR-011).
 */

import { z } from 'zod';

export const pellEligibilityStatusEnum = z.enum([
  'eligible',
  'ineligible',
  'unknown',
]);

/** Merit filter: merit_only excludes need_based from discovery; show_all deprioritizes. */
export const meritFilterPreferenceEnum = z.enum(['merit_only', 'show_all']);

/** GPA: unweighted 0–4, weighted 0–6. Prefer gpa_unweighted for scholarship matching. */
const gpaUnweightedSchema = z.number().min(0).max(4).nullable().optional();
const gpaWeightedSchema = z.number().min(0).max(6).nullable().optional();

/** SAT EBRW + Math total (400–1600). */
const satTotalSchema = z.number().int().min(400).max(1600).nullable().optional();
/** ACT composite (1–36). */
const actCompositeSchema = z.number().int().min(1).max(36).nullable().optional();
/** Extracurricular spikes: max 10 items, each max 100 chars. Application boundary enforces labels only (no PII). */
const spikesSchema = z
  .array(z.string().min(1).max(100))
  .max(10)
  .nullable()
  .optional();
/** Award year: current or next calendar year; boundary validates. Schema accepts reasonable range. */
const awardYearSchema = z.number().int().min(2024).max(2030).nullable().optional();

export const profileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().nullable().optional(),
  intended_major: z.string().nullable().optional(),
  /** @deprecated Use gpa_unweighted or gpa_weighted. Kept for backward compatibility. */
  gpa: z.number().min(0).max(4).nullable().optional(),
  gpa_weighted: gpaWeightedSchema,
  gpa_unweighted: gpaUnweightedSchema,
  state: z.string().nullable().optional(),
  interests: z.array(z.string()).nullable().optional(),
  /** SAI (Student Aid Index): -1500..999999. Rejects out-of-range (T027). */
  sai: z.number().int().min(-1500).max(999999).nullable().optional(),
  pell_eligibility_status: pellEligibilityStatusEnum.nullable().optional(),
  household_size: z.number().int().positive().nullable().optional(),
  number_in_college: z.number().int().min(0).nullable().optional(),
  /** SAT total (EBRW + Math). Per data-model §1. */
  sat_total: satTotalSchema,
  /** ACT composite. Per data-model §1. */
  act_composite: actCompositeSchema,
  /** Extracurricular spikes (labels only; no PII). Per data-model §1. */
  spikes: spikesSchema,
  /** Merit-only filter vs show all. Default show_all. Per data-model §1. */
  merit_filter_preference: meritFilterPreferenceEnum.optional(),
  /** User-selected award year (current or next). Per data-model §1. */
  award_year: awardYearSchema,
  onboarding_complete: z.boolean().optional(),
  updated_at: z.string().datetime().optional(),
});

export const profileInsertSchema = profileSchema;

export const profileUpdateSchema = profileSchema.partial().omit({ id: true });

export type ProfileSchema = z.infer<typeof profileSchema>;
export type ProfileInsertSchema = z.infer<typeof profileInsertSchema>;
export type ProfileUpdateSchema = z.infer<typeof profileUpdateSchema>;
