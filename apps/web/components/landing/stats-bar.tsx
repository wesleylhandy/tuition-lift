/**
 * StatsBar — Platform metrics for social proof.
 * Fetches landing_stats (stat_key='default') when stats not provided; displays
 * total_debt_lifted_cents, student_count, match_rate_percent. Loading skeleton,
 * empty fallback per contracts/landing-sections.md.
 */

import { createDbClient, landingStatsSchema } from "@repo/db";
import type { LandingStatsSchema } from "@repo/db";

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
      aria-labelledby="stats-skeleton-heading"
    >
      <h2 id="stats-skeleton-heading" className="sr-only">
        Platform statistics (loading)
      </h2>
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

export async function fetchLandingStats(): Promise<LandingStatsSchema | null> {
  const db = createDbClient();
  const { data, error } = await db
    .from("landing_stats")
    .select("*")
    .eq("stat_key", "default")
    .single();
  if (error || !data) return null;
  const parsed = landingStatsSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

function StatsBarContent({ stats }: { stats: LandingStatsSchema | null }) {
  if (!stats) {
    return (
      <section
        className="px-4 py-12 text-center"
        aria-labelledby="stats-heading"
      >
        <h2 id="stats-heading" className="sr-only">
          Platform statistics
        </h2>
        <p className="text-off-white/80">Join our community</p>
      </section>
    );
  }

  const { total_debt_lifted_cents, student_count, match_rate_percent } = stats;

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
      aria-labelledby="stats-heading"
    >
      <h2 id="stats-heading" className="sr-only">
        Platform statistics
      </h2>
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

/** When stats not provided, fetches; otherwise uses passed stats (for shared fetch with CtaSection). */
export async function StatsBar({
  stats: statsProp,
}: { stats?: LandingStatsSchema | null } = {}) {
  const stats =
    statsProp !== undefined ? statsProp : await fetchLandingStats();
  return <StatsBarContent stats={stats} />;
}
