/**
 * Zod schemas for table validation.
 * Validate before all writes; invalid payloads rejected with clear errors.
 */

import type { ZodSchema } from 'zod';

export { waitlistSchema, waitlistSegmentEnum } from './waitlist';
export type { WaitlistSchema } from './waitlist';

export {
  profileSchema,
  profileInsertSchema,
  profileUpdateSchema,
  pellEligibilityStatusEnum,
} from './profiles';
export type {
  ProfileSchema,
  ProfileInsertSchema,
  ProfileUpdateSchema,
} from './profiles';

export {
  scholarshipSchema,
  scholarshipCategoryEnum,
} from './scholarships';
export type { ScholarshipSchema } from './scholarships';

export {
  applicationSchema,
  applicationStatusEnum,
} from './applications';
export type { ApplicationSchema } from './applications';

/**
 * Validates data against schema; throws ZodError on failure.
 * Use before DB writes to reject invalid payloads.
 */
export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
