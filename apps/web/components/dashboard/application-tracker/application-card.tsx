"use client";

/**
 * Application Card — displays application/scholarship info, status, deadline.
 * Per T027 [US3]: Application Tracker Lifecycle View.
 */
import Link from "next/link";

export interface ApplicationCardProps {
  applicationId: string;
  scholarshipTitle: string;
  scholarshipUrl?: string | null;
  status: string;
  deadline: string | null;
  amount?: number | null;
  /** Coach display state for badge styling */
  coachState?: string;
}

function formatAmount(amount: number | null | undefined): string | null {
  if (amount == null || typeof amount !== "number") return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDeadline(deadline: string | null | undefined): string | null {
  if (!deadline) return null;
  try {
    const d = new Date(deadline);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return deadline;
  }
}

export function ApplicationCard({
  applicationId,
  scholarshipTitle,
  scholarshipUrl,
  status,
  deadline,
  amount,
  coachState,
}: ApplicationCardProps) {
  const amountStr = formatAmount(amount);
  const deadlineStr = formatDeadline(deadline);

  const content = (
    <div className="flex flex-col gap-1.5 rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 font-medium text-foreground line-clamp-2">
          {scholarshipTitle}
        </p>
        {coachState && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              coachState === "Won"
                ? "bg-green-500/20 text-green-700 dark:text-green-400"
                : coachState === "Lost"
                  ? "bg-muted text-muted-foreground"
                  : "bg-electric-mint/20 text-navy"
            }`}
          >
            {coachState}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {amountStr && (
          <span aria-label={`Amount: ${amountStr}`}>{amountStr}</span>
        )}
        {deadlineStr && (
          <span aria-label={`Deadline: ${deadlineStr}`}>
            Due {deadlineStr}
          </span>
        )}
      </div>
    </div>
  );

  if (scholarshipUrl) {
    return (
      <li role="listitem">
        <Link
          href={scholarshipUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 rounded-lg"
          data-application-id={applicationId}
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li
      role="listitem"
      data-application-id={applicationId}
      className="rounded-lg focus-within:ring-2 focus-within:ring-electric-mint focus-within:ring-offset-2"
    >
      {content}
    </li>
  );
}
