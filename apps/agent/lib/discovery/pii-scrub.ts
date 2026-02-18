/**
 * PII scrub utility: strips full_name and SSN from profile before external calls.
 * Per FR-002, FR-003, Constitution §4: raw PII must never leave the system.
 *
 * Use before invoking QueryGenerator, Tavily, LLM, or any third-party API.
 * Returns AnonymizedProfile containing only search-safe attributes (gpa, major, incomeBracket, pellStatus).
 */
import type { FinancialProfile, UserProfile } from "../schemas";
import { AnonymizedProfileSchema, type AnonymizedProfile } from "./schemas";

/**
 * Input for scrubbing. May include PII (full_name, ssn) from raw DB or other sources.
 * PII fields are never included in output; only safe attributes are extracted.
 */
export interface ProfileWithPossiblePii {
  user_profile?: UserProfile | null;
  financial_profile?: FinancialProfile | null;
  /** PII — never passed through. Present when loading raw profiles row. */
  full_name?: string | null;
  ssn?: string | null;
}

/**
 * Scrubs PII (full_name, SSN) from profile and returns AnonymizedProfile for external calls.
 * Only gpa, major, incomeBracket, pellStatus are included; full_name and ssn are stripped.
 *
 * @param input - Profile that may contain PII from user_profile, financial_profile, or raw fields
 * @returns AnonymizedProfile safe for third-party search APIs (Tavily, LLM query gen)
 */
export function scrubPiiFromProfile(input: ProfileWithPossiblePii): AnonymizedProfile {
  const userProfile = input.user_profile;
  const financialProfile = input.financial_profile;

  const gpa =
    typeof userProfile?.gpa === "number" &&
    userProfile.gpa >= 0 &&
    userProfile.gpa <= 4
      ? userProfile.gpa
      : undefined;
  const major =
    typeof userProfile?.major === "string" && userProfile.major.trim().length > 0
      ? userProfile.major.trim()
      : undefined;

  const anonymized = {
    gpa,
    major,
    incomeBracket: financialProfile?.household_income_bracket,
    pellStatus: financialProfile?.is_pell_eligible,
  };

  return AnonymizedProfileSchema.parse(anonymized);
}
