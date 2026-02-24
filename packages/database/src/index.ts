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
  Json,
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
  ScoutInputSchema,
  ExtractedScholarshipDataSchema,
  scoutStepEnum,
  scoutVerificationStatusEnum,
  landingStatsSchema,
  testimonialSchema,
} from './schema/index';

export type {
  WaitlistSchema,
  ProfileSchema,
  ProfileInsertSchema,
  ProfileUpdateSchema,
  ScholarshipSchema,
  ApplicationSchema,
  ScoutInput,
  ExtractedScholarshipData,
  ScoutStep,
  ScoutVerificationStatus,
  LandingStatsSchema,
  TestimonialSchema,
} from './schema/index';

export {
  encryptSai,
  decryptSai,
  withEncryptedSai,
} from './encryption';

export {
  getSaiZoneConfig,
  getMeritTierConfig,
} from './config-queries';

export type {
  SaiZoneConfigRow,
  MeritTierConfigRow,
} from './config-queries';

export {
  getCareerOutcomesByInterest,
  getInstitutionsForRecommendation,
} from './major-pivot-queries';

export type {
  CareerOutcomeRow,
  InstitutionRow,
} from './major-pivot-queries';
