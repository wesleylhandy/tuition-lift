"use client";

/**
 * Debt Lifted — progress ring showing cumulative $ from confirmed Won scholarships.
 * Per FR-007; applications where status='awarded' AND confirmed_at IS NOT NULL.
 * T022 [US2].
 */
export interface DebtLiftedRingProps {
  /** Total amount in cents (e.g. 50000 = $500) */
  totalCents: number;
  /** Optional goal in cents for ring fill (default: max of total or 10000) */
  goalCents?: number;
  /** Compact variant for header; uses smaller ring and text */
  compact?: boolean;
  /** Dark variant for dark backgrounds (off-white text); default for light backgrounds */
  variant?: "default" | "dark";
  className?: string;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export function DebtLiftedRing({
  totalCents,
  goalCents,
  compact = false,
  variant = "default",
  className = "",
}: DebtLiftedRingProps) {
  const displayTotal = formatCurrency(totalCents);
  const goal = goalCents ?? Math.max(totalCents, 10000);
  const progress = goal > 0 ? Math.min(totalCents / goal, 1) : 0;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - progress);
  const isDark = variant === "dark";
  const textPrimary = isDark ? "text-off-white" : "text-navy";
  const textSecondary = isDark ? "text-electric-mint/80" : "text-muted-foreground";

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 ${className}`}
        role="status"
        aria-label={`Debt lifted: ${displayTotal}`}
      >
        <svg
          className="h-10 w-10 shrink-0 -rotate-90"
          viewBox="0 0 100 100"
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className={isDark ? "text-off-white/30" : "text-muted/30"}
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className="text-electric-mint transition-[stroke-dashoffset] duration-500"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
            }}
          />
        </svg>
        <div className="flex flex-col">
          <p
            className={`font-heading text-sm font-semibold leading-tight ${textPrimary}`}
          >
            {displayTotal}
          </p>
          <p className={`text-[10px] leading-tight ${textSecondary}`}>
            Debt lifted
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center gap-2 ${className}`}
      role="status"
      aria-label={`Debt lifted: ${displayTotal}`}
    >
      <svg
        className="h-28 w-28 -rotate-90"
        viewBox="0 0 100 100"
        aria-hidden
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/30"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          className="text-electric-mint transition-[stroke-dashoffset] duration-500"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
          }}
        />
      </svg>
      <div className="text-center">
        <p
          className={`font-heading text-lg font-semibold leading-tight ${textPrimary}`}
        >
          {displayTotal}
        </p>
        <p className={`text-xs leading-tight ${textSecondary}`}>Debt lifted</p>
      </div>
    </div>
  );
}
