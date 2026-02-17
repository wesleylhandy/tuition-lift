/**
 * Profile loader: fetch user_profile and financial_profile from @repo/db.
 * household_income_bracket computed from SAI at read (002 FR-014a); not stored.
 * SAI decrypted on read via @repo/db decryptSai (FR-014).
 * Used by Inngest discovery function as graph input — contracts/api-discovery.md
 */
import { createDbClient, decryptSai } from "@repo/db";
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

export interface LoadProfileResult {
  user_profile: UserProfile | null;
  financial_profile: FinancialProfile | null;
}

/**
 * Fetches profile by user_id; returns user_profile and financial_profile.
 * - user_profile: id, major (intended_major), state, gpa. Null if missing required fields (major, state).
 * - financial_profile: estimated_sai, is_pell_eligible, household_income_bracket. Null if sai missing or
 *   out of valid range (-1500 to 999999); invalid SAI is rejected per T037.
 */
export async function loadProfile(userId: string): Promise<LoadProfileResult> {
  const db = createDbClient();
  const { data: row, error } = await db
    .from("profiles")
    .select("id, intended_major, state, gpa, sai, pell_eligibility_status")
    .eq("id", userId)
    .single();

  if (error || !row) {
    return { user_profile: null, financial_profile: null };
  }

  const user_profile = buildUserProfile(row);
  const financial_profile = buildFinancialProfile(row);

  return { user_profile, financial_profile };
}

function buildUserProfile(row: {
  id: string;
  intended_major: string | null;
  state: string | null;
  gpa: number | null;
}): UserProfile | null {
  const major = row.intended_major?.trim() ?? "";
  const state = row.state?.trim() ?? "";
  if (!major || !state) return null;

  const parsed = UserProfileSchema.safeParse({
    id: row.id,
    major,
    state,
    gpa: row.gpa ?? undefined,
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
