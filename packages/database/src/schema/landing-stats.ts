/**
 * Zod schema for landing_stats table validation.
 * Platform-wide metrics displayed on the landing page.
 * Validates on read per data-model.md.
 */

import { z } from 'zod';

export const landingStatsSchema = z.object({
  id: z.string().uuid(),
  stat_key: z.string().min(1),
  /** PostgREST returns bigint as string; coerce handles both. */
  total_debt_lifted_cents: z.coerce.number().int().min(0),
  student_count: z.coerce.number().int().min(0),
  match_rate_percent: z.number().int().min(0).max(100),
  updated_at: z.string().datetime(),
});

export type LandingStatsSchema = z.infer<typeof landingStatsSchema>;
