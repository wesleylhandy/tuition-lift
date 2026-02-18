"use client";

/**
 * Match Card — scholarship card with Trust Shield, Coach's Take, title, amount, deadline.
 * Quick Actions: Track, Dismiss (T031). Per FR-017: toast on error with retry; state unchanged until success.
 */
import { useTransition } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import { TrustShield } from "./trust-shield";
import { CoachesTake } from "./coaches-take";
import { trackScholarship } from "@/lib/actions/track";
import { dismissScholarship } from "@/lib/actions/dismiss";
import { getCurrentAcademicYear } from "@/lib/utils/academic-year";

export interface MatchCardProps {
  id: string;
  /** Scholarship ID for Track/Dismiss (may differ from discovery result id) */
  scholarshipId: string;
  title: string;
  url: string;
  trustScore: number | null | undefined;
  coachTakeText: string | null | undefined;
  amount?: number | null;
  deadline?: string | null;
  /** discovery_run_id from match; passed to dismissScholarship when available (003) */
  discoveryRunId?: string | null;
  /** Called after successful dismiss; parent should remove card from list */
  onDismissSuccess?: () => void;
  /** Called after successful track; parent may update isTracked state */
  onTrackSuccess?: () => void;
  /** When true, Track button disabled (already tracked) */
  isTracked?: boolean;
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

export function MatchCard({
  id,
  scholarshipId,
  title,
  url,
  trustScore,
  coachTakeText,
  amount,
  deadline,
  discoveryRunId,
  onDismissSuccess,
  onTrackSuccess,
  isTracked = false,
}: MatchCardProps) {
  const [pending, startTransition] = useTransition();
  const amountStr = formatAmount(amount);
  const deadlineStr = formatDeadline(deadline);

  const handleTrack = () => {
    if (pending || isTracked) return;
    const academicYear = getCurrentAcademicYear();
    startTransition(async () => {
      const result = await trackScholarship(scholarshipId, academicYear);
      if (!result.success) {
        toast.error(result.error ?? "Failed to track", {
          action: { label: "Retry", onClick: handleTrack },
        });
      } else {
        onTrackSuccess?.();
      }
    });
  };

  const handleDismiss = () => {
    if (pending) return;
    startTransition(async () => {
      const result = await dismissScholarship(scholarshipId, discoveryRunId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to dismiss", {
          action: { label: "Retry", onClick: handleDismiss },
        });
      } else {
        onDismissSuccess?.();
      }
    });
  };

  return (
    <motion.article
      layout
      data-match-id={id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
      aria-label={`Scholarship: ${title}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <TrustShield trustScore={trustScore} />
          <div className="flex shrink-0 gap-1" role="group" aria-label="Quick actions">
            <button
              type="button"
              onClick={handleTrack}
              disabled={pending || isTracked}
              className="rounded px-2 py-1 text-xs font-medium text-navy bg-electric-mint/30 hover:bg-electric-mint/50 focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]"
              aria-label={isTracked ? "Already tracked" : `Track scholarship: ${title}`}
            >
              {isTracked ? "Tracked" : "Track"}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              disabled={pending}
              className="rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]"
              aria-label={`Dismiss ${title} from feed`}
            >
              Dismiss
            </button>
          </div>
        </div>
        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground hover:text-electric-mint hover:underline focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 rounded focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2"
          aria-label={`View scholarship: ${title}`}
        >
          {title}
        </Link>
        <CoachesTake coachTakeText={coachTakeText} />
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
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
    </motion.article>
  );
}
