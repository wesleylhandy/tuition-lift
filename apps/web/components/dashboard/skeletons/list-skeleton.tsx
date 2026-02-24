/**
 * Generic list-skeleton — list-like structure for SectionShell skeletonVariant="list".
 * @see contracts/component-shell.md (Today's Game Plan)
 */
import { Skeleton } from "@/components/ui/skeleton";

export function ListSkeleton() {
  return (
    <div className="space-y-2" aria-label="Loading" aria-busy>
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-12 w-full" aria-hidden />
      ))}
    </div>
  );
}
