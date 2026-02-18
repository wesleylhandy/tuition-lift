"use client";

/**
 * useRealtimeConnection — Monitor Supabase Realtime connection for reconnection indicator.
 * Per T045: subtle "Reconnecting..." when disconnected; data remains viewable.
 * @see contracts/realtime-channels.md §4
 */
import { createDbClient } from "@repo/db";
import { useEffect, useState } from "react";

export type RealtimeConnectionStatus = "connected" | "reconnecting";

export function useRealtimeConnection(): RealtimeConnectionStatus {
  const [status, setStatus] = useState<RealtimeConnectionStatus>("connected");

  useEffect(() => {
    const supabase = createDbClient();
    const channel = supabase
      .channel("tuition-lift:connection-monitor")
      .subscribe((subscribeStatus) => {
        if (subscribeStatus === "SUBSCRIBED") {
          setStatus("connected");
        } else if (
          subscribeStatus === "CHANNEL_ERROR" ||
          subscribeStatus === "TIMED_OUT" ||
          subscribeStatus === "CLOSED"
        ) {
          setStatus("reconnecting");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return status;
}
