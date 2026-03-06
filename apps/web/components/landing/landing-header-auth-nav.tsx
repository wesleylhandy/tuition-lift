"use client";

/**
 * LandingHeaderAuthNav — Debt Lifted HUD + User Avatar for authenticated users on landing/auth pages.
 * Per FR-010, FR-013: Debt Lifted shows placeholder/skeleton until data available.
 * Fetches from /api/coach/game-plan; reuses DebtLiftedRing compact from global-header pattern.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { DebtLiftedRing } from "@/components/dashboard/game-plan/debt-lifted-ring";

export function LandingHeaderAuthNav() {
  const [debtLiftedCents, setDebtLiftedCents] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/coach/game-plan", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.debtLifted?.totalCents != null) {
          setDebtLiftedCents(data.debtLifted.totalCents);
        } else if (!cancelled) {
          setDebtLiftedCents(0);
        }
      })
      .catch(() => {
        if (!cancelled) setDebtLiftedCents(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayCents = debtLiftedCents ?? 0;

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      {/* Debt Lifted — skeleton until data; compact variant for dark landing theme */}
      <div className="hidden shrink-0 sm:block">
        {debtLiftedCents === null ? (
          <div
            className="flex h-10 w-24 animate-pulse items-center gap-2 rounded"
            role="status"
            aria-label="Loading debt lifted"
          >
            <div className="h-10 w-10 shrink-0 rounded-full bg-electric-mint/20" />
            <div className="h-4 w-12 rounded bg-electric-mint/20" />
          </div>
        ) : (
          <DebtLiftedRing
            totalCents={displayCents}
            compact
            variant="dark"
            className="text-off-white"
          />
        )}
      </div>
      <div
        className="flex shrink-0 items-center sm:hidden"
        role="status"
        aria-label={
          debtLiftedCents === null
            ? "Loading debt lifted"
            : `Debt lifted: $${(displayCents / 100).toLocaleString()}`
        }
      >
        {debtLiftedCents === null ? (
          <div className="h-5 w-14 animate-pulse rounded bg-electric-mint/20" />
        ) : (
          <span className="font-heading text-sm font-semibold text-off-white">
            ${(displayCents / 100).toLocaleString()}
          </span>
        )}
      </div>

      {/* Account — link to dashboard */}
      <Link
        href="/dashboard"
        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border border-electric-mint/50 bg-transparent px-4 py-2.5 text-sm font-medium text-electric-mint transition-colors hover:bg-electric-mint/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
        aria-label="Go to dashboard"
      >
        <User className="h-5 w-5 sm:hidden" aria-hidden />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>
    </div>
  );
}
