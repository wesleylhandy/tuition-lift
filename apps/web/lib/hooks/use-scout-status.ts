"use client";

/**
 * useScoutStatus — Poll GET /api/scout/status/:runId every 1–2s until complete or error.
 * Per T015 [US1]. Returns step, message, result for ScoutModal state.
 */
import { useCallback, useEffect, useState } from "react";
import type { ExtractedScholarshipData, ScoutStep } from "@repo/db";

export interface ScoutStatusState {
  step: ScoutStep;
  message: string | null;
  result: ExtractedScholarshipData | null;
  error: string | null;
  loading: boolean;
}

const POLL_INTERVAL_MS = 1500;

export function useScoutStatus(runId: string | null) {
  const [state, setState] = useState<ScoutStatusState>({
    step: "searching_sources",
    message: null,
    result: null,
    error: null,
    loading: true,
  });

  const fetchStatus = useCallback(async () => {
    if (!runId) return;
    try {
      const res = await fetch(`/api/scout/status/${runId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg =
          (body as { error?: string }).error ?? `Status request failed (${res.status})`;
        setState((s) => ({ ...s, error: msg, loading: false }));
        return;
      }
      const data = (await res.json()) as {
        step: ScoutStep;
        message?: string | null;
        result?: ExtractedScholarshipData | null;
      };
      setState({
        step: data.step,
        message: data.message ?? null,
        result: data.result ?? null,
        error: null,
        loading: data.step !== "complete" && data.step !== "error",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch status";
      setState((s) => ({ ...s, error: msg, loading: false }));
    }
  }, [runId]);

  useEffect(() => {
    if (!runId) return;
    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [runId, fetchStatus]);

  return { ...state, refetch: fetchStatus };
}
