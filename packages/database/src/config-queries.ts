/**
 * Config queries: sai_zone_config and merit_tier_config.
 * Tables created by migrations 00000000000021 and 00000000000022.
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
