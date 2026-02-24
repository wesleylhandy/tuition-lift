"use client";

/**
 * Application Tracker — lifecycle view with columns for Tracked, Drafting,
 * Submitted, Won, Lost. Subscribes to applications via useRealtimeApplications.
 *
 * Per T028, T029, T030 [US3]: Application Tracker Lifecycle View.
 * DB status (draft, submitted, awarded, rejected, withdrawn) mapped to display
 * buckets per data-model.md lifecycle mapping.
 * T012: Scout CTA — Add Scholarship button opens ScoutModal.
 */
import { useCallback, useEffect, useState } from "react";
import { TrackerColumn } from "./tracker-column";
import { ApplicationCard } from "./application-card";
import { ScoutModal } from "@/components/dashboard/scout/scout-modal";
import { useRealtimeApplications } from "@/lib/hooks/use-realtime-applications";
import { ApplicationTrackerSkeleton } from "../skeletons/application-tracker-skeleton";
import type {
  ApplicationsResponse,
  TrackerApplication,
  DisplayBucket,
} from "./types";

const COLUMN_ORDER: DisplayBucket[] = [
  "Tracked",
  "Drafting",
  "Submitted",
  "Won",
  "Lost",
];

function renderColumn(
  title: string,
  items: TrackerApplication[],
  ariaLabel?: string
) {
  return (
    <TrackerColumn key={title} title={title} ariaLabel={ariaLabel}>
      {items.map((app) => (
        <ApplicationCard
          key={app.applicationId}
          applicationId={app.applicationId}
          scholarshipTitle={app.scholarshipTitle}
          scholarshipUrl={app.scholarshipUrl}
          status={app.status}
          deadline={app.deadline}
          amount={app.amount}
          coachState={app.coachState}
          showVerifySubmission={app.status === "draft"}
        />
      ))}
    </TrackerColumn>
  );
}

export function ApplicationTracker() {
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<ApplicationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoutModalOpen, setScoutModalOpen] = useState(false);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/coach/applications", {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) setError("Sign in required");
        else setError("Failed to load applications");
        return;
      }
      const json = (await res.json()) as ApplicationsResponse;
      setData(json);
      setError(null);
    } catch {
      setError("Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const meRes = await fetch("/api/me", { credentials: "include" });
      if (!meRes.ok) {
        setLoading(false);
        setError("Sign in required");
        return;
      }
      const { userId: uid } = (await meRes.json()) as { userId: string };
      setUserId(uid);
    };
    load();
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    refetch();
  }, [userId, refetch]);

  useRealtimeApplications({
    userId,
    onInsert: refetch,
    onUpdate: refetch,
  });

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

  if (loading && !data) {
    return <ApplicationTrackerSkeleton />;
  }

  const buckets =
    data?.buckets ?? ({} as Record<DisplayBucket, TrackerApplication[]>);
  const hasOutcomes =
    (buckets.Won?.length ?? 0) > 0 || (buckets.Lost?.length ?? 0) > 0;

  const handleScoutSuccess = useCallback(
    (_scholarshipId: string, _applicationId: string) => {
      setScoutModalOpen(false);
      refetch();
    },
    [refetch]
  );

  return (
    <section
      className="space-y-4"
      aria-label="Application Tracker"
      aria-busy={loading}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold text-navy">
          Application Tracker
        </h2>
        <button
          type="button"
          onClick={() => setScoutModalOpen(true)}
          className="min-h-[44px] shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-navy bg-electric-mint hover:bg-electric-mint/90 focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Add scholarship via URL, name, or document"
        >
          Add Scholarship
        </button>
      </div>
      <div className="flex min-w-0 gap-3 overflow-x-auto pb-2">
        {COLUMN_ORDER.map((bucket) => {
          const items = buckets[bucket] ?? [];
          const title =
            bucket === "Won"
              ? "Won"
              : bucket === "Lost"
                ? "Lost"
                : bucket;
          return renderColumn(
            title,
            items,
            `${title} applications`
          );
        })}
      </div>
      {!hasOutcomes &&
        COLUMN_ORDER.every((b) => (buckets[b]?.length ?? 0) === 0) && (
        <p className="text-sm text-muted-foreground">
          Track scholarships from your Match Inbox or add one with the button
          above.
        </p>
      )}
      <ScoutModal
        open={scoutModalOpen}
        onOpenChange={setScoutModalOpen}
        onSuccess={handleScoutSuccess}
      />
    </section>
  );
}
