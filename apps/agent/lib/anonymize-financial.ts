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
