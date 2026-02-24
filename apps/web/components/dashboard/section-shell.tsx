/**
 * SectionShell — generic wrapper for dashboard sections.
 * Provides loading skeleton, error state, and content rendering per FR-015, FR-016, FR-018.
 * Uses generic skeletons: list-skeleton, card-skeleton, welcome-skeleton, stats-skeleton, deadline-calendar-skeleton.
 * @see contracts/component-shell.md
 */
"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "./skeletons/list-skeleton";
import { CardSkeleton } from "./skeletons/card-skeleton";
import { WelcomeSkeleton } from "./skeletons/welcome-skeleton";
import { StatsSkeleton } from "./skeletons/stats-skeleton";
import { DeadlineCalendarSkeleton } from "./skeletons/deadline-calendar-skeleton";

export type SectionStatus = "loading" | "error" | "content";

export type SkeletonVariant = "list" | "card" | "calendar" | "text" | "stats";

export interface SectionShellProps {
  /** Current state: loading shows skeleton, error shows retry UI, content shows children */
  status: SectionStatus;
  /** Retry handler when status=error */
  onRetry?: () => void;
  /** Skeleton shape when status=loading */
  skeletonVariant: SkeletonVariant;
  /** Section title (for skeleton/error context) */
  title?: string;
  /** Rendered when status=content */
  children?: ReactNode;
}

function VariantSkeleton({
  variant,
  title,
}: {
  variant: SkeletonVariant;
  title?: string;
}) {
  return (
    <div className="space-y-3" aria-label={title ?? "Loading"} aria-busy>
      {title && <Skeleton className="h-5 w-32" aria-hidden />}
      {variant === "list" && <ListSkeleton />}
      {variant === "card" && <CardSkeleton />}
      {variant === "calendar" && <DeadlineCalendarSkeleton />}
      {variant === "text" && <WelcomeSkeleton />}
      {variant === "stats" && <StatsSkeleton />}
    </div>
  );
}

export function SectionShell({
  status,
  onRetry,
  skeletonVariant,
  title,
  children,
}: SectionShellProps) {
  if (status === "loading") {
    return (
      <section aria-label={title} aria-busy>
        <VariantSkeleton variant={skeletonVariant} title={title} />
      </section>
    );
  }

  if (status === "error") {
    const retryLabel = title ? `Retry loading ${title}` : "Retry";
    return (
      <section aria-label={title} aria-live="polite">
        <p className="text-sm text-muted-foreground">
          Something went wrong. Try again.
        </p>
        {onRetry != null && (
          <button
            type="button"
            onClick={onRetry}
            aria-label={retryLabel}
            className="mt-3 flex h-11 min-w-11 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Retry
          </button>
        )}
      </section>
    );
  }

  return <section aria-label={title}>{children}</section>;
}
