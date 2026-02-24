"use client";

/**
 * GlobalHeader — logo, search bar, notification center, Debt Lifted ring, user dropdown.
 * Debt Lifted fetches from /api/coach/game-plan (applications with status=awarded, confirmed).
 * @see contracts/component-shell.md, FR-009
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Search, User } from "lucide-react";
import { LogoPlaceholder } from "./logo-placeholder";
import { DebtLiftedRing } from "./game-plan/debt-lifted-ring";

interface GlobalHeaderProps {
  /** Override debt lifted (server-passed); when omitted, fetches from /api/coach/game-plan */
  debtLiftedCents?: number;
  /** Notification count; badge hidden when 0 */
  notificationCount?: number;
}

export function GlobalHeader({
  debtLiftedCents: debtLiftedProp,
  notificationCount = 0,
}: GlobalHeaderProps) {
  const [debtLiftedCents, setDebtLiftedCents] = useState<number | null>(
    debtLiftedProp ?? null
  );

  useEffect(() => {
    if (debtLiftedProp != null) {
      setDebtLiftedCents(debtLiftedProp);
      return;
    }
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
  }, [debtLiftedProp]);

  const displayDebtCents = debtLiftedCents ?? 0;
  const debtFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(displayDebtCents / 100);

  return (
    <header
      className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-hidden border-b border-border bg-background px-3 py-3 sm:gap-3 sm:px-4 lg:gap-6 lg:px-6"
      role="banner"
    >
      {/* Branding */}
      <Link
        href="/dashboard"
        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center gap-2 focus-visible:outline focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
        aria-label="TuitionLift Home"
      >
        <LogoPlaceholder />
        <span className="sr-only lg:not-sr-only lg:inline-block">
          <span className="font-heading text-base font-semibold text-navy">
            TuitionLift
          </span>
          <span className="ml-2 hidden text-sm text-slate lg:inline">
            Scholarship Command Center
          </span>
        </span>
      </Link>

      {/* Spacer on mobile — pushes right-side items to the right; search bar has flex-1 on sm+ */}
      <div className="min-w-0 flex-1 sm:hidden" aria-hidden />
      {/* Search bar — flex-1 fills space between logo and actions on sm+ */}
      <div className="hidden min-w-0 flex-1 sm:block lg:max-w-md">
        <input
          type="search"
          placeholder="Search scholarships, deadlines, or requirements..."
          aria-label="Search scholarships, deadlines, or requirements"
          className="h-11 min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
          readOnly
        />
      </div>

      {/* Search icon on mobile */}
      <button
        type="button"
        aria-label="Search"
        className="flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md hover:bg-accent focus-visible:outline focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 sm:hidden"
      >
        <Search className="h-5 w-5 text-navy" aria-hidden />
      </button>

      {/* Notification center */}
      <button
        type="button"
        aria-label={
          notificationCount > 0
            ? `Notifications: ${notificationCount} unread`
            : "Notifications"
        }
        className="relative flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md hover:bg-accent focus-visible:outline focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
      >
        <Bell className="h-5 w-5 text-navy" aria-hidden />
        {notificationCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-electric-mint px-1 text-xs font-medium text-navy"
            aria-hidden
          >
            {notificationCount}
          </span>
        )}
      </button>

      {/* Debt Lifted — compact for header; hides label on narrow viewports to prevent overflow */}
      <div className="hidden shrink-0 sm:block">
        <DebtLiftedRing totalCents={displayDebtCents} compact />
      </div>
      <div
        className="flex shrink-0 items-center sm:hidden"
        role="status"
        aria-label={`Debt lifted: ${debtFormatted}`}
      >
        <span className="font-heading text-sm font-semibold text-navy">
          {debtFormatted}
        </span>
      </div>

      {/* Account — icon on mobile to save space */}
      <button
        type="button"
        aria-label="Account menu"
        className="flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md border border-input px-4 hover:bg-accent focus-visible:outline focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
      >
        <User className="h-5 w-5 text-slate sm:hidden" aria-hidden />
        <span className="hidden text-sm text-slate sm:inline">Account</span>
      </button>
    </header>
  );
}
