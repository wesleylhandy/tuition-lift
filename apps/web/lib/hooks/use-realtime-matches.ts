"use client";

/**
 * use-realtime-matches — Subscribe to new discovery matches via Supabase Broadcast.
 *
 * Discovery results live in LangGraph checkpoint (003), not a Supabase table.
 * Orchestration publishes to Broadcast on `user:{userId}:discovery` with `new_matches` event.
 * When Broadcast is not yet implemented, falls back to polling GET /api/discovery/results.
 *
 * @see specs/006-scholarship-inbox-dashboard/contracts/realtime-channels.md §1
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createDbClient } from "@repo/db";

/** Match shape from GET /api/discovery/results and Broadcast new_matches payload */
export interface DiscoveryMatch {
  id: string;
  scholarshipId: string;
  discoveryRunId: string | null;
  title: string;
  url: string;
  trustScore: number;
  needMatchScore: number;
  trustReport?: string | null;
  coachTake?: string | null;
  verificationStatus?: string | null;
  categories?: string[];
  deadline?: string | null;
  amount?: number | null;
}

export interface UseRealtimeMatchesOptions {
  /** User ID; when null, subscription and polling are disabled */
  userId: string | null;
  /** Enable polling fallback when Broadcast unavailable. Default: true */
  enablePollingFallback?: boolean;
  /** Poll interval in ms when fallback enabled. Default: 5000 */
  pollIntervalMs?: number;
}

export interface UseRealtimeMatchesResult {
  /** New matches received via Broadcast or detected by polling */
  newMatches: DiscoveryMatch[];
  /** Clear newMatches (e.g. after parent appended and animated) */
  clearNewMatches: () => void;
  /** Whether Broadcast subscription is active (channel subscribed) */
  isBroadcastAvailable: boolean;
  /** Error from subscription or polling */
  error: Error | null;
}

const DEFAULT_POLL_INTERVAL_MS = 5_000;

/** Normalize API discoveryResult to DiscoveryMatch */
function toDiscoveryMatch(r: {
  id: string;
  scholarshipId?: string | null;
  discoveryRunId?: string | null;
  title: string;
  url: string;
  trustScore: number;
  needMatchScore: number;
  trustReport?: string | null;
  coachTake?: string | null;
  verificationStatus?: string | null;
  categories?: string[];
  deadline?: string | null;
  amount?: number | null;
}): DiscoveryMatch {
  return {
    id: r.id,
    scholarshipId: r.scholarshipId ?? r.id,
    discoveryRunId: r.discoveryRunId ?? null,
    title: r.title,
    url: r.url,
    trustScore: r.trustScore,
    needMatchScore: r.needMatchScore,
    trustReport: r.trustReport ?? null,
    coachTake: r.coachTake ?? null,
    verificationStatus: r.verificationStatus ?? null,
    categories: r.categories ?? [],
    deadline: r.deadline ?? null,
    amount: r.amount ?? null,
  };
}

export function useRealtimeMatches(
  options: UseRealtimeMatchesOptions
): UseRealtimeMatchesResult {
  const {
    userId,
    enablePollingFallback = true,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  } = options;

  const [newMatches, setNewMatches] = useState<DiscoveryMatch[]>([]);
  const [isBroadcastAvailable, setIsBroadcastAvailable] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const knownIdsRef = useRef<Set<string>>(new Set());
  const hasInitialPollRef = useRef(false);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createDbClient>["channel"]
  > | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const threadId = userId ? `user_${userId}` : null;

  const clearNewMatches = useCallback(() => {
    setNewMatches([]);
  }, []);

  const addNewMatches = useCallback((matches: DiscoveryMatch[]) => {
    if (matches.length === 0) return;
    setNewMatches((prev) => [...prev, ...matches]);
    matches.forEach((m) => knownIdsRef.current.add(m.id));
  }, []);

  useEffect(() => {
    if (!userId || !threadId) return;

    const supabase = createDbClient();

    const channelName = `user:${userId}:discovery`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        "broadcast",
        { event: "new_matches" },
        (payload: { payload?: { matches?: unknown[] }; matches?: unknown[] }) => {
            const raw = payload?.payload?.matches ?? payload?.matches ?? [];
          if (Array.isArray(raw) && raw.length > 0) {
            const matches = raw
              .filter((m): m is Record<string, unknown> => m != null)
              .map((m) =>
                toDiscoveryMatch({
                  id: String(m.id ?? ""),
                  scholarshipId:
                    typeof m.scholarshipId === "string"
                      ? m.scholarshipId
                      : typeof m.scholarship_id === "string"
                        ? m.scholarship_id
                        : String(m.id ?? ""),
                  discoveryRunId:
                    typeof m.discoveryRunId === "string"
                      ? m.discoveryRunId
                      : typeof m.discovery_run_id === "string"
                        ? m.discovery_run_id
                        : null,
                  title: String(m.title ?? ""),
                  url: String(m.url ?? ""),
                  trustScore: Number(m.trustScore ?? m.trust_score ?? 0),
                  needMatchScore: Number(
                    m.needMatchScore ?? m.need_match_score ?? 0
                  ),
                  trustReport: (m.trustReport ?? m.trust_report) as
                    | string
                    | null
                    | undefined,
                  coachTake: (m.coachTake ?? m.coach_take) as
                    | string
                    | null
                    | undefined,
                  verificationStatus: (m.verificationStatus ??
                    m.verification_status) as string | null | undefined,
                  categories: Array.isArray(m.categories) ? m.categories : [],
                  deadline: (m.deadline as string | null | undefined) ?? null,
                  amount: (m.amount as number | null | undefined) ?? null,
                })
              )
              .filter((m) => m.id);
            const unseen = matches.filter(
              (m) => !knownIdsRef.current.has(m.id)
            );
            if (unseen.length > 0) {
              addNewMatches(unseen);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsBroadcastAvailable(true);
          setError(null);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setIsBroadcastAvailable(false);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsBroadcastAvailable(false);
    };
  }, [userId, threadId, addNewMatches]);

  useEffect(() => {
    if (
      !threadId ||
      !enablePollingFallback ||
      !userId
    )
      return;

    const fetchResults = async () => {
      try {
        const res = await fetch(
          `/api/discovery/results?thread_id=${encodeURIComponent(threadId)}`,
          { credentials: "include" }
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          discoveryResults?: Array<{
            id: string;
            scholarshipId?: string | null;
            discoveryRunId?: string | null;
            title: string;
            url: string;
            trustScore: number;
            needMatchScore: number;
            trustReport?: string | null;
            coachTake?: string | null;
            verificationStatus?: string | null;
            categories?: string[];
            deadline?: string | null;
            amount?: number | null;
          }>;
        };
        const results = data.discoveryResults ?? [];
        const matches = results.map(toDiscoveryMatch);
        const unseen = matches.filter((m) => !knownIdsRef.current.has(m.id));
        matches.forEach((m) => knownIdsRef.current.add(m.id));
        if (hasInitialPollRef.current && unseen.length > 0) {
          addNewMatches(unseen);
        }
        hasInitialPollRef.current = true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    fetchResults();
    const id = setInterval(fetchResults, pollIntervalMs);
    pollIntervalRef.current = id;

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [
    threadId,
    userId,
    enablePollingFallback,
    pollIntervalMs,
    addNewMatches,
  ]);

  return {
    newMatches,
    clearNewMatches,
    isBroadcastAvailable,
    error,
  };
}
