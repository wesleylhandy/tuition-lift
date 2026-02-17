/**
 * @repo/db — TuitionLift shared database package
 * Single source of truth for types, schemas, and client.
 */

export { createDbClient } from './client.js';
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from './generated/database.types.js';

export { Constants } from './generated/database.types.js';

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
  parseOrThrow,
} from './schema/index.js';

export type {
  WaitlistSchema,
  ProfileSchema,
  ProfileInsertSchema,
  ProfileUpdateSchema,
  ScholarshipSchema,
  ApplicationSchema,
} from './schema/index.js';

export {
  encryptSai,
  decryptSai,
  withEncryptedSai,
} from './encryption.js';
