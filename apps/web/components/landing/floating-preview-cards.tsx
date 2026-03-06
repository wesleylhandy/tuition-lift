"use client";

/**
 * FloatingPreviewCards — Static exemplar cards for hero area (right column).
 * Two cards: scholarship match, priorities/tasks. Subtle floating motion; respects prefers-reduced-motion.
 * Per FR-009: at least two floating preview cards with static placeholder content.
 */

export function FloatingPreviewCards() {
  return (
    <div
      className="relative flex w-full max-w-sm flex-col items-center justify-center gap-6 sm:max-w-md sm:flex-row sm:gap-8"
      aria-hidden
    >
      {/* Scholarship match exemplar — top/right on row layout */}
      <div className="motion-safe:animate-float-subtle w-[180px] shrink-0 rounded-lg border border-electric-mint/30 bg-navy/90 px-3 py-2.5 shadow-lg backdrop-blur-sm sm:w-[200px] sm:self-end">
        <p className="text-xs font-medium text-electric-mint">Gates Scholarship</p>
        <p className="mt-1 text-[10px] text-off-white/80">94% match</p>
        <div className="mt-2 h-1 w-full rounded-full bg-navy">
          <div className="h-full w-[94%] rounded-full bg-electric-mint" />
        </div>
      </div>

      {/* Priorities / tasks exemplar — bottom/left on row layout */}
      <div className="motion-safe:animate-float-subtle-delay w-[160px] shrink-0 self-start rounded-lg border border-electric-mint/30 bg-navy/90 px-3 py-2.5 shadow-lg backdrop-blur-sm sm:w-[180px]">
        <p className="text-xs font-medium text-electric-mint">Today&apos;s Priorities</p>
        <ul className="mt-1.5 space-y-1 text-[10px] text-off-white/80">
          <li className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-electric-mint" aria-hidden />
            Complete profile
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-electric-mint" aria-hidden />
            Review matches
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-slate" aria-hidden />
            Apply to top pick
          </li>
        </ul>
      </div>
    </div>
  );
}
