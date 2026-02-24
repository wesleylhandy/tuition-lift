/**
 * Profile loader: fetch user_profile and financial_profile from @repo/db.
 * household_income_bracket computed from SAI at read (002 FR-014a); not stored.
 * SAI decrypted on read via @repo/db decryptSai (FR-014).
 * US1 (009): Read sat_total, act_composite, spikes, merit_filter_preference, award_year;
 * read sai_zone_config and merit_tier_config; derive merit_tier, sai_above_merit_threshold.
 * Used by Inngest discovery function as graph input — contracts/api-discovery.md
 */
import {
  createDbClient,
  decryptSai,
  getMeritTierConfig,
  getSaiZoneConfig,
} from "@repo/db";
import { FinancialProfileSchema, UserProfileSchema } from "./schemas";
import type { FinancialProfile, UserProfile } from "./schemas";

export type HouseholdIncomeBracket =
  | "Low"
  | "Moderate"
  | "Middle"
  | "Upper-Middle"
  | "High";

const SAI_MIN = -1500;
const SAI_MAX = 999999;

/**
 * Validates SAI is within federal Student Aid Index range (-1500 to 999999).
 * Per FAFSA 2026-2027; FR-014, T037: reject invalid before loading financial_profile.
 */
export function isSaiInValidRange(sai: number): boolean {
  return (
    typeof sai === "number" &&
    Number.isFinite(sai) &&
    sai >= SAI_MIN &&
    sai <= SAI_MAX
  );
}

/**
 * Maps SAI to federal tier (Low/Moderate/Middle/Upper-Middle/High).
 * Thresholds aligned with federal need-based aid guidance; lower SAI = higher need.
 */
export function saiToHouseholdIncomeBracket(
  sai: number
): HouseholdIncomeBracket {
  if (sai < SAI_MIN || sai > SAI_MAX) {
    throw new RangeError(
      `SAI must be ${SAI_MIN}..${SAI_MAX}; got ${sai}`
    );
  }
  if (sai <= 0) return "Low";
  if (sai <= 5000) return "Moderate";
  if (sai <= 15000) return "Middle";
  if (sai <= 35000) return "Upper-Middle";
  return "High";
}

/** Merit-first config from sai_zone_config and merit_tier_config (009 US1). */
export interface MeritConfig {
  merit_filter_preference: "merit_only" | "show_all";
  sai_above_merit_threshold: boolean;
  merit_tier: string | null;
  award_year: number;
}

/** US3: True when intended_major is empty or "undecided"; triggers Coach personality flow. */
export function isUndecidedMajor(rawMajor: string | null | undefined): boolean {
  const trimmed = (rawMajor ?? "").trim().toLowerCase();
  return trimmed === "" || trimmed === "undecided";
}

export interface LoadProfileResult {
  user_profile: UserProfile | null;
  financial_profile: FinancialProfile | null;
  merit_config: MeritConfig | null;
  /** US3: Triggers Coach_Major_Pivot flow instead of Advisor_Search. */
  is_undecided_major: boolean;
}

/**
 * Resolves award year from profile; default current calendar year.
 * Clamped to current or next year per data-model §2a.
 */
function resolveAwardYear(awardYear: number | null): number {
  const now = new Date();
  const current = now.getFullYear();
  const next = current + 1;
  if (awardYear === current || awardYear === next) return awardYear;
  return current;
}

/**
 * Derives merit_tier from merit_tier_config using GPA/SAT/ACT.
 * Test-optional: when sat/act absent, use gpa_min_no_test for tier match.
 */
function deriveMeritTier(
  row: {
    gpa_unweighted: number | null;
    gpa_weighted: number | null;
    sat_total: number | null;
    act_composite: number | null;
  },
  tierRows: Array<{
    tier_name: string;
    gpa_min: number | null;
    gpa_max: number | null;
    sat_min: number | null;
    sat_max: number | null;
    act_min: number | null;
    act_max: number | null;
    gpa_min_no_test: number | null;
  }>
): string | null {
  const gpa =
    row.gpa_unweighted != null ? row.gpa_unweighted : row.gpa_weighted ?? null;
  const sat = row.sat_total ?? null;
  const act = row.act_composite ?? null;
  const hasTest = sat != null || act != null;

  for (const t of tierRows) {
    const gpaOk = (() => {
      if (gpa == null) return false;
      if (hasTest) {
        if (t.gpa_min != null && gpa < t.gpa_min) return false;
        if (t.gpa_max != null && gpa > t.gpa_max) return false;
      } else {
        const minGpa = t.gpa_min_no_test ?? t.gpa_min;
        if (minGpa != null && gpa < minGpa) return false;
        if (t.gpa_max != null && gpa > t.gpa_max) return false;
      }
      return true;
    })();
    const satOk =
      sat == null ||
      ((t.sat_min == null || sat >= t.sat_min) &&
        (t.sat_max == null || sat <= t.sat_max));
    const actOk =
      act == null ||
      ((t.act_min == null || act >= t.act_min) &&
        (t.act_max == null || act <= t.act_max));
    if (gpaOk && satOk && actOk) return t.tier_name;
  }
  return null;
}

/**
 * Fetches profile by user_id; returns user_profile, financial_profile, merit_config.
 * - user_profile: id, major, state, gpa, sat_total, act_composite, spikes. Null if missing required (major, state).
 * - financial_profile: estimated_sai, is_pell_eligible, household_income_bracket. Null if sai invalid.
 * - merit_config: merit_filter_preference, sai_above_merit_threshold, merit_tier, award_year. Null if no zone config.
 */
export async function loadProfile(userId: string): Promise<LoadProfileResult> {
  const db = createDbClient();
  const { data: row, error } = await db
    .from("profiles")
    .select(
      "id, intended_major, state, gpa_weighted, gpa_unweighted, sai, pell_eligibility_status, sat_total, act_composite, spikes, merit_filter_preference, award_year"
    )
    .eq("id", userId)
    .single();

  if (error || !row) {
    return {
      user_profile: null,
      financial_profile: null,
      merit_config: null,
      is_undecided_major: false,
    };
  }

  const is_undecided_major = isUndecidedMajor(row.intended_major);
  const user_profile = buildUserProfile(row, is_undecided_major);
  const financial_profile = buildFinancialProfile(row);
  const merit_config = await buildMeritConfig(row);

  return {
    user_profile,
    financial_profile,
    merit_config,
    is_undecided_major,
  };
}

async function buildMeritConfig(row: {
  sai: string | number | null | undefined;
  merit_filter_preference: string | null;
  award_year: number | null;
  gpa_unweighted: number | null;
  gpa_weighted: number | null;
  sat_total: number | null;
  act_composite: number | null;
}): Promise<MeritConfig | null> {
  const sai = decryptSai(row.sai);
  if (sai === null) return null;

  const awardYear = resolveAwardYear(row.award_year);
  const zoneConfig = await getSaiZoneConfig(awardYear);
  if (!zoneConfig) return null;

  const tierRows = await getMeritTierConfig(awardYear);
  const meritTier = deriveMeritTier(
    {
      gpa_unweighted: row.gpa_unweighted,
      gpa_weighted: row.gpa_weighted,
      sat_total: row.sat_total,
      act_composite: row.act_composite,
    },
    tierRows
  );

  const pref =
    row.merit_filter_preference === "merit_only" ? "merit_only" : "show_all";
  const saiAbove =
    typeof sai === "number" && sai >= zoneConfig.merit_lean_threshold;

  return {
    merit_filter_preference: pref,
    sai_above_merit_threshold: saiAbove,
    merit_tier: meritTier,
    award_year: awardYear,
  };
}

function buildUserProfile(
  row: {
    id: string;
    intended_major: string | null;
    state: string | null;
    gpa_weighted: number | null;
    gpa_unweighted: number | null;
    sat_total: number | null;
    act_composite: number | null;
    spikes: string[] | null;
  },
  isUndecided: boolean
): UserProfile | null {
  const rawMajor = row.intended_major?.trim() ?? "";
  const state = row.state?.trim() ?? "";
  if (!state) return null;
  const major = isUndecided ? "Undecided" : rawMajor;
  if (!major) return null;

  const gpa =
    row.gpa_unweighted != null
      ? row.gpa_unweighted
      : row.gpa_weighted ?? undefined;
  const sat_total =
    row.sat_total != null &&
    row.sat_total >= 400 &&
    row.sat_total <= 1600
      ? row.sat_total
      : undefined;
  const act_composite =
    row.act_composite != null &&
    row.act_composite >= 1 &&
    row.act_composite <= 36
      ? row.act_composite
      : undefined;
  const spikes = Array.isArray(row.spikes)
    ? row.spikes.filter(
        (s): s is string =>
          typeof s === "string" && s.trim().length > 0 && s.length <= 100
      ).slice(0, 10)
    : undefined;

  const parsed = UserProfileSchema.safeParse({
    id: row.id,
    major,
    state,
    gpa,
    sat_total: sat_total ?? undefined,
    act_composite: act_composite ?? undefined,
    spikes: spikes?.length ? spikes : undefined,
  });
  return parsed.success ? parsed.data : null;
}

function buildFinancialProfile(row: {
  sai: string | number | null;
  pell_eligibility_status: "eligible" | "ineligible" | "unknown" | null;
}): FinancialProfile | null {
  const sai = decryptSai(row.sai);
  if (sai === null || !isSaiInValidRange(sai)) return null;

  try {
    const household_income_bracket = saiToHouseholdIncomeBracket(sai);
    const is_pell_eligible = row.pell_eligibility_status === "eligible";
    const parsed = FinancialProfileSchema.safeParse({
      estimated_sai: sai,
      is_pell_eligible,
      household_income_bracket,
    });
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
