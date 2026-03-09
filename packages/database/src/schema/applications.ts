/**
 * Zod schema for applications table validation.
 * academic_year format YYYY-YYYY. UNIQUE(user_id, scholarship_id, academic_year) enforced by DB.
 */

import { z } from 'zod';

export const applicationStatusEnum = z.enum([
  'draft',
  'submitted',
  'awarded',
  'rejected',
  'withdrawn',
]);

const academicYearRegex = /^\d{4}-\d{4}$/;

export const applicationSchema = z.object({
  user_id: z.string().uuid(),
  scholarship_id: z.string().uuid(),
  academic_year: z.string().regex(academicYearRegex, 'YYYY-YYYY format'),
  status: applicationStatusEnum.optional(),
  need_match_score: z.number().min(0).max(100).nullable().optional(),
  momentum_score: z.number().min(0).nullable().optional(),
  submitted_at: z.string().datetime().nullable().optional(),
  last_progress_at: z.string().datetime().nullable().optional(),
  confirmed_at: z.string().datetime().nullable().optional(),
  updated_at: z.string().datetime().optional(),
  merit_tag: z.string().max(50).nullable().optional(),
});

export type ApplicationSchema = z.infer<typeof applicationSchema>;
