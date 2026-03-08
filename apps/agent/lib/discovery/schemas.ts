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
 * US1 (009): spikes as activity labels only; no team names, coach names, or PII.
 */
export const AnonymizedProfileSchema = z.object({
  /** 0–4 unweighted or 0–6 weighted; per 008 gpa model */
  gpa: z.number().min(0).max(6).optional(),
  major: z.string().min(1).optional(),
  /** US state code (e.g., CA) for local/regional scholarships (C1, 014 FR-013). */
  state: z.string().min(2).max(2).optional(),
  incomeBracket: householdIncomeBracketEnum.optional(),
  pellStatus: z.boolean().optional(),
  /** Activity labels only (e.g., Water Polo, Leadership). No team names or PII. */
  spikes: z.array(z.string().min(1).max(100)).max(10).optional(),
  /** US1 T022: Target award year (e.g., 2027) for cycle-aware query generation. */
  award_year: z.number().int().min(2024).max(2034).optional(),
  /** US7 C1: First-generation college student. Broad label only. */
  first_gen: z.boolean().optional(),
  /** US7 C1: Parent employer category (e.g., government, tech). Broad label only. */
  parent_employer_category: z.string().max(100).optional(),
  /** US7 C1: Identity-based eligibility categories (broad labels; never raw PII). */
  identity_eligibility_categories: z.array(z.string().max(100)).max(10).optional(),
  /** US7 C1: Saved institution names from user_saved_schools for institution-specific queries. */
  savedInstitutionNames: z.array(z.string().max(200)).max(10).optional(),
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
 * categories, verification_status. US1: merit_tag for Coach prioritization.
 */
export const ScholarshipMetadataSchema = z.object({
  source_url: z.string(),
  snippet: z.string(),
  scoring_factors: scoringFactorsSchema,
  trust_report: z.string(),
  categories: z.array(z.string()),
  verification_status: verificationStatusEnum,
  /** Merit tag for Coach: merit_only | need_blind | need_based (009). */
  merit_tag: z.enum(["merit_only", "need_blind", "need_based"]).optional(),
});

export type ScholarshipMetadata = z.infer<typeof ScholarshipMetadataSchema>;
