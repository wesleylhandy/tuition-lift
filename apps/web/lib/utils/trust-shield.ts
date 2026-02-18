/**
 * Trust Shield: maps trust_score to badge color per Trust Filter (Constitution §8).
 * Used by Trust Shield component to display scholarship reputation at a glance.
 */
export type TrustShieldTier = "high" | "vetted" | "caution" | "low" | "neutral";

export interface TrustShieldBadge {
  tier: TrustShieldTier;
  label: string;
  /** Tailwind classes for the badge (background, text, ring). */
  className: string;
}

const TRUST_TIERS: { tier: TrustShieldTier; minScore: number; label: string; className: string }[] = [
  { tier: "high", minScore: 80, label: "High Trust", className: "bg-green-600/90 text-white ring-green-500/30" },
  { tier: "vetted", minScore: 60, label: "Vetted", className: "bg-amber-600/90 text-white ring-amber-500/30" },
  { tier: "caution", minScore: 40, label: "Verify with Caution", className: "bg-yellow-600/90 text-white ring-yellow-500/30" },
  { tier: "low", minScore: 0, label: "Low Trust", className: "bg-red-600/90 text-white ring-red-500/30" },
];

const NEUTRAL_BADGE: TrustShieldBadge = {
  tier: "neutral",
  label: "Unrated",
  className: "bg-gray-500/90 text-white ring-gray-400/30",
};

/**
 * Maps trust_score to badge config for Trust Shield display.
 * Ranges: Green 80–100, Amber 60–79, Yellow 40–59, Red 0–39, gray for null.
 */
export function getTrustShieldBadge(trustScore: number | null | undefined): TrustShieldBadge {
  if (trustScore == null || typeof trustScore !== "number") {
    return NEUTRAL_BADGE;
  }

  const score = Math.round(trustScore);
  if (score < 0 || score > 100) {
    return NEUTRAL_BADGE;
  }

  const fallback = TRUST_TIERS[TRUST_TIERS.length - 1]!;
  const config = TRUST_TIERS.find((t) => score >= t.minScore) ?? fallback;
  return { tier: config.tier, label: config.label, className: config.className };
}
