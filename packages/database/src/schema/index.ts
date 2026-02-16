/**
 * Zod schemas for table validation.
 * Validate before all writes; invalid payloads rejected with clear errors.
 */

import type { ZodSchema } from 'zod';

export { waitlistSchema, waitlistSegmentEnum } from './waitlist.js';
export type { WaitlistSchema } from './waitlist.js';

export {
  profileSchema,
  profileInsertSchema,
  profileUpdateSchema,
  pellEligibilityStatusEnum,
} from './profiles.js';
export type {
  ProfileSchema,
  ProfileInsertSchema,
  ProfileUpdateSchema,
} from './profiles.js';

export {
  scholarshipSchema,
  scholarshipCategoryEnum,
} from './scholarships.js';
export type { ScholarshipSchema } from './scholarships.js';

export {
  applicationSchema,
  applicationStatusEnum,
} from './applications.js';
export type { ApplicationSchema } from './applications.js';

/**
 * Validates data against schema; throws ZodError on failure.
 * Use before DB writes to reject invalid payloads.
 */
export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
