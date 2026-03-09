/**
 * Config queries: sai_zone_config, merit_tier_config, merit_first_config, scout_config.
 * Tables created by migrations 00000000000021, 00000000000022, 00000000000037, 00000000000042.
 * Read by award_year for merit-first logic and tier matching; scout_config for rate limits.
 */

import { createDbClient } from "./client";

/** SAI zone config row (data-model.md §3a) */
export interface SaiZoneConfigRow {
  award_year: number;
  pell_cutoff: number;
  grey_zone_end: number;
  merit_lean_threshold: number;
  updated_at: string;
}

/** Merit tier config row (data-model.md §3b) */
export interface MeritTierConfigRow {
  award_year: number;
  tier_name: string;
  gpa_min: number | null;
  gpa_max: number | null;
  sat_min: number | null;
  sat_max: number | null;
  act_min: number | null;
  act_max: number | null;
  gpa_min_no_test: number | null;
  updated_at: string;
}

/**
 * Fetches sai_zone_config for the given award year.
 * Returns null if not found or on error.
 * Tables added by migrations 21/22; typings available after db:generate.
 */
export async function getSaiZoneConfig(
  awardYear: number
): Promise<SaiZoneConfigRow | null> {
  const db = createDbClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sai_zone_config typed after migration 21 + db:generate
  const { data, error } = await (db as any)
    .from("sai_zone_config")
    .select("*")
    .eq("award_year", awardYear)
    .single();

  if (error || !data) return null;
  return data as SaiZoneConfigRow;
}

/**
 * Fetches all merit_tier_config rows for the given award year.
 * Returns empty array if none found or on error.
 * Tables added by migrations 21/22; typings available after db:generate.
 */
export async function getMeritTierConfig(
  awardYear: number
): Promise<MeritTierConfigRow[]> {
  const db = createDbClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- merit_tier_config typed after migration 22 + db:generate
  const { data, error } = await (db as any)
    .from("merit_tier_config")
    .select("*")
    .eq("award_year", awardYear);

  if (error || !data) return [];
  return (data ?? []) as MeritTierConfigRow[];
}

/**
 * Fetches merit_first_sai_threshold for the given award year.
 * Returns null if not found or on error.
 * Used by: Advisor Merit-First Mode (US3) — when profile SAI > threshold, prioritize Need-Blind/merit-tier.
 * Table: merit_first_config (migration 37).
 */
export async function getMeritFirstThreshold(
  awardYear: number
): Promise<number | null> {
  const db = createDbClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- merit_first_config typed after migration 37 + db:generate
  const { data, error } = await (db as any)
    .from("merit_first_config")
    .select("merit_first_sai_threshold")
    .eq("award_year", awardYear)
    .single();

  if (error || !data) return null;
  return data.merit_first_sai_threshold as number;
}

/** Default Scout submission limit when scout_config has no row. */
const SCOUT_SUBMISSION_LIMIT_DEFAULT = 15;

/** Phase 9: Differential limits (migration 43). */
export interface ScoutLimits {
  urlLimit: number | null;
  fileLimit: number;
}

/**
 * Fetches scout_submission_limit from scout_config (single row).
 * Returns 15 if no row found. Used by checkScoutLimit and confirmScoutScholarship.
 * Table: scout_config (migration 42); RLS SELECT public.
 */
export async function getScoutSubmissionLimit(): Promise<number> {
  const limits = await getScoutLimits();
  return limits.fileLimit;
}

/**
 * Fetches differential Scout limits from scout_config (Phase 9, migration 43).
 * urlLimit: null = unlimited for URL/name inputs; fileLimit for PDF/image inputs.
 * When migration 43 not applied: falls back to scout_submission_limit for both.
 */
export async function getScoutLimits(): Promise<ScoutLimits> {
  const db = createDbClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- scout_config typed after migration 43 + db:generate
  const { data, error } = await (db as any)
    .from("scout_config")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      urlLimit: 50,
      fileLimit: SCOUT_SUBMISSION_LIMIT_DEFAULT,
    };
  }

  const legacy = (data.scout_submission_limit as number) ?? SCOUT_SUBMISSION_LIMIT_DEFAULT;
  const fileLimit =
    (data.scout_file_limit as number | undefined) ?? legacy;
  const urlLimitRaw = data.scout_url_limit as number | null | undefined;
  const urlLimit =
    urlLimitRaw === undefined ? 50 : urlLimitRaw;

  return {
    urlLimit,
    fileLimit,
  };
}

/** Scout submission row (scout_submissions table, migrations 40, 44). */
export interface ScoutSubmissionRow {
  id: string;
  user_id: string;
  academic_year: string;
  count: number;
  url_count?: number;
  file_count?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Gets or creates a scout_submissions row for (userId, academicYear).
 * On first use in a cycle: INSERT with count=0. On conflict: do not overwrite count; return existing row.
 * Caller (apps/web) supplies academic year via getCurrentAcademicYear() or awardYearToAcademicYear(profile.award_year).
 */
export async function getOrCreateScoutSubmission(
  userId: string,
  academicYear: string
): Promise<ScoutSubmissionRow> {
  const db = createDbClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- scout_submissions typed after migration 40 + db:generate
  const client = db as any;

  const { error: upsertError } = await client
    .from("scout_submissions")
    .upsert(
      { user_id: userId, academic_year: academicYear },
      { onConflict: "user_id,academic_year", ignoreDuplicates: true }
    );

  if (upsertError) {
    throw new Error(
      `Failed to upsert scout submission: ${upsertError.message}`
    );
  }

  const { data, error } = await client
    .from("scout_submissions")
    .select("*")
    .eq("user_id", userId)
    .eq("academic_year", academicYear)
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to get or create scout submission: ${error?.message ?? "no row returned"}`
    );
  }

  return data as ScoutSubmissionRow;
}

/**
 * Increments scout_submissions count for (userId, academicYear).
 * Phase 9: When inputType is "url", increments url_count; when "file", increments file_count.
 * Also increments count for backward compat. Call after successful confirmScoutScholarship.
 */
export async function incrementScoutSubmissionCount(
  userId: string,
  academicYear: string,
  inputType: "url" | "file"
): Promise<void> {
  const row = await getOrCreateScoutSubmission(userId, academicYear);
  const db = createDbClient();
  const now = new Date().toISOString();
  const urlCount = (row.url_count ?? 0) + (inputType === "url" ? 1 : 0);
  const fileCount = (row.file_count ?? 0) + (inputType === "file" ? 1 : 0);
  const count = row.count + 1;
  const updates: Record<string, unknown> = {
    count,
    updated_at: now,
  };
  if (row.url_count !== undefined) {
    updates.url_count = urlCount;
    updates.file_count = fileCount;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- scout_submissions typed after migration 44 + db:generate
  const { error } = await (db as any)
    .from("scout_submissions")
    .update(updates)
    .eq("user_id", userId)
    .eq("academic_year", academicYear);

  if (error) throw new Error(`Failed to increment scout submission: ${error.message}`);
}

/**
 * Checks if a scholarship has been verified for the given academic cycle.
 * Returns true if a row exists for (scholarship_id, academic_year).
 * Used by: DB-first discovery to skip re-verification for already-verified scholarships.
 * Table: scholarship_cycle_verifications (migration 36).
 */
export async function isScholarshipVerifiedForCycle(
  scholarshipId: string,
  academicYear: string
): Promise<boolean> {
  const db = createDbClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- scholarship_cycle_verifications typed after migration 36 + db:generate
  const { data, error } = await (db as any)
    .from("scholarship_cycle_verifications")
    .select("id")
    .eq("scholarship_id", scholarshipId)
    .eq("academic_year", academicYear)
    .maybeSingle();

  if (error) return false;
  return data != null;
}

/**
 * Inserts or updates verified_at for (scholarship_id, academic_year).
 * On conflict, updates verified_at to now().
 * Used by: Advisor after re-verification.
 * Requires service-role (RLS: service-role write).
 */
export async function upsertScholarshipCycleVerification(
  scholarshipId: string,
  academicYear: string
): Promise<void> {
  const db = createDbClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- scholarship_cycle_verifications typed after migration 36 + db:generate
  const { error } = await (db as any)
    .from("scholarship_cycle_verifications")
    .upsert(
      {
        scholarship_id: scholarshipId,
        academic_year: academicYear,
        verified_at: new Date().toISOString(),
      },
      {
        onConflict: "scholarship_id,academic_year",
      }
    );

  if (error) throw new Error(`Failed to upsert cycle verification: ${error.message}`);
}
