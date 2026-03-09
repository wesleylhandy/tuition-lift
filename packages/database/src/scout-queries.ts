/**
 * Scout-specific queries: checkScholarshipByUrl (Phase 9).
 * Used to short-circuit Tavily when URL already exists in scholarships.
 */
import { createDbClient } from "./client";
import type { ExtractedScholarshipData, ScoutScoringFactors } from "./schema/index";

/** Scholarship row from DB (minimal fields for mapping to ExtractedScholarshipData). */
export interface ScholarshipByUrlRow {
  id: string;
  title: string;
  amount: number | null;
  deadline: string | null;
  url: string | null;
  trust_score: number;
  metadata: unknown;
}

export type CheckScholarshipByUrlResult =
  | { exists: true; alreadyTracked: true; scholarshipId: string; applicationId?: string }
  | { exists: true; alreadyTracked: false; scholarship: ScholarshipByUrlRow }
  | { exists: false };

/**
 * Checks if a scholarship exists by exact URL match.
 * If exists and user has application → alreadyTracked.
 * If exists and user lacks application → return scholarship for short-circuit flow.
 * Per data-model.md §8, contracts/scout-rate-limit-api.md §6.
 */
export async function checkScholarshipByUrl(
  url: string,
  userId: string,
  academicYear: string
): Promise<CheckScholarshipByUrlResult> {
  const trimmed = url.trim();
  if (!trimmed) return { exists: false };

  const db = createDbClient();
  const client = db as any;

  const { data: scholarship, error: fetchErr } = await client
    .from("scholarships")
    .select("id, title, amount, deadline, url, trust_score, metadata")
    .eq("url", trimmed)
    .maybeSingle();

  if (fetchErr || !scholarship) return { exists: false };

  const { data: app } = await client
    .from("applications")
    .select("id")
    .eq("user_id", userId)
    .eq("scholarship_id", scholarship.id)
    .eq("academic_year", academicYear)
    .maybeSingle();

  if (app) {
    return {
      exists: true,
      alreadyTracked: true,
      scholarshipId: scholarship.id,
      applicationId: app.id,
    };
  }

  return {
    exists: true,
    alreadyTracked: false,
    scholarship: scholarship as ScholarshipByUrlRow,
  };
}

const DEFAULT_SCORING: ScoutScoringFactors = {
  domain_tier: "under_review",
  longevity_score: 0,
  fee_check: "pass",
};

/**
 * Maps ScholarshipByUrlRow to ExtractedScholarshipData for short-circuit scout_run.
 */
export function scholarshipRowToExtracted(row: ScholarshipByUrlRow): ExtractedScholarshipData {
  const meta = row.metadata as { scoring_factors?: ScoutScoringFactors } | null;
  const scoring = meta?.scoring_factors ?? DEFAULT_SCORING;

  return {
    title: row.title,
    amount: row.amount != null ? Number(row.amount) : null,
    deadline: row.deadline ?? null,
    eligibility: null,
    url: row.url ?? null,
    trust_score: row.trust_score ?? 50,
    research_required: {},
    verification_status: "needs_manual_review",
    scoring_factors: scoring,
    trust_report: "Existing scholarship",
  };
}
