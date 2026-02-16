/**
 * Zod schema for scholarships table validation.
 * trust_score 0–100 for Trust Filter (Constitution §4, §8).
 */

import { z } from 'zod';

export const scholarshipCategoryEnum = z.enum([
  'merit',
  'need_based',
  'minority',
  'field_specific',
  'other',
]);

export const scholarshipSchema = z.object({
  title: z.string().min(1),
  amount: z.number().min(0).nullable().optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD').nullable().optional(),
  url: z
    .union([z.string().url(), z.literal('')])
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v)),
  trust_score: z.number().int().min(0).max(100).optional(),
  category: scholarshipCategoryEnum.nullable().optional(),
});

export type ScholarshipSchema = z.infer<typeof scholarshipSchema>;
