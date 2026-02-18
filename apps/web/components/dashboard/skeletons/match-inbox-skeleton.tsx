/**
 * Match Inbox Skeleton — mirrors Match Inbox layout during initial load.
 * Per FR-016 (T043): skeleton/placeholder with structure matching final layout.
 */
import { Skeleton } from "@/components/ui/skeleton";

function MatchCardSkeleton() {
  return (
    <div
      className="rounded-lg border bg-card p-4 shadow-sm"
      role="presentation"
      aria-hidden
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-6 w-16 rounded-full bg-muted" />
          <div className="flex shrink-0 gap-1">
            <Skeleton className="h-9 w-16 rounded bg-muted" />
            <Skeleton className="h-9 w-16 rounded bg-muted" />
          </div>
        </div>
        <Skeleton className="h-4 w-[70%] bg-muted" />
        <Skeleton className="h-3 w-full bg-muted" />
        <Skeleton className="h-3 w-2/3 bg-muted" />
        <div className="flex gap-3">
          <Skeleton className="h-3 w-12 bg-muted" />
          <Skeleton className="h-3 w-20 bg-muted" />
        </div>
      </div>
    </div>
  );
}

export function MatchInboxSkeleton() {
  return (
    <section className="space-y-4" aria-label="Match Inbox" aria-busy>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-32 bg-muted" />
      </div>
      <ul className="grid gap-3" role="list">
        {[1, 2, 3].map((i) => (
          <li key={i} role="listitem">
            <MatchCardSkeleton />
          </li>
        ))}
      </ul>
    </section>
  );
}
