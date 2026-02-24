/**
 * Zod schema for testimonials table validation.
 * Curated student testimonials for social proof section on landing page.
 * Validates on read per data-model.md.
 */

import { z } from 'zod';

export const testimonialSchema = z.object({
  id: z.string().uuid(),
  /** Non-empty; max 500 chars per DB CHECK. */
  quote: z.string().min(1).max(500),
  /** 1–5 stars per DB CHECK. */
  star_rating: z.number().int().min(1).max(5),
  /** Optional avatar URL. */
  avatar_url: z.string().url().nullable(),
  /** Display name only (e.g., "Sarah M."); no PII per data-model. */
  student_name: z.string().min(1),
  /** e.g., "2027". */
  class_year: z.string().min(1),
  /** Lower = higher in grid. */
  display_order: z.number().int().min(0),
  created_at: z.string().datetime(),
});

export type TestimonialSchema = z.infer<typeof testimonialSchema>;
