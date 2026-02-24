/**
 * StatsBar — Platform metrics for social proof.
 * Fetches landing_stats (stat_key='default'), displays total_debt_lifted_cents,
 * student_count, match_rate_percent. Loading skeleton, empty fallback per contracts/landing-sections.md.
 */

import { createDbClient } from "@repo/db";
import { landingStatsSchema } from "@repo/db";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function StatsBarSkeleton() {
  return (
    <section
      className="grid grid-cols-1 gap-6 px-4 py-12 sm:grid-cols-3 sm:gap-8"
      aria-label="Platform statistics (loading)"
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-electric-mint/20 bg-navy/50 px-6 py-4 text-center"
        >
          <div className="mx-auto h-8 w-24 rounded bg-electric-mint/20" />
          <div className="mt-2 h-4 w-32 rounded bg-electric-mint/10" />
        </div>
      ))}
    </section>
  );
}

export async function StatsBar() {
  const db = createDbClient();
  const { data, error } = await db
    .from("landing_stats")
    .select("*")
    .eq("stat_key", "default")
    .single();

  if (error || !data) {
    return (
      <section
        className="px-4 py-12 text-center"
        aria-label="Platform statistics"
      >
        <p className="text-off-white/80">Join our community</p>
      </section>
    );
  }

  const parsed = landingStatsSchema.safeParse(data);
  if (!parsed.success) {
    return (
      <section
        className="px-4 py-12 text-center"
        aria-label="Platform statistics"
      >
        <p className="text-off-white/80">Join our community</p>
      </section>
    );
  }

  const { total_debt_lifted_cents, student_count, match_rate_percent } =
    parsed.data;

  const metrics = [
    {
      value: formatCurrency(total_debt_lifted_cents),
      label: "Lifted",
    },
    {
      value: formatCompact(student_count),
      label: "Students",
    },
    {
      value: `${match_rate_percent}%`,
      label: "Match Rate",
    },
  ];

  return (
    <section
      className="grid grid-cols-1 gap-6 px-4 py-12 sm:grid-cols-3 sm:gap-8"
      aria-label="Platform statistics"
    >
      {metrics.map(({ value, label }) => (
        <div
          key={label}
          className="rounded-lg border border-electric-mint/20 bg-navy/50 px-6 py-4 text-center"
        >
          <p className="font-heading text-2xl font-semibold text-electric-mint">
            {value}
          </p>
          <p className="mt-1 text-sm text-off-white/80">{label}</p>
        </div>
      ))}
    </section>
  );
}
