/**
 * DebtLiftedWidget — Displays total_debt_lifted from landing_stats.
 * Format as currency. Sourced from same fetch as StatsBar (passed as prop).
 * Per contracts/landing-sections.md: hide when unavailable.
 */

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

interface DebtLiftedWidgetProps {
  /** Total debt lifted in cents; null/undefined when unavailable → widget hidden */
  totalDebtLiftedCents: number | null | undefined;
}

export function DebtLiftedWidget({
  totalDebtLiftedCents,
}: DebtLiftedWidgetProps) {
  if (
    totalDebtLiftedCents == null ||
    totalDebtLiftedCents < 0
  ) {
    return null;
  }

  return (
    <div
      className="rounded-lg border border-electric-mint/20 bg-navy/50 px-6 py-4 text-center"
      aria-label="Total debt lifted by platform"
    >
      <p className="font-heading text-2xl font-semibold text-electric-mint">
        {formatCurrency(totalDebtLiftedCents)}
      </p>
      <p className="mt-1 text-sm text-off-white/80">Debt Lifted</p>
    </div>
  );
}
