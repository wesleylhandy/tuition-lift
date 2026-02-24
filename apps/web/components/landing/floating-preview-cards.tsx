"use client";

/**
 * FloatingPreviewCards — Static exemplar cards for hero area.
 * Two cards: scholarship match, priorities/tasks. Subtle motion; respects prefers-reduced-motion.
 * Per FR-009: at least two floating preview cards with static placeholder content.
 */

export function FloatingPreviewCards() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Scholarship match exemplar */}
      <div
        className="animate-float-subtle absolute right-[5%] top-[15%] w-[180px] rounded-lg border border-electric-mint/30 bg-navy/90 px-3 py-2.5 shadow-lg backdrop-blur-sm sm:right-[12%] sm:top-[12%] sm:w-[200px] md:right-[18%]"
      >
        <p className="text-xs font-medium text-electric-mint">Gates Scholarship</p>
        <p className="mt-1 text-[10px] text-off-white/80">94% match</p>
        <div className="mt-2 h-1 w-full rounded-full bg-navy">
          <div
            className="h-full rounded-full bg-electric-mint"
            style={{ width: "94%" }}
          />
        </div>
      </div>

      {/* Priorities / tasks exemplar */}
      <div
        className="animate-float-subtle absolute bottom-[25%] left-[5%] w-[160px] rounded-lg border border-electric-mint/30 bg-navy/90 px-3 py-2.5 shadow-lg backdrop-blur-sm sm:left-[10%] sm:bottom-[20%] sm:w-[180px] md:left-[15%]"
        style={{ animationDelay: "1.5s" }}
      >
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
