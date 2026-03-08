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
import { GamePlanSkeleton } from "../skeletons/game-plan-skeleton";

interface AlternativePathItem {
  institutionType: string;
  label: string;
  sampleName: string;
  estimatedNetPrice: number | null;
}

interface AlternativePathComparison {
  disclaimer: string;
  items: AlternativePathItem[];
}

interface GamePlanData {
  top3: Top3ApiItem[];
  debtLifted?: { totalCents: number };
  nextWin?: { deadline: string | null; label: string | null };
  suggestion?: string;
  alternativePathComparison?: AlternativePathComparison;
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

export interface GamePlanProps {
  /** When false, hide DebtLiftedRing (header owns it). Default true. */
  showDebtLifted?: boolean;
}

export function GamePlan({ showDebtLifted = true }: GamePlanProps) {
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
    return <GamePlanSkeleton />;
  }

  const top3 = (data?.top3 ?? []).map(toTopThreeTask);
  const debtLifted = data?.debtLifted?.totalCents ?? 0;
  const nextWin = data?.nextWin ?? { deadline: null, label: null };
  const altPath = data?.alternativePathComparison;

  function formatCurrency(n: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  }

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
          {showDebtLifted && (
            <DebtLiftedRing totalCents={debtLifted} />
          )}
          <div className="min-w-0 flex-1 space-y-3">
            <TopThreeTasks tasks={top3} />
            <NextWinCountdown
              deadline={nextWin.deadline}
              label={nextWin.label}
            />
          </div>
        </div>
      )}
      {altPath && altPath.items.length >= 2 && (
        <div
          className="rounded-lg border border-border bg-muted/30 p-4"
          aria-label="Alternative Path comparison"
        >
          <h3 className="font-medium text-foreground">
            Alternative Path Comparison
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {altPath.disclaimer}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {altPath.items.map((item) => (
              <div
                key={item.institutionType}
                className="rounded border border-border bg-background px-3 py-2"
              >
                <span className="font-medium">{item.label}</span>
                <p className="text-sm text-muted-foreground">
                  e.g. {item.sampleName}
                </p>
                {item.estimatedNetPrice != null && (
                  <p className="text-sm">~{formatCurrency(item.estimatedNetPrice)}/yr</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
