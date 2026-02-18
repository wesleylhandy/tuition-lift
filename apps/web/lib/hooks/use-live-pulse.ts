"use client";

/**
 * useLivePulse — Active Scouting status for Match Inbox Live Pulse.
 * Broadcast on user:{userId}:discovery with scouting event, or fallback to polling
 * GET /api/discovery/status (lastActiveNode=Advisor_Search).
 *
 * @see specs/006-scholarship-inbox-dashboard/contracts/realtime-channels.md §3
 */
import { useCallback, useEffect, useState } from "react";
import { createDbClient } from "@repo/db";

export interface LivePulseState {
  /** True when Advisor is actively scouting */
  isScouting: boolean;
  /** Domains being vetted (when Broadcast provides them) */
  domains: string[];
}

const DEFAULT_POLL_INTERVAL_MS = 3_000;

export interface UseLivePulseOptions {
  userId: string | null;
  /** Poll status when Broadcast unavailable */
  enablePollingFallback?: boolean;
  pollIntervalMs?: number;
}

export function useLivePulse(
  options: UseLivePulseOptions
): LivePulseState {
  const {
    userId,
    enablePollingFallback = true,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  } = options;

  const [isScouting, setIsScouting] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);

  const setScoutingFromBroadcast = useCallback(
    (payload: { status?: string; domains?: string[] }) => {
      const active = payload?.status === "active";
      setIsScouting(active);
      setDomains(Array.isArray(payload?.domains) ? payload.domains : []);
    },
    []
  );

  useEffect(() => {
    if (!userId) return;

    const supabase = createDbClient();
    const channelName = `user:${userId}:discovery`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        "broadcast",
        { event: "scouting" },
        (payload: { payload?: { status?: string; domains?: string[] } }) => {
          const p = payload?.payload ?? payload;
          setScoutingFromBroadcast(
            (p as { status?: string; domains?: string[] }) ?? {}
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, setScoutingFromBroadcast]);

  useEffect(() => {
    if (!userId || !enablePollingFallback) return;

    const threadId = `user_${userId}`;
    const fetchStatus = async () => {
      try {
        const res = await fetch(
          `/api/discovery/status?thread_id=${encodeURIComponent(threadId)}`,
          { credentials: "include" }
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          status?: string;
          lastActiveNode?: string | null;
        };
        const running = data.status === "running";
        const advisorSearch = data.lastActiveNode === "Advisor_Search";
        const scouting = running && advisorSearch;
        setIsScouting(scouting);
        if (!scouting) setDomains([]);
      } catch {
        // Ignore
      }
    };

    fetchStatus();
    const id = setInterval(fetchStatus, pollIntervalMs);
    return () => clearInterval(id);
  }, [userId, enablePollingFallback, pollIntervalMs]);

  return { isScouting, domains };
}
