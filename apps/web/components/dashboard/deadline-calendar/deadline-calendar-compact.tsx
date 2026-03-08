"use client";

/**
 * DeadlineCalendarCompact — closed view: mini calendar for current month + upcoming deadlines.
 * Wireframe: calendar grid, UPCOMING list with colored dots.
 */
import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type Urgency = "critical" | "warning" | "safe";

interface UpcomingItem {
  title: string;
  date: string;
  urgency: Urgency;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function computeUrgency(deadline: string | null): Urgency {
  if (!deadline) return "safe";
  const d = new Date(deadline);
  const now = new Date();
  const hoursLeft = (d.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursLeft < 48) return "critical";
  if (hoursLeft < 7 * 24) return "warning";
  return "safe";
}

const URGENCY_DOT: Record<Urgency, string> = {
  critical: "bg-red-500",
  warning: "bg-amber-500",
  safe: "bg-green-500",
};

export interface DeadlineCalendarCompactProps {
  onStatusReady?: (data: { hasUrgent: boolean }) => void;
}

export function DeadlineCalendarCompact({
  onStatusReady,
}: DeadlineCalendarCompactProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const currentMonth = new Date();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/applications", {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) setError("Sign in required");
        else setError("Failed to load deadlines");
        return;
      }
      const json = (await res.json()) as { buckets?: Record<string, Array<{ applicationId: string; scholarshipTitle: string; deadline: string | null }>> };
      const buckets = json.buckets ?? {};
      const entries: UpcomingItem[] = [];
      const seen = new Set<string>();

      for (const bucket of Object.values(buckets)) {
        for (const app of bucket ?? []) {
          if (!app.deadline) continue;
          const key = `${app.applicationId}:${app.deadline}`;
          if (seen.has(key)) continue;
          seen.add(key);
          entries.push({
            title: app.scholarshipTitle,
            date: app.deadline,
            urgency: computeUrgency(app.deadline),
          });
        }
      }

      entries.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setUpcoming(entries.slice(0, 6));

      const hasUrgent = entries.some(
        (e) => e.urgency === "critical" || e.urgency === "warning"
      );
      onStatusReady?.({ hasUrgent });
    } catch {
      setError("Failed to load deadlines");
    } finally {
      setLoading(false);
    }
  }, [onStatusReady]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && upcoming.length === 0) {
    return (
      <div className="space-y-3" aria-label="Loading calendar" aria-busy>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" aria-hidden />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-full" aria-hidden />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const gridDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) gridDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) gridDays.push(d);

  const today = new Date();
  const isToday = (d: number) =>
    today.getDate() === d &&
    today.getMonth() === month &&
    today.getFullYear() === year;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          {MONTH_NAMES[month]} {year}
        </h3>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <span key={d} className="text-muted-foreground font-medium">
            {d}
          </span>
        ))}
        {gridDays.map((d, i) => (
          <div
            key={i}
            className={`aspect-square flex items-center justify-center rounded ${
              d === null
                ? "invisible"
                : isToday(d)
                  ? "bg-navy text-off-white font-semibold"
                  : "text-foreground"
            }`}
          >
            {d ?? ""}
          </div>
        ))}
      </div>

      {upcoming.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming
          </h4>
          <ul className="space-y-1.5" role="list">
            {upcoming.map((item, i) => {
              const d = new Date(item.date);
              const dateStr = d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
              return (
                <li
                  key={`${item.title}-${item.date}-${i}`}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${URGENCY_DOT[item.urgency]}`}
                    aria-hidden
                  />
                  <span className="truncate text-foreground">{item.title}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {dateStr}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {upcoming.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">No deadlines</p>
      )}
    </div>
  );
}
