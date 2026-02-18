/**
 * @repo/db — TuitionLift shared database package
 * Single source of truth for types, schemas, and client.
 */

export { createDbClient } from './client';
export type { DbClient } from './client';
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from './generated/database.types';

export { Constants } from './generated/database.types';

export {
  waitlistSchema,
  waitlistSegmentEnum,
  profileSchema,
  profileInsertSchema,
  profileUpdateSchema,
  pellEligibilityStatusEnum,
  scholarshipSchema,
  scholarshipCategoryEnum,
  applicationSchema,
  applicationStatusEnum,
  dismissalInputSchema,
  parseOrThrow,
} from './schema/index';

export type {
  WaitlistSchema,
  ProfileSchema,
  ProfileInsertSchema,
  ProfileUpdateSchema,
  ScholarshipSchema,
  ApplicationSchema,
} from './schema/index';

export {
  encryptSai,
  decryptSai,
  withEncryptedSai,
} from './encryption';
