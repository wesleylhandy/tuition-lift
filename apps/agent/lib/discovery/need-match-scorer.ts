/**
 * NeedMatchScorer: SAI-aware prioritization per FR-010, US3.
 * Compares student financial profile to scholarship eligibility signals;
 * outputs need_match_score 0–100 for Match Inbox ordering.
 *
 * Last-Dollar and need-based scholarships rank higher for students with
 * lower SAI and Pell eligibility. Constitution §4: SAI used internally only.
 *
 * @see contracts/discovery-internals.md §8, data-model.md §1, spec.md US3
 */
import type { FinancialProfile } from "../schemas";

export type ScholarshipContent = {
  title: string;
  content: string;
};

/** Need-based signals detected in scholarship content. */
type ScholarshipNeedSignals = {
  isNeedBased: boolean;
  isPellTargeted: boolean;
  isLastDollar: boolean;
  isMeritOnly: boolean;
};

/**
 * Extracts need-related signals from scholarship title and content.
 * Used to infer eligibility criteria for SAI alignment scoring.
 */
function inferNeedSignals(content: ScholarshipContent): ScholarshipNeedSignals {
  const text = `${content.title} ${content.content}`.toLowerCase();
  const isNeedBased =
    /\bneed[- ]?based\b/i.test(text) ||
    /\bfinancial need\b/i.test(text) ||
    /\blow income\b/i.test(text) ||
    /\bincome[- ]?based\b/i.test(text);
  const isPellTargeted =
    /\bpell\b/i.test(text) ||
    /\bpell eligible\b/i.test(text) ||
    /\bfederal aid\b/i.test(text);
  const isLastDollar =
    /\blast[- ]?dollar\b/i.test(text) ||
    /\b(last[- ]?dollar|gap[- ]?filling)\b/i.test(text) ||
    /\bfills?\s+(the\s+)?gap\b/i.test(text);
  const meritOnly =
    /\bmerit\b/i.test(text) &&
    !isNeedBased &&
    !isPellTargeted &&
    !isLastDollar;

  return {
    isNeedBased: isNeedBased || isPellTargeted || isLastDollar,
    isPellTargeted,
    isLastDollar,
    isMeritOnly: meritOnly,
  };
}

/**
 * Maps SAI to need tier (0 = highest need, 5 = minimal need).
 * Aligns with federal brackets and saiToBandString ranges.
 */
function saiToNeedTier(sai: number): number {
  if (sai <= 0) return 0;
  if (sai <= 2000) return 1;
  if (sai <= 5000) return 2;
  if (sai <= 15000) return 3;
  if (sai <= 35000) return 4;
  return 5;
}

/**
 * Computes need_match_score (0–100) comparing student profile to scholarship.
 * Higher score = better SAI/gap alignment for Match Inbox ranking.
 *
 * @param profile - Student financial profile (SAI, Pell, income bracket)
 * @param content - Scholarship title and content for eligibility inference
 * @returns 0–100 score
 */
export function computeNeedMatchScore(
  profile: FinancialProfile | null,
  content: ScholarshipContent
): number {
  const signals = inferNeedSignals(content);

  if (!profile) {
    return 50;
  }

  const needTier = saiToNeedTier(profile.estimated_sai);
  const pellEligible = profile.is_pell_eligible;
  const isLowNeed =
    profile.household_income_bracket === "Low" ||
    profile.household_income_bracket === "Moderate";
  const isHighIncome =
    profile.household_income_bracket === "Upper-Middle" ||
    profile.household_income_bracket === "High";

  let score = 50;

  if (signals.isLastDollar) {
    if (pellEligible || needTier <= 1) score += 45;
    else if (needTier <= 2) score += 35;
    else if (needTier <= 3) score += 20;
    else score -= 15;
  } else if (signals.isNeedBased || signals.isPellTargeted) {
    if (pellEligible && isLowNeed) score += 40;
    else if (pellEligible || needTier <= 2) score += 30;
    else if (needTier <= 3) score += 15;
    else if (isHighIncome) score -= 25;
  } else if (signals.isMeritOnly) {
    if (isHighIncome) score += 5;
    else if (needTier <= 2) score -= 10;
  }

  return Math.min(100, Math.max(0, score));
}
