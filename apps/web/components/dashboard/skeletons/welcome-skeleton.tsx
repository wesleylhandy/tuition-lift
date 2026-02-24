/**
 * Welcome-skeleton — text-line variant for welcome area.
 * @see contracts/component-shell.md
 */
import { Skeleton } from "@/components/ui/skeleton";

export function WelcomeSkeleton() {
  return (
    <div className="space-y-2" aria-label="Loading welcome" aria-busy>
      <Skeleton className="h-6 w-48" aria-hidden />
      <Skeleton className="h-5 w-full" aria-hidden />
      <Skeleton className="h-5 w-4/5" aria-hidden />
    </div>
  );
}
