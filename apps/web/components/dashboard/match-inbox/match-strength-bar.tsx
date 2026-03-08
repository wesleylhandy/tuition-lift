/**
 * Match Strength Bar — progress bar showing scholarship fit score (0–100).
 * Per FR-009; null/undefined → placeholder per SC-004.
 */
export interface MatchStrengthBarProps {
  /** Match score 0–100; null → placeholder ("—" or hide) */
  value: number | null | undefined;
  className?: string;
}

export function MatchStrengthBar({ value, className = "" }: MatchStrengthBarProps) {
  const hasValue = value != null && typeof value === "number";
  const score = hasValue ? Math.round(Math.max(0, Math.min(100, value))) : null;

  if (!hasValue || score === null) {
    return (
      <span
        className={`inline-flex items-center text-xs text-muted-foreground ${className}`}
        aria-label="Match strength not available"
      >
        —
      </span>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Match strength: ${score}%`}
    >
      <div className="h-2.5 min-w-[80px] flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-electric-mint transition-[width] duration-300"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
        {score}%
      </span>
    </div>
  );
}
