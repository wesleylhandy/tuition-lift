/**
 * TrustScorer: Reputation Engine per Constitution §10, data-model §4.
 * Domain tier (.edu/.gov→high, .com/.org→vetted/under_review), longevity (WHOIS),
 * fee check (application/processing/guarantee fee → fail, score 0).
 *
 * @see contracts/discovery-internals.md §3, data-model.md §4
 */
import whois from "whois-json";
import type { ScholarshipMetadata } from "./schemas";

export type DomainTier = "high" | "vetted" | "under_review";
export type FeeCheck = "pass" | "fail";

export interface TrustScoreResult {
  trust_score: number;
  trust_report: string;
  domain_tier: DomainTier;
  longevity_score: number;
  fee_check: FeeCheck;
  /** For ScholarshipMetadata.scoring_factors */
  scoring_factors: {
    domain_tier: DomainTier;
    longevity_score: number;
    fee_check: FeeCheck;
  };
}

const FEE_PATTERNS = [
  /application fee/i,
  /processing fee/i,
  /guarantee fee/i,
  /upfront fee/i,
  /\$[\d,]+\s*(?:application|processing|to apply)/i,
  /pay.*(?:application|processing|fee)/i,
];

/**
 * Detects if title/content suggests any upfront fee requirement.
 * Constitution §10: fee required → trust_score 0, hidden.
 */
function suggestsUpfrontFee(title: string, content: string): boolean {
  const text = `${title} ${content}`;
  return FEE_PATTERNS.some((p) => p.test(text));
}

/**
 * Extracts hostname from URL; returns null if invalid.
 */
function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Maps domain to tier per Constitution §10.
 * .edu/.gov → high (80-100); established .com/.org → vetted (60-79); else under_review (<60).
 */
function getDomainTier(hostname: string): DomainTier {
  if (hostname.endsWith(".edu") || hostname.endsWith(".gov")) return "high";
  if (hostname.endsWith(".org")) return "vetted";
  if (hostname.endsWith(".com")) return "vetted";
  return "under_review";
}

/**
 * Fetches domain creation date via WHOIS; returns age in years.
 * Fallback: 12 (midpoint) per research.md when WHOIS unavailable.
 */
async function getDomainAgeYears(hostname: string): Promise<number> {
  try {
    const result = await whois(hostname);
    if (!result || typeof result !== "object") return 12;
    const raw =
      (result as { creationDate?: string }).creationDate ??
      (result as { creation_date?: string }).creation_date;
    if (!raw) return 12;
    const created = new Date(String(raw));
    if (Number.isNaN(created.getTime())) return 12;
    const years =
      (Date.now() - created.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return Math.max(0, Math.min(25, Math.floor(years)));
  } catch {
    return 12;
  }
}

/**
 * Maps domain age in years to longevity score (0-25).
 */
function yearsToLongevityScore(years: number): number {
  if (years <= 0) return 0;
  if (years >= 10) return 25;
  if (years >= 5) return 20;
  if (years >= 3) return 15;
  if (years >= 1) return 10;
  return 5;
}

/**
 * Base score by domain tier (before longevity); max 75 so longevity can add 0-25.
 */
function getBaseScore(tier: DomainTier): number {
  switch (tier) {
    case "high":
      return 75;
    case "vetted":
      return 50;
    case "under_review":
      return 25;
    default:
      return 25;
  }
}

/**
 * Builds human-readable trust report per FR-009.
 */
function buildTrustReport(
  tier: DomainTier,
  longevityScore: number,
  feeCheck: FeeCheck,
  hostname: string
): string {
  if (feeCheck === "fail") {
    return "Fee required (application, processing, or guarantee fee detected). Excluded.";
  }
  const tierLabel =
    tier === "high"
      ? "High-trust .edu/.gov source"
      : tier === "vetted"
        ? "Vetted commercial source"
        : "Under review (unknown domain)";
  const longevityNote =
    longevityScore >= 15
      ? `; domain established (longevity +${longevityScore})`
      : longevityScore > 0
        ? `; longevity +${longevityScore}`
        : "";
  return `${tierLabel}${longevityNote}; no fees.`;
}

/**
 * Scores a scholarship result for trust (0-100) and fee eligibility.
 * Per contracts §3: .edu/.gov→high; fee required→fail, score 0; WHOIS for longevity (fallback 12).
 */
export async function scoreTrust(input: {
  url: string;
  title: string;
  content?: string;
}): Promise<TrustScoreResult> {
  const { url, title, content = "" } = input;
  const hostname = getHostname(url) ?? "unknown";

  const feeCheck: FeeCheck = suggestsUpfrontFee(title, content)
    ? "fail"
    : "pass";

  if (feeCheck === "fail") {
    return {
      trust_score: 0,
      trust_report: buildTrustReport("under_review", 0, "fail", hostname),
      domain_tier: "under_review",
      longevity_score: 0,
      fee_check: "fail",
      scoring_factors: {
        domain_tier: "under_review",
        longevity_score: 0,
        fee_check: "fail",
      },
    };
  }

  const domainTier = getDomainTier(hostname);
  const ageYears = await getDomainAgeYears(hostname);
  const longevityScore = yearsToLongevityScore(ageYears);
  const baseScore = getBaseScore(domainTier);
  const trustScore = Math.min(100, Math.max(0, baseScore + longevityScore));

  return {
    trust_score: trustScore,
    trust_report: buildTrustReport(
      domainTier,
      longevityScore,
      "pass",
      hostname
    ),
    domain_tier: domainTier,
    longevity_score: longevityScore,
    fee_check: "pass",
    scoring_factors: {
      domain_tier: domainTier,
      longevity_score: longevityScore,
      fee_check: "pass",
    },
  };
}

/**
 * Builds ScholarshipMetadata from TrustScoreResult for upsert.
 */
export function toScholarshipMetadata(
  trustResult: TrustScoreResult,
  sourceUrl: string,
  snippet: string,
  categories: string[],
  verificationStatus: string
): ScholarshipMetadata {
  return {
    source_url: sourceUrl,
    snippet,
    scoring_factors: trustResult.scoring_factors,
    trust_report: trustResult.trust_report,
    categories,
    verification_status: verificationStatus as
      | "verified"
      | "ambiguous_deadline"
      | "needs_manual_review"
      | "potentially_expired",
  };
}
