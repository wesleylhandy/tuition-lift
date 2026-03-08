"use client";

/**
 * Match Inbox — prioritized feed of Advisor discoveries with Live Pulse, Trust Shield, Coach's Take.
 * Fetches from GET /api/discovery/results, filters dismissed, subscribes to new matches via use-realtime-matches.
 * Per FR-001, FR-002, FR-003, FR-004, FR-005; T018–T020.
 */
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { MatchCard } from "./match-card";
import { LivePulse } from "./live-pulse";
import { MeritFilterToggle } from "../merit-filter-toggle";
import { CoachesPrepChecklist } from "../coaches-prep-checklist";
import { MatchInboxSkeleton } from "../skeletons/match-inbox-skeleton";
import {
  type DiscoveryMatch,
  useRealtimeMatches,
} from "@/lib/hooks/use-realtime-matches";
import { getDismissedScholarshipIds } from "@/lib/actions/get-dismissed-ids";
import { getTrackedScholarshipIds } from "@/lib/actions/get-tracked-scholarship-ids";

export interface MatchInboxProps {
  /** Card variant: hides internal header (title, MeritFilterToggle, LivePulse). */
  variant?: "standalone" | "card";
  /** Called when match count is known; for status pill. */
  onMatchCountReady?: (count: number) => void;
}

function sortMatches(matches: DiscoveryMatch[]): DiscoveryMatch[] {
  return [...matches].sort((a, b) => {
    const trust = (b.trustScore ?? 0) - (a.trustScore ?? 0);
    if (trust !== 0) return trust;
    return (b.needMatchScore ?? 0) - (a.needMatchScore ?? 0);
  });
}

export function MatchInbox(props: MatchInboxProps = {}) {
  const { variant = "standalone", onMatchCountReady } = props;
  const [userId, setUserId] = useState<string | null>(null);
  const [awardYear, setAwardYear] = useState<number | null | undefined>(undefined);
  const [hasApplicationsForOtherYear, setHasApplicationsForOtherYear] =
    useState(false);
  const [matches, setMatches] = useState<DiscoveryMatch[]>([]);
  const [trackedScholarshipIds, setTrackedScholarshipIds] = useState<Set<string>>(new Set());
  const [, setDiscoveryRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { newMatches, clearNewMatches } = useRealtimeMatches({
    userId,
    enablePollingFallback: true,
  });

  const fetchContext = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) setError("Sign in required");
        else setError("Failed to load");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as {
        userId: string;
        awardYear?: number | null;
        hasApplicationsForOtherYear?: boolean;
      };
      setUserId(data.userId);
      setAwardYear(data.awardYear ?? null);
      setHasApplicationsForOtherYear(data.hasApplicationsForOtherYear ?? false);
      setError(null);
    } catch {
      setError("Failed to load");
      setLoading(false);
    }
  }, []);

  const fetchMatches = useCallback(async () => {
    if (!userId) return;
    const threadId = `user_${userId}`;
    try {
      const resultsRes = await fetch(
        `/api/discovery/results?thread_id=${encodeURIComponent(threadId)}`,
        { credentials: "include" }
      );
      if (!resultsRes.ok) return;
      const data = (await resultsRes.json()) as {
        discoveryRunId?: string | null;
        discoveryResults?: Array<{
          id: string;
          scholarshipId?: string;
          discoveryRunId?: string | null;
          title: string;
          url: string;
          trustScore: number;
          needMatchScore: number;
          trustReport?: string | null;
          coachTake?: string | null;
          deadline?: string | null;
          amount?: number | null;
        }>;
      };
      const runId = data.discoveryRunId ?? null;
      setDiscoveryRunId(runId);
      const [dismissedIds, trackedIds] = await Promise.all([
        getDismissedScholarshipIds(runId),
        getTrackedScholarshipIds(),
      ]);
      const dismissedSet = new Set(dismissedIds);
      setTrackedScholarshipIds(new Set(trackedIds));
      const raw = (data.discoveryResults ?? []).map((r) => ({
        id: r.id,
        scholarshipId: r.scholarshipId ?? r.id,
        discoveryRunId: r.discoveryRunId ?? runId,
        title: r.title,
        url: r.url,
        trustScore: r.trustScore,
        needMatchScore: r.needMatchScore,
        trustReport: r.trustReport ?? null,
        coachTake: r.coachTake ?? null,
        verificationStatus: null,
        categories: [],
        deadline: r.deadline ?? null,
        amount: r.amount ?? null,
      }));
      const filtered = raw.filter((m) => !dismissedSet.has(m.scholarshipId));
      setMatches(sortMatches(filtered));
      onMatchCountReady?.(filtered.length);
    } catch {
      setError("Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetchMatches();
  }, [userId, fetchMatches]);

  useEffect(() => {
    if (newMatches.length === 0) return;
    setMatches((prev) => sortMatches([...prev, ...newMatches]));
    clearNewMatches();
  }, [newMatches, clearNewMatches]);

  const coachTakeFallback = useCallback((m: DiscoveryMatch) => {
    return m.coachTake ?? m.trustReport ?? null;
  }, []);

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

  // T023: Surface prompt when profile has no award_year — block discovery and tracking
  if (awardYear === null && !loading) {
    return (
      <section
        className="rounded-lg border border-amber-200 bg-amber-50 p-4"
        aria-live="polite"
      >
        <p className="text-sm text-amber-900">
          Select your target award year to discover and track scholarships.{" "}
          <a
            href="/onboard"
            className="font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 rounded"
          >
            Complete onboarding
          </a>{" "}
          to get started.
        </p>
      </section>
    );
  }

  if (loading && matches.length === 0) {
    return <MatchInboxSkeleton />;
  }

  const isCard = variant === "card";

  return (
    <section
      className="space-y-6"
      aria-label={isCard ? undefined : "Match Inbox"}
      aria-busy={loading}
    >
      {/* T048: Surface when user changed award_year and has existing applications for another year */}
      {hasApplicationsForOtherYear && (
        <div
          className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
          role="status"
        >
          You have applications for a different award year. New scholarships
          you track will use your current year. Existing applications are
          unchanged.
        </div>
      )}
      {!isCard && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-lg font-semibold text-navy">
              Match Inbox
            </h2>
            <MeritFilterToggle />
          </div>
          <LivePulse userId={userId} />
        </div>
      )}
      <ul className="grid gap-5" role="list">
        <AnimatePresence mode="popLayout">
          {matches.map((m) => (
            <li key={m.id} role="listitem">
              <MatchCard
                id={m.id}
                scholarshipId={m.scholarshipId}
                title={m.title}
                url={m.url}
                trustScore={m.trustScore}
                matchStrength={m.needMatchScore ?? null}
                coachTakeText={coachTakeFallback(m)}
                amount={m.amount}
                deadline={m.deadline}
                categories={m.categories}
                discoveryRunId={m.discoveryRunId}
                needMatchScore={m.needMatchScore}
                isTracked={trackedScholarshipIds.has(m.scholarshipId)}
                onTrackSuccess={() => {
                  setTrackedScholarshipIds((prev) =>
                    new Set(prev).add(m.scholarshipId)
                  );
                }}
                onDismissSuccess={() => {
                  setMatches((prev) => prev.filter((x) => x.id !== m.id));
                }}
              />
            </li>
          ))}
        </AnimatePresence>
      </ul>
      {matches.length === 0 && !loading && (
        <CoachesPrepChecklist />
      )}
    </section>
  );
}
