"use client";

/**
 * Live Pulse — Active Scouting indicator and domain ticker per FR-002.
 * Shows when Advisor is scouting; subscribes to Broadcast or polls status.
 */
import { useLivePulse } from "@/lib/hooks/use-live-pulse";

export interface LivePulseProps {
  userId: string | null;
  className?: string;
}

export function LivePulse({ userId, className = "" }: LivePulseProps) {
  const { isScouting, domains } = useLivePulse({
    userId,
    enablePollingFallback: true,
  });

  if (!isScouting) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-lg border border-electric-mint/30 bg-electric-mint/10 px-3 py-2 ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Active Scouting"
    >
      <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-navy)]">
        <span
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-electric-mint"
          aria-hidden
        />
        Active Scouting
      </span>
      {domains.length > 0 && (
        <span className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          {domains.map((d: string) => (
            <span
              key={d}
              className="rounded bg-white/60 px-1.5 py-0.5 font-mono"
            >
              {d}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
