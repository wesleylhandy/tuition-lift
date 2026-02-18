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
import {
  type DiscoveryMatch,
  useRealtimeMatches,
} from "@/lib/hooks/use-realtime-matches";
import { getDismissedScholarshipIds } from "@/lib/actions/get-dismissed-ids";

function sortMatches(matches: DiscoveryMatch[]): DiscoveryMatch[] {
  return [...matches].sort((a, b) => {
    const trust = (b.trustScore ?? 0) - (a.trustScore ?? 0);
    if (trust !== 0) return trust;
    return (b.needMatchScore ?? 0) - (a.needMatchScore ?? 0);
  });
}

export function MatchInbox() {
  const [userId, setUserId] = useState<string | null>(null);
  const [matches, setMatches] = useState<DiscoveryMatch[]>([]);
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
      const { userId: uid } = (await res.json()) as { userId: string };
      setUserId(uid);
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
      const dismissedIds = await getDismissedScholarshipIds(runId);
      const dismissedSet = new Set(dismissedIds);
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

  if (loading && matches.length === 0) {
    return (
      <section className="space-y-4" aria-label="Match Inbox">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-muted"
              aria-hidden
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className="space-y-4"
      aria-label="Match Inbox"
      aria-busy={loading}
    >
      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold text-navy">
          Match Inbox
        </h2>
        <LivePulse userId={userId} />
      </div>
      <ul className="grid gap-3" role="list">
        <AnimatePresence mode="popLayout">
          {matches.map((m) => (
            <li key={m.id} role="listitem">
              <MatchCard
                id={m.id}
                title={m.title}
                url={m.url}
                trustScore={m.trustScore}
                coachTakeText={coachTakeFallback(m)}
                amount={m.amount}
                deadline={m.deadline}
              />
            </li>
          ))}
        </AnimatePresence>
      </ul>
      {matches.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">
          No matches yet. Run discovery to find scholarships.
        </p>
      )}
    </section>
  );
}
