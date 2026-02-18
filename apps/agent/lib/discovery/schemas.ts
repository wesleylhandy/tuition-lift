/**
 * Discovery engine schemas for anonymized profile and related shapes.
 * Per data-model.md §3 — AnonymizedProfile has no PII (no full_name, SSN, raw SAI).
 * Per data-model.md §2 — ScholarshipMetadataSchema for scholarships.metadata JSONB.
 */
import { z } from "zod";

import {
  householdIncomeBracketEnum,
  verificationStatusEnum,
} from "../schemas";

/**
 * Anonymized profile for query generation. Contains only attributes safe for
 * external search APIs; no full_name, SSN, or raw SAI (Constitution §4, FR-003).
 */
export const AnonymizedProfileSchema = z.object({
  gpa: z.number().min(0).max(4).optional(),
  major: z.string().min(1).optional(),
  incomeBracket: householdIncomeBracketEnum.optional(),
  pellStatus: z.boolean().optional(),
});

export type AnonymizedProfile = z.infer<typeof AnonymizedProfileSchema>;

// --- ScholarshipMetadata (scholarships.metadata JSONB) ---

const domainTierEnum = z.enum(["high", "vetted", "under_review"]);
const feeCheckEnum = z.enum(["pass", "fail"]);

/** Scoring factors from TrustScorer; stored in metadata for provenance. */
const scoringFactorsSchema = z.object({
  domain_tier: domainTierEnum,
  longevity_score: z.number().min(0).max(25),
  fee_check: feeCheckEnum,
});

/**
 * Schema for scholarships.metadata JSONB column.
 * Per data-model.md §2 — source_url, snippet, scoring_factors, trust_report,
 * categories, verification_status. Used by ScholarshipUpsert on conflict update.
 */
export const ScholarshipMetadataSchema = z.object({
  source_url: z.string(),
  snippet: z.string(),
  scoring_factors: scoringFactorsSchema,
  trust_report: z.string(),
  categories: z.array(z.string()),
  verification_status: verificationStatusEnum,
});

export type ScholarshipMetadata = z.infer<typeof ScholarshipMetadataSchema>;
