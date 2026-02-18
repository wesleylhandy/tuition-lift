/**
 * Application Tracker Skeleton — mirrors tracker columns during initial load.
 * Per FR-016 (T043): structure matching Tracked, Drafting, Submitted, Won, Lost.
 */
import { Skeleton } from "@/components/ui/skeleton";

const COLUMN_COUNT = 5;

function TrackerColumnSkeleton() {
  return (
    <div
      className="flex min-w-[140px] flex-1 flex-col rounded-lg border bg-muted/30 p-3"
      aria-hidden
    >
      <Skeleton className="mb-2 h-4 w-20 bg-muted" />
      <div className="flex flex-col gap-2">
        {[1, 2].map((i) => (
          <Skeleton
            key={i}
            className="h-24 min-w-[120px] rounded-lg bg-muted"
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}

export function ApplicationTrackerSkeleton() {
  return (
    <section
      className="space-y-4"
      aria-label="Application Tracker"
      aria-busy
    >
      <Skeleton className="h-6 w-48 bg-muted" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: COLUMN_COUNT }).map((_, i) => (
          <TrackerColumnSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
