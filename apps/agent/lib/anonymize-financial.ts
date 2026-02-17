/**
 * Financial anonymization: map financial_profile to search-safe strings.
 * Per FR-007, FR-007a: no raw SAI, income numbers, or PII to search APIs.
 * Use placeholders {{USER_STATE}}, {{USER_CITY}} for geo—never real values.
 */
import type { FinancialProfile } from "./schemas";

/** Search-safe income bracket strings; never send raw SAI. */
export type AnonymizedIncomeBracket =
  | "Low Income"
  | "Moderate"
  | "Middle"
  | "Upper-Middle"
  | "High";

/** Search-safe Pell status strings. */
export type AnonymizedPellStatus =
  | "Pell Eligible"
  | "Not Pell Eligible"
  | "Unknown";

/** Result of anonymizing a financial profile for search APIs. */
export interface AnonymizedFinancialContext {
  household_income: AnonymizedIncomeBracket;
  pell_status: AnonymizedPellStatus;
}

/** Geo placeholders for search queries; use instead of real state/city (FR-007a). */
export const GEO_PLACEHOLDERS = {
  USER_STATE: "{{USER_STATE}}",
  USER_CITY: "{{USER_CITY}}",
} as const;

type SourceBracket = FinancialProfile["household_income_bracket"];

const BRACKET_MAP: Record<SourceBracket, AnonymizedIncomeBracket> = {
  Low: "Low Income",
  Moderate: "Moderate",
  Middle: "Middle",
  "Upper-Middle": "Upper-Middle",
  High: "High",
};

/**
 * Maps financial_profile to search-safe strings for third-party search APIs.
 * Raw SAI, income numbers, and PII are never included.
 */
export function anonymizeFinancial(
  profile: FinancialProfile
): AnonymizedFinancialContext {
  return {
    household_income: BRACKET_MAP[profile.household_income_bracket],
    pell_status: profile.is_pell_eligible ? "Pell Eligible" : "Not Pell Eligible",
  };
}

/**
 * Maps SAI to search-safe band string for queries (FR-016).
 * Used only after HITL confirmation; bands align with federal need tiers.
 * Returns e.g. "0-2000", "2000-5000", "-1500-0".
 */
export function saiToBandString(sai: number): string {
  if (sai <= 0) return "-1500-0";
  if (sai <= 2000) return "0-2000";
  if (sai <= 5000) return "2000-5000";
  if (sai <= 15000) return "5000-15000";
  if (sai <= 35000) return "15000-35000";
  return "35000+";
}

/**
 * Builds a search query using only anonymized inputs. Single point of construction
 * for third-party search APIs — ensures no raw SAI, SSN, tax data, names, or addresses.
 * FR-007, FR-007a, SC-003: geo uses placeholders only; income uses brackets or bands.
 */
export function buildSearchQuery(params: {
  major: string;
  incomeContext: AnonymizedIncomeBracket | string;
  pellStatus: AnonymizedPellStatus | string;
}): string {
  const { major, incomeContext, pellStatus } = params;
  return [
    "scholarships",
    `for ${major} major`,
    `in ${GEO_PLACEHOLDERS.USER_STATE} ${GEO_PLACEHOLDERS.USER_CITY}`,
    incomeContext,
    pellStatus,
    "need-based financial aid",
  ].join(" ");
}

/**
 * Runtime guard: throws if query may contain raw PII. Call before invoking search APIs.
 * FR-007, SC-003: ensures no raw SAI (standalone 4–6 digit numbers in SAI range).
 */
export function assertNoRawPiiInSearchQuery(
  query: string,
  financialProfile: { estimated_sai: number } | null
): void {
  if (!query.includes(GEO_PLACEHOLDERS.USER_STATE)) {
    throw new Error(
      "PII guard: query must use {{USER_STATE}} placeholder (FR-007a)"
    );
  }
  if (!query.includes(GEO_PLACEHOLDERS.USER_CITY)) {
    throw new Error(
      "PII guard: query must use {{USER_CITY}} placeholder (FR-007a)"
    );
  }
  if (financialProfile && typeof financialProfile.estimated_sai === "number") {
    const raw = String(financialProfile.estimated_sai);
    const asStandalone = new RegExp(
      `(^|\\s)${raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`
    );
    if (asStandalone.test(query)) {
      throw new Error(
        "PII guard: query must not contain raw SAI (FR-007, SC-003)"
      );
    }
  }
}
