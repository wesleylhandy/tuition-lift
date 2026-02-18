/**
 * Trust Shield — badge showing scholarship reputation from Trust Filter (Constitution §8).
 * Maps trust_score to Green/Amber/Yellow/Red per FR-004, data-model.md.
 */
import { getTrustShieldBadge } from "@/lib/utils/trust-shield";

export interface TrustShieldProps {
  /** Trust score 0–100; null/undefined → neutral gray */
  trustScore: number | null | undefined;
  className?: string;
}

export function TrustShield({ trustScore, className = "" }: TrustShieldProps) {
  const badge = getTrustShieldBadge(trustScore);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badge.className} ${className}`}
      role="status"
      aria-label={`Trust: ${badge.label}`}
    >
      {badge.label}
    </span>
  );
}
