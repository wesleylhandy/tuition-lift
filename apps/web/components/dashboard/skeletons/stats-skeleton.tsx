/**
 * Stats-skeleton — four-card row variant for stats row.
 * @see contracts/component-shell.md
 */
import { Skeleton } from "@/components/ui/skeleton";

export function StatsSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-4"
      aria-label="Loading stats"
      aria-busy
    >
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" aria-hidden />
      ))}
    </div>
  );
}
