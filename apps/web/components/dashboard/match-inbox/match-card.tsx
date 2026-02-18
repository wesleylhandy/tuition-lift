"use client";

/**
 * Match Card — scholarship card with Trust Shield, Coach's Take, title, amount, deadline.
 * Wrapped in motion.div for AnimatePresence entrance animations (T020).
 */
import { motion } from "framer-motion";
import Link from "next/link";
import { TrustShield } from "./trust-shield";
import { CoachesTake } from "./coaches-take";

export interface MatchCardProps {
  id: string;
  title: string;
  url: string;
  trustScore: number | null | undefined;
  coachTakeText: string | null | undefined;
  amount?: number | null;
  deadline?: string | null;
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
  title,
  url,
  trustScore,
  coachTakeText,
  amount,
  deadline,
}: MatchCardProps) {
  const amountStr = formatAmount(amount);
  const deadlineStr = formatDeadline(deadline);

  return (
    <motion.div
      layout
      data-match-id={id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <TrustShield trustScore={trustScore} />
        </div>
        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground hover:text-electric-mint hover:underline focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 rounded"
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
    </motion.div>
  );
}
