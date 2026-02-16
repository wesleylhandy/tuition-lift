/**
 * Zod schema for profiles table validation.
 * Includes Financial Aid Layer: sai, pell_eligibility_status, household_size, number_in_college.
 * updated_at used for optimistic locking (FR-011).
 */

import { z } from 'zod';

export const pellEligibilityStatusEnum = z.enum([
  'eligible',
  'ineligible',
  'unknown',
]);

export const profileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().nullable().optional(),
  intended_major: z.string().nullable().optional(),
  gpa: z.number().min(0).max(4).nullable().optional(),
  state: z.string().nullable().optional(),
  interests: z.array(z.string()).nullable().optional(),
  /** SAI (Student Aid Index): -1500..999999. Rejects out-of-range (T027). */
  sai: z.number().int().min(-1500).max(999999).nullable().optional(),
  pell_eligibility_status: pellEligibilityStatusEnum.nullable().optional(),
  household_size: z.number().int().positive().nullable().optional(),
  number_in_college: z.number().int().min(0).nullable().optional(),
  updated_at: z.string().datetime().optional(),
});

export const profileInsertSchema = profileSchema;

export const profileUpdateSchema = profileSchema.partial().omit({ id: true });

export type ProfileSchema = z.infer<typeof profileSchema>;
export type ProfileInsertSchema = z.infer<typeof profileInsertSchema>;
export type ProfileUpdateSchema = z.infer<typeof profileUpdateSchema>;
