/**
 * Zod schema for waitlist table validation.
 * Validates payload before INSERT/UPDATE. Invalid referral_code → referred_by null (FR-005a).
 */

import { z } from 'zod';

export const waitlistSegmentEnum = z.enum([
  'high_school',
  'undergraduate',
  'masters',
  'doctoral',
]);

export const waitlistSchema = z.object({
  email: z.string().email(),
  segment: waitlistSegmentEnum.nullable().optional(),
  referral_code: z.string().length(8).regex(/^[A-Za-z0-9]+$/, '8-char alphanumeric'),
  referred_by: z.string().uuid().nullable().optional(),
  referral_count: z.number().int().min(0).optional(),
  unlock_sent_at: z.string().datetime().nullable().optional(),
});

export type WaitlistSchema = z.infer<typeof waitlistSchema>;
