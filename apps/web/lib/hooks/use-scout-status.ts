"use client";

/**
 * useScoutStatus — Poll GET /api/scout/status/:runId every 1–2s until complete, error, or timeout.
 * Per T015 [US1], T020 [US4]: cancel after ~30s, timeout at ~60s, AbortController for cancel.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ExtractedScholarshipData, ScoutStep } from "@repo/db";

export interface ScoutStatusState {
  step: ScoutStep;
  message: string | null;
  result: ExtractedScholarshipData | null;
  error: string | null;
  loading: boolean;
}

export interface UseScoutStatusOptions {
  runId: string | null;
  /** Show cancel button after this many ms. Default 30000. */
  cancelTimeoutMs?: number;
  /** Mark timedOut and stop polling after this many ms. Default 60000. */
  failTimeoutMs?: number;
  /** Called when timedOut. */
  onTimeout?: () => void;
}

const POLL_INTERVAL_MS = 1500;
const DEFAULT_CANCEL_TIMEOUT_MS = 30000;
const DEFAULT_FAIL_TIMEOUT_MS = 60000;

export function useScoutStatus({
  runId,
  cancelTimeoutMs = DEFAULT_CANCEL_TIMEOUT_MS,
  failTimeoutMs = DEFAULT_FAIL_TIMEOUT_MS,
  onTimeout,
}: UseScoutStatusOptions) {
  const [state, setState] = useState<ScoutStatusState>({
    step: "searching_sources",
    message: null,
    result: null,
    error: null,
    loading: true,
  });
  const [canCancel, setCanCancel] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const elapsedRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const fetchStatus = useCallback(
    async (signal?: AbortSignal) => {
      if (!runId) return;
      try {
        const res = await fetch(`/api/scout/status/${runId}`, {
          credentials: "include",
          signal: signal ?? undefined,
        });
        if (signal?.aborted) return;
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg =
            (body as { error?: string }).error ??
            `Status request failed (${res.status})`;
          setState((s) => ({ ...s, error: msg, loading: false }));
          return;
        }
        const data = (await res.json()) as {
          step: ScoutStep;
          message?: string | null;
          result?: ExtractedScholarshipData | null;
        };
        if (signal?.aborted) return;
        setState({
          step: data.step,
          message: data.message ?? null,
          result: data.result ?? null,
          error: null,
          loading: data.step !== "complete" && data.step !== "error",
        });
      } catch (err) {
        if (
          signal?.aborted ||
          (err instanceof Error && err.name === "AbortError")
        )
          return;
        const msg = err instanceof Error ? err.message : "Failed to fetch status";
        setState((s) => ({ ...s, error: msg, loading: false }));
      }
    },
    [runId]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!runId) return;
    elapsedRef.current = 0;
    startTimeRef.current = Date.now();
    setCanCancel(false);
    setTimedOut(false);
    abortRef.current = new AbortController();
    const controller = abortRef.current;

    const tick = () => {
      elapsedRef.current = Date.now() - startTimeRef.current;
      if (elapsedRef.current >= failTimeoutMs) {
        setTimedOut(true);
        setState((s) => ({ ...s, loading: false }));
        onTimeoutRef.current?.();
        return true;
      }
      if (elapsedRef.current >= cancelTimeoutMs) {
        setCanCancel(true);
      }
      return false;
    };

    fetchStatus(controller.signal);
    const interval = setInterval(() => {
      if (tick()) {
        clearInterval(interval);
        return;
      }
      if (!controller.signal.aborted) {
        fetchStatus(controller.signal);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [runId, cancelTimeoutMs, failTimeoutMs, fetchStatus]);

  return {
    ...state,
    canCancel,
    timedOut,
    cancel,
    refetch: () => fetchStatus(),
  };
}
