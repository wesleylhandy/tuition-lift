/**
 * Game Plan Skeleton — mirrors Coach's Game Plan layout during initial load.
 * Per FR-016 (T043): structure matching DebtLiftedRing, TopThreeTasks, NextWinCountdown.
 */
import { Skeleton } from "@/components/ui/skeleton";

export function GamePlanSkeleton() {
  return (
    <section className="space-y-4" aria-label="Coach's Game Plan" aria-busy>
      <Skeleton className="h-6 w-40 bg-muted" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-28 w-28 rounded-full bg-muted" />
          <Skeleton className="h-5 w-16 bg-muted" />
          <Skeleton className="h-3 w-20 bg-muted" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border bg-card p-3 shadow-sm"
              aria-hidden
            >
              <div className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full bg-muted" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-full bg-muted" />
                  <Skeleton className="h-3 w-[80%] bg-muted" />
                  <Skeleton className="h-3 w-24 bg-muted" />
                </div>
              </div>
            </div>
          ))}
          <div className="rounded-lg border bg-card p-3" aria-hidden>
            <Skeleton className="h-3 w-20 bg-muted" />
            <Skeleton className="mt-1 h-4 w-full bg-muted" />
            <Skeleton className="mt-1 h-3 w-32 bg-muted" />
          </div>
        </div>
      </div>
    </section>
  );
}
