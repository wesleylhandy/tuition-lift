"use client";

/**
 * Next Win — countdown to nearest deadline or next actionable milestone.
 * Per FR-008; T023 [US2].
 */
export interface NextWinCountdownProps {
  /** ISO date string (YYYY-MM-DD) or null for milestone-only */
  deadline: string | null;
  /** Application/scholarship title for context */
  label: string | null;
  className?: string;
}

function getCountdown(deadline: string | null): {
  days: number | null;
  text: string;
} {
  if (!deadline) return { days: null, text: "" };
  try {
    const due = new Date(deadline);
    due.setHours(23, 59, 59, 999);
    const now = new Date();
    const ms = due.getTime() - now.getTime();
    const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
    if (days < 0) return { days, text: "Past deadline" };
    if (days === 0) return { days: 0, text: "Due today" };
    if (days === 1) return { days: 1, text: "Tomorrow" };
    if (days <= 7) return { days, text: `${days} days` };
    if (days <= 30) return { days, text: `${days} days` };
    return { days, text: `${days} days` };
  } catch {
    return { days: null, text: "" };
  }
}

export function NextWinCountdown({
  deadline,
  label,
  className = "",
}: NextWinCountdownProps) {
  const { days, text } = getCountdown(deadline);

  if (!label && !deadline) {
    return (
      <p className={`text-sm text-muted-foreground ${className}`}>
        Add applications to see your next win
      </p>
    );
  }

  const urgency =
    days != null && days <= 3 ? "text-destructive font-semibold" : "text-foreground";
  const displayLabel = label ?? "Next deadline";

  return (
    <div className={`rounded-lg border bg-card p-3 ${className}`}>
      <p className="text-xs text-muted-foreground">Next win</p>
      <p className="mt-0.5 font-medium text-foreground">{displayLabel}</p>
      {deadline && (
        <p className={`mt-1 text-sm ${urgency}`}>
          {text}
          {text && " — "}
          {new Date(deadline).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}
