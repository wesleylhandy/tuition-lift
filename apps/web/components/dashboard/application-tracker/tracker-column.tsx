"use client";

/**
 * Tracker Column — one lifecycle stage column with title and list of cards.
 * Per T026 [US3]: Application Tracker Lifecycle View.
 */
import type { ReactNode } from "react";

export interface TrackerColumnProps {
  title: string;
  children: ReactNode;
  /** Optional aria-label for accessibility */
  ariaLabel?: string;
  className?: string;
}

export function TrackerColumn({
  title,
  children,
  ariaLabel,
  className = "",
}: TrackerColumnProps) {
  return (
    <section
      className={`flex min-w-0 flex-1 flex-col rounded-lg border bg-muted/30 p-3 ${className}`}
      aria-label={ariaLabel ?? `${title} applications`}
    >
      <h3 className="mb-2 font-heading text-sm font-semibold text-navy">
        {title}
      </h3>
      <ul
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto"
        role="list"
      >
        {children}
      </ul>
    </section>
  );
}
