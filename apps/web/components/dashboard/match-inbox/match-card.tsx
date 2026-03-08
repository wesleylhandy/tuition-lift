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
import { MatchStrengthBar } from "./match-strength-bar";
import { trackScholarship } from "@/lib/actions/track";
import { dismissScholarship } from "@/lib/actions/dismiss";

export interface MatchCardProps {
  id: string;
  /** Scholarship ID for Track/Dismiss (may differ from discovery result id) */
  scholarshipId: string;
  title: string;
  url: string;
  trustScore: number | null | undefined;
  /** Match strength 0–100; null → placeholder per contracts/match-card-extended.md */
  matchStrength?: number | null;
  coachTakeText: string | null | undefined;
  amount?: number | null;
  deadline?: string | null;
  /** Category tags (e.g. need_based, merit) per wireframe */
  categories?: string[] | null;
  /** discovery_run_id from match; passed to dismissScholarship when available (003) */
  discoveryRunId?: string | null;
  /** need_match_score from discovery result; passed to trackScholarship (US1 T018) */
  needMatchScore?: number | null;
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

/** Format category for display (e.g. need_based → Need-based) */
function formatCategoryTag(c: string): string {
  return c
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function MatchCard({
  id,
  scholarshipId,
  title,
  url,
  trustScore,
  matchStrength,
  coachTakeText,
  amount,
  deadline,
  categories,
  discoveryRunId,
  needMatchScore,
  onDismissSuccess,
  onTrackSuccess,
  isTracked = false,
}: MatchCardProps) {
  const [pending, startTransition] = useTransition();
  const amountStr = formatAmount(amount);
  const deadlineStr = formatDeadline(deadline);

  const handleTrack = () => {
    if (pending || isTracked) return;
    startTransition(async () => {
      const result = await trackScholarship(scholarshipId, needMatchScore ?? null);
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

  const hasCoachTake = coachTakeText?.trim();
  const categoryTags = (categories ?? []).filter(Boolean).slice(0, 6);

  return (
    <motion.article
      layout
      data-match-id={id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border border-border bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
      aria-label={`Scholarship: ${title}`}
    >
      <div className="flex flex-col gap-6">
        {/* Header: title row + Trust/actions row */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Link
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold text-foreground hover:text-electric-mint hover:underline focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 rounded focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2"
                aria-label={`View scholarship: ${title}`}
              >
                {title}
              </Link>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {amountStr && (
                <span
                  className="text-base font-semibold text-electric-mint tabular-nums"
                  aria-label={`Amount: ${amountStr}`}
                >
                  {amountStr}
                </span>
              )}
              {deadlineStr && (
                <span
                  className="text-xs text-muted-foreground"
                  aria-label={`Deadline: ${deadlineStr}`}
                >
                  Due {deadlineStr}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TrustShield trustScore={trustScore} />
            <div className="flex shrink-0 gap-3" role="group" aria-label="Quick actions">
              <button
                type="button"
                onClick={handleTrack}
                disabled={pending || isTracked}
                className="cursor-pointer rounded-lg px-5 py-3 text-sm font-medium text-navy bg-electric-mint/30 hover:bg-electric-mint/50 focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]"
                aria-label={isTracked ? "Already tracked" : `Track scholarship: ${title}`}
              >
                {isTracked ? "Tracked" : "Track"}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                disabled={pending}
                className="cursor-pointer rounded-lg px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]"
                aria-label={`Dismiss ${title} from feed`}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>

        {/* Match Strength */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Match strength
          </span>
          <MatchStrengthBar value={matchStrength} />
        </div>

        {/* Coach's Take — distinct section per wireframe */}
        {hasCoachTake && (
          <div className="rounded-lg bg-electric-mint/10 px-6 py-5">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Coach&apos;s take
            </span>
            <CoachesTake coachTakeText={coachTakeText} />
          </div>
        )}

        {/* Tags from categories */}
        {categoryTags.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {categoryTags.map((c) => (
              <span
                key={c}
                className="rounded-full bg-muted/40 px-4 py-2 text-sm text-muted-foreground"
              >
                {formatCategoryTag(c)}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.article>
  );
}
