/**
 * Scout Zod schemas for manual scholarship ingestion.
 * Per specs/007-scout-vision-ingestion/data-model.md §1, §6.
 * Used for API validation, agent state, and confirmScoutScholarship Server Action.
 */
import { z } from "zod";

// --- ScoutStep ---

export const scoutStepEnum = z.enum([
  "reading_document",
  "searching_sources",
  "calculating_trust",
  "complete",
  "error",
]);

export type ScoutStep = z.infer<typeof scoutStepEnum>;

// --- ScoutInput ---

export const scoutInputTypeEnum = z.enum(["url", "name", "file"]);

export const ScoutInputSchema = z
  .object({
    type: scoutInputTypeEnum,
    url: z.string().url().optional(),
    name: z.string().min(1).optional(),
    file_path: z.string().min(1).optional(),
  })
  .refine(
    (data) => {
      if (data.type === "url") return !!data.url;
      if (data.type === "name") return !!data.name;
      if (data.type === "file") return !!data.file_path;
      return false;
    },
    { message: "url, name, or file_path required for type url, name, or file" }
  );

export type ScoutInput = z.infer<typeof ScoutInputSchema>;

// --- verification_status ---

export const scoutVerificationStatusEnum = z.enum([
  "verified",
  "ambiguous_deadline",
  "potentially_expired",
  "needs_manual_review",
]);

export type ScoutVerificationStatus = z.infer<
  typeof scoutVerificationStatusEnum
>;

// --- scoring_factors (from TrustScorer) ---

const domainTierEnum = z.enum(["high", "vetted", "under_review"]);
const feeCheckEnum = z.enum(["pass", "fail"]);

export const scoutScoringFactorsSchema = z.object({
  domain_tier: domainTierEnum,
  longevity_score: z.number().min(0).max(25),
  fee_check: feeCheckEnum,
});

export type ScoutScoringFactors = z.infer<typeof scoutScoringFactorsSchema>;

// --- research_required: which fields need user verification ---

export const researchRequiredSchema = z.record(z.string().min(1), z.boolean());

export type ResearchRequired = z.infer<typeof researchRequiredSchema>;

// --- ExtractedScholarshipData ---

export const ExtractedScholarshipDataSchema = z.object({
  title: z.string().min(1),
  amount: z.number().nullable(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "ISO date YYYY-MM-DD").nullable(),
  eligibility: z.string().nullable(),
  url: z
    .union([z.string().url(), z.literal(""), z.null()])
    .transform((v) => (v === "" ? null : v)),
  trust_score: z.number().int().min(0).max(100),
  research_required: researchRequiredSchema,
  verification_status: scoutVerificationStatusEnum,
  scoring_factors: scoutScoringFactorsSchema.optional(),
  trust_report: z.string().optional(),
});

export type ExtractedScholarshipData = z.infer<
  typeof ExtractedScholarshipDataSchema
>;
