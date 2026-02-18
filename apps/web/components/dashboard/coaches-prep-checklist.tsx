"use client";

/**
 * Coach's Prep Checklist — Zero-state content when Match Inbox has no matches (US5).
 * Dynamic items from profile completeness (major, state, GPA, SAI) and discovery state.
 * Per FR-015; T035–T038.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getPrepChecklistData,
  type PrepChecklistItem,
} from "@/lib/actions/get-prep-checklist";
import { CoachesPrepChecklistSkeleton } from "./skeletons/coaches-prep-checklist-skeleton";

export function CoachesPrepChecklist() {
  const [items, setItems] = useState<PrepChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPrepChecklistData()
      .then((data) => {
        if (!cancelled && data?.items) {
          setItems(data.items);
        }
        if (!cancelled) setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load checklist");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <CoachesPrepChecklistSkeleton />;
  }

  if (error) {
    return (
      <section
        className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
        aria-live="polite"
      >
        <p className="text-sm text-destructive">{error}</p>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      className="rounded-lg border border-border bg-muted/30 p-4"
      aria-label="Coach's Prep Checklist"
    >
      <h3 className="font-heading text-sm font-semibold text-navy mb-3">
        Coach&apos;s Prep Checklist
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Complete these steps to unlock more scholarship matches.
      </p>
      <ul className="space-y-3" role="list">
        {items.map((item) => (
          <li key={item.id} role="listitem">
            <Link
              href={item.href}
              className="flex min-h-[44px] items-start gap-3 rounded-md p-2 -m-2 hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2"
              aria-label={`${item.label} — take action`}
            >
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full border border-muted-foreground bg-transparent"
                aria-hidden
              />
              <span className="text-sm text-foreground">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
