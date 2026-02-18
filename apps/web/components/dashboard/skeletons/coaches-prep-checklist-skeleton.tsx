/**
 * Coach's Prep Checklist Skeleton — mirrors checklist layout during load.
 * Per FR-016 (T043): structure matching checklist items list.
 */
import { Skeleton } from "@/components/ui/skeleton";

export function CoachesPrepChecklistSkeleton() {
  return (
    <section
      className="rounded-lg border border-border bg-muted/30 p-4"
      aria-label="Coach's Prep Checklist"
      aria-busy
    >
      <Skeleton className="mb-3 h-4 w-40 bg-muted" />
      <ul className="space-y-2" role="list">
        {[1, 2, 3].map((i) => (
          <li key={i} role="listitem">
            <Skeleton className="h-8 w-full rounded bg-muted" aria-hidden />
          </li>
        ))}
      </ul>
    </section>
  );
}
