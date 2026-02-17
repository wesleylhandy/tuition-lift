"use client";

/**
 * Discovery page — trigger discovery, poll status, show results.
 * FR-013b: Status message + polling; notification when complete.
 * @see contracts/api-discovery.md
 */
import { useState, useEffect, useCallback } from "react";

const POLL_INTERVAL_MS = 3000;

type Status = "idle" | "running" | "completed" | "failed" | "error";

type DiscoveryResult = {
  id: string;
  discoveryRunId: string;
  title: string;
  url: string;
  trustScore: number;
  needMatchScore: number;
};

type ActiveMilestone = {
  id: string;
  scholarshipId: string;
  title: string;
  priority: number;
  status: string;
};

export default function DiscoveryPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [discoveryRunId, setDiscoveryRunId] = useState<string | null>(null);
  const [results, setResults] = useState<DiscoveryResult[]>([]);
  const [milestones, setMilestones] = useState<ActiveMilestone[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);

  const fetchStatus = useCallback(async (tid: string) => {
    const res = await fetch(`/api/discovery/status?thread_id=${encodeURIComponent(tid)}`);
    if (!res.ok) {
      if (res.status === 401) setError("Sign in required");
      else setError("Failed to fetch status");
      return null;
    }
    return res.json();
  }, []);

  const fetchResults = useCallback(async (tid: string) => {
    const res = await fetch(`/api/discovery/results?thread_id=${encodeURIComponent(tid)}`);
    if (!res.ok) return null;
    return res.json();
  }, []);

  useEffect(() => {
    if (status !== "running" || !threadId) return;
    const id = setInterval(async () => {
      const data = await fetchStatus(threadId);
      if (!data) return;
      if (data.status === "completed") {
        setStatus("completed");
        setShowCompletionBanner(true);
        const r = await fetchResults(threadId);
        if (r) {
          setResults(r.discoveryResults ?? []);
          setMilestones(r.activeMilestones ?? []);
          setDiscoveryRunId(r.discoveryRunId);
        }
      } else if (data.status === "failed") {
        setStatus("failed");
        setError(data.errorMessage ?? "Discovery failed");
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status, threadId, fetchStatus, fetchResults]);

  const handleTrigger = async () => {
    setError(null);
    setStatus("running");
    const res = await fetch("/api/discovery/trigger", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setStatus("idle");
      setError(data.message ?? data.error ?? "Failed to start discovery");
      return;
    }
    setThreadId(data.threadId);
    setDiscoveryRunId(data.discoveryRunId);
  };

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Scholarship Discovery</h1>

      {status === "idle" && (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Find scholarships matched to your profile. Complete your profile (major
            and state) before starting.
          </p>
          <button
            type="button"
            onClick={handleTrigger}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            New Search
          </button>
        </div>
      )}

      {status === "running" && (
        <div
          className="rounded-lg border bg-muted/50 p-4"
          role="status"
          aria-live="polite"
        >
          <p>Discovery in progress…</p>
          <p className="text-sm text-muted-foreground mt-1">
            You&apos;ll be notified when results are ready.
            {discoveryRunId && (
              <span className="block mt-1 font-mono text-xs">
                Run: {discoveryRunId}
              </span>
            )}
          </p>
        </div>
      )}

      {showCompletionBanner && status === "completed" && (
        <div
          className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-4 mb-6"
          role="alert"
        >
          <p className="font-medium text-green-800 dark:text-green-200">
            Discovery complete! View your results below.
          </p>
        </div>
      )}

      {error && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 mb-6 text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      {status === "completed" && (
        <div className="space-y-6 mt-6">
          {results.length > 0 && (
            <section>
              <h2 className="text-lg font-medium mb-3">Scholarship Matches</h2>
              <ul className="space-y-2">
                {results.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border p-3 hover:bg-muted/50"
                  >
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      {r.title}
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">
                      Trust: {r.trustScore} · Match: {r.needMatchScore}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {milestones.length > 0 && (
            <section>
              <h2 className="text-lg font-medium mb-3">Next Steps</h2>
              <ol className="space-y-2 list-decimal list-inside">
                {milestones
                  .sort((a, b) => a.priority - b.priority)
                  .map((m) => (
                    <li key={m.id} className="rounded-lg border p-3">
                      {m.title}
                    </li>
                  ))}
              </ol>
            </section>
          )}
          {results.length === 0 && milestones.length === 0 && (
            <p className="text-muted-foreground">
              No matches yet. Try broadening your profile or check back later.
            </p>
          )}
        </div>
      )}

      {status === "completed" && (
        <button
          type="button"
          className="mt-6 rounded-md border px-4 py-2 hover:bg-muted"
          onClick={() => {
            setStatus("idle");
            setShowCompletionBanner(false);
            setResults([]);
            setMilestones([]);
          }}
        >
          Start New Search
        </button>
      )}
    </main>
  );
}
