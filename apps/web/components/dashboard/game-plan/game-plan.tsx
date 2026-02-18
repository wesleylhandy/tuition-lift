"use client";

/**
 * Game Plan — Coach's Game Plan with Top 3 Tasks, Debt Lifted ring, Next Win countdown.
 * Fetches from GET /api/coach/game-plan; composes TopThreeTasks, DebtLiftedRing, NextWinCountdown.
 * Per FR-006, FR-007, FR-008; T024, T025 [US2].
 */
import { useCallback, useEffect, useState } from "react";
import { TopThreeTasks, type TopThreeTask } from "./top-three-tasks";
import { DebtLiftedRing } from "./debt-lifted-ring";
import { NextWinCountdown } from "./next-win-countdown";
import { useRealtimeApplications } from "@/lib/hooks/use-realtime-applications";

interface GamePlanData {
  top3: Top3ApiItem[];
  debtLifted?: { totalCents: number };
  nextWin?: { deadline: string | null; label: string | null };
  suggestion?: string;
}

interface Top3ApiItem {
  applicationId: string;
  scholarshipTitle: string;
  momentumScore: number;
  deadline: string | null;
  coachState: string;
  suggestion: string;
}

function toTopThreeTask(t: Top3ApiItem): TopThreeTask {
  return {
    applicationId: t.applicationId,
    scholarshipTitle: t.scholarshipTitle,
    momentumScore: t.momentumScore,
    deadline: t.deadline,
    coachState: t.coachState,
    suggestion: t.suggestion,
  };
}

export function GamePlan() {
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<GamePlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/coach/game-plan", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) setError("Sign in required");
        else setError("Failed to load game plan");
        return;
      }
      const json = (await res.json()) as GamePlanData;
      setData(json);
      setError(null);
    } catch {
      setError("Failed to load game plan");
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
    return (
      <section className="space-y-4" aria-label="Coach's Game Plan">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="h-28 w-28 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg bg-muted"
                aria-hidden
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const top3 = (data?.top3 ?? []).map(toTopThreeTask);
  const debtLifted = data?.debtLifted?.totalCents ?? 0;
  const nextWin = data?.nextWin ?? { deadline: null, label: null };

  return (
    <section
      className="space-y-4"
      aria-label="Coach's Game Plan"
      aria-busy={loading}
    >
      <h2 className="font-heading text-lg font-semibold text-navy">
        Coach&apos;s Game Plan
      </h2>
      {top3.length === 0 && !data?.suggestion ? (
        <p className="text-sm text-muted-foreground">
          Add applications or run discovery to get your game plan.
        </p>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <DebtLiftedRing totalCents={debtLifted} />
          <div className="min-w-0 flex-1 space-y-3">
            <TopThreeTasks tasks={top3} />
            <NextWinCountdown
              deadline={nextWin.deadline}
              label={nextWin.label}
            />
          </div>
        </div>
      )}
    </section>
  );
}
