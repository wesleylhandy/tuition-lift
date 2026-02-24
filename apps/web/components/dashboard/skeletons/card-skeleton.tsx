/**
 * Generic card-skeleton — card-like structure for SectionShell skeletonVariant="card".
 * @see contracts/component-shell.md (Discovery Feed)
 */
import { Skeleton } from "@/components/ui/skeleton";

export function CardSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading" aria-busy>
      <Skeleton className="h-32 w-full rounded-lg" aria-hidden />
      <Skeleton className="h-4 w-3/4" aria-hidden />
      <Skeleton className="h-3 w-1/2" aria-hidden />
    </div>
  );
}
