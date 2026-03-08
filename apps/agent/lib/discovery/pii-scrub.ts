/**
 * PII scrub utility: strips full_name and SSN from profile before external calls.
 * Per FR-002, FR-003, Constitution §4: raw PII must never leave the system.
 *
 * Use before invoking QueryGenerator, Tavily, LLM, or any third-party API.
 * Returns AnonymizedProfile containing only search-safe attributes (gpa, major, state, incomeBracket, pellStatus).
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
  /** US1 T022: award_year from state for cycle-aware query generation. */
  award_year?: number | null;
  /** US7 C1: Saved institution names from user_saved_schools (loaded in Advisor_Search). */
  savedInstitutionNames?: string[];
  /** PII — never passed through. Present when loading raw profiles row. */
  full_name?: string | null;
  ssn?: string | null;
}

/**
 * Replaces spike text that could contain PII with placeholder.
 * Only pass safe activity labels (e.g., "Water Polo", "Leadership").
 * Team names, coach names, org names → "{{SPIKE_N}}" per research §8.
 */
function scrubSpikes(raw: string[] | undefined): string[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const PII_PATTERNS = [
    /\b(?:mr\.?|mrs\.?|ms\.?|dr\.?)\s+\w+/i,
    /coach\s+\w+/i,
    /\bteam\s+[A-Z][a-z]+/i,
    /\d{3}[-.]?\d{3}[-.]?\d{4}/,
  ];
  const safe: string[] = [];
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const s = String(raw[i] ?? "").trim().slice(0, 100);
    if (!s) continue;
    const hasPii = PII_PATTERNS.some((p) => p.test(s));
    safe.push(hasPii ? `{{SPIKE_${i + 1}}}` : s);
  }
  return safe.length > 0 ? safe : undefined;
}

/**
 * Scrubs PII (full_name, SSN) from profile and returns AnonymizedProfile for external calls.
 * Only gpa, major, state, incomeBracket, pellStatus, spikes (labels only) included; full_name and ssn stripped.
 * US1 (009): spikes scrubbed—pass only safe activity labels, replace PII with placeholders.
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
    userProfile.gpa <= 6
      ? userProfile.gpa
      : undefined;
  const major =
    typeof userProfile?.major === "string" && userProfile.major.trim().length > 0
      ? userProfile.major.trim()
      : undefined;
  const state =
    typeof userProfile?.state === "string" && userProfile.state.trim().length >= 2
      ? userProfile.state.trim().slice(0, 2).toUpperCase()
      : undefined;
  const spikes = scrubSpikes(
    (userProfile as { spikes?: string[] } | undefined)?.spikes
  );

  const award_year =
    typeof input.award_year === "number" &&
    input.award_year >= 2024 &&
    input.award_year <= 2034
      ? input.award_year
      : undefined;

  const first_gen = userProfile && "first_gen" in userProfile && userProfile.first_gen === true ? true : undefined;
  const parent_employer_category =
    userProfile && "parent_employer_category" in userProfile && typeof (userProfile as { parent_employer_category?: string }).parent_employer_category === "string"
      ? (userProfile as { parent_employer_category: string }).parent_employer_category.trim().slice(0, 100)
      : undefined;
  const identity_eligibility_categories =
    userProfile && "identity_eligibility_categories" in userProfile && Array.isArray((userProfile as { identity_eligibility_categories?: string[] }).identity_eligibility_categories)
      ? (userProfile as { identity_eligibility_categories: string[] }).identity_eligibility_categories
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0 && s.length <= 100)
          .slice(0, 10)
      : undefined;
  const savedInstitutionNames =
    Array.isArray(input.savedInstitutionNames) && input.savedInstitutionNames.length > 0
      ? input.savedInstitutionNames.filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, 10).map((s) => s.trim().slice(0, 200))
      : undefined;

  const anonymized = {
    gpa,
    major,
    state,
    incomeBracket: financialProfile?.household_income_bracket,
    pellStatus: financialProfile?.is_pell_eligible,
    spikes,
    award_year,
    first_gen,
    parent_employer_category,
    identity_eligibility_categories,
    savedInstitutionNames,
  };

  return AnonymizedProfileSchema.parse(anonymized);
}
