/**
 * Config queries: sai_zone_config, merit_tier_config, merit_first_config.
 * Tables created by migrations 00000000000021, 00000000000022, 00000000000037.
 * Read by award_year for merit-first logic and tier matching.
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
