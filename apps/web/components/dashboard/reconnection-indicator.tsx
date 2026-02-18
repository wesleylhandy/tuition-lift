"use client";

/**
 * ReconnectionIndicator — Subtle banner when Supabase Realtime disconnects.
 * Per T045: data remains viewable; show "Reconnecting..." until restored.
 */
import { useRealtimeConnection } from "@/lib/hooks/use-realtime-connection";

export function ReconnectionIndicator() {
  const status = useRealtimeConnection();

  if (status !== "reconnecting") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Reconnecting to live updates"
      className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200"
    >
      <span
        className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500"
        aria-hidden
      />
      Reconnecting…
    </div>
  );
}
