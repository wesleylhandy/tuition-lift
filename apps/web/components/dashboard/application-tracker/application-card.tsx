"use client";

/**
 * Application Card — displays application/scholarship info, status, deadline.
 * Quick Actions: Verify Submission for draft status (T032, T034).
 * Per T027 [US3], T032, T034.
 */
import { useRef, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { verifySubmission } from "@/lib/actions/verify-submission";

export interface ApplicationCardProps {
  applicationId: string;
  scholarshipTitle: string;
  scholarshipUrl?: string | null;
  status: string;
  deadline: string | null;
  amount?: number | null;
  /** Coach display state for badge styling */
  coachState?: string;
  /** When true, show Verify Submission button (draft status) */
  showVerifySubmission?: boolean;
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
  showVerifySubmission = false,
}: ApplicationCardProps) {
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const amountStr = formatAmount(amount);
  const deadlineStr = formatDeadline(deadline);

  const handleVerifyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending || !showVerifySubmission) return;
    dialogRef.current?.showModal();
  };

  const handleVerifyConfirm = () => {
    if (pending) return;
    dialogRef.current?.close();
    startTransition(async () => {
      const result = await verifySubmission(applicationId, true);
      if (!result.success) {
        toast.error(result.error ?? "Failed to verify", {
          action: { label: "Retry", onClick: handleVerifyConfirm },
        });
      }
    });
  };

  const handleVerifyCancel = () => {
    dialogRef.current?.close();
  };

  const canVerify = showVerifySubmission && status === "draft";

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
      {canVerify && (
        <div className="flex gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleVerifyClick}
            disabled={pending}
            className="min-h-[44px] rounded px-3 py-2 text-xs font-medium text-navy bg-electric-mint/30 hover:bg-electric-mint/50 focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Verify submission for ${scholarshipTitle}`}
          >
            Verify Submission
          </button>
        </div>
      )}
      <dialog
        ref={dialogRef}
        className="max-w-md rounded-lg border bg-background p-4 shadow-lg [&::backdrop]:bg-black/50"
        aria-labelledby="verify-dialog-title"
        aria-describedby="verify-dialog-desc"
        onCancel={handleVerifyCancel}
      >
        <h2 id="verify-dialog-title" className="font-heading text-lg font-semibold text-navy">
          Verify submission
        </h2>
        <p id="verify-dialog-desc" className="mt-2 text-sm text-muted-foreground">
          Have you submitted this application? This will mark it as Submitted.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleVerifyCancel}
            className="min-h-[44px] rounded px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleVerifyConfirm}
            disabled={pending}
            className="min-h-[44px] rounded px-3 py-2 text-sm font-medium text-navy bg-electric-mint hover:bg-electric-mint/90 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 disabled:opacity-50"
          >
            {pending ? "Verifying…" : "Confirm"}
          </button>
        </div>
      </dialog>
    </div>
  );

  if (scholarshipUrl) {
    return (
      <li role="listitem">
        <Link
          href={scholarshipUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block min-h-[44px] focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 rounded-lg"
          aria-label={`Open ${scholarshipTitle} application`}
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
