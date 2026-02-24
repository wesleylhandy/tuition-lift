/**
 * Deadline-calendar-skeleton — calendar grid + list variant.
 * @see contracts/component-shell.md
 */
import { Skeleton } from "@/components/ui/skeleton";

export function DeadlineCalendarSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading calendar" aria-busy>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 14 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" aria-hidden />
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" aria-hidden />
        ))}
      </div>
    </div>
  );
}
