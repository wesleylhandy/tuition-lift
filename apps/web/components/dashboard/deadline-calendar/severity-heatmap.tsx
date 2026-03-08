"use client";

/**
 * SeverityHeatmap — expanded view for Deadline Calendar.
 * 12-month grid (4×3) by academic year (Aug–Jul); deadlines color-coded: Critical (<48h), Warning (<7d), Safe (≥7d).
 * Current month highlighted with ring; empty months show "No deadlines".
 * Per contracts/kanban-repository-heatmap.md; research.md §7; T035–T038 [US6].
 */

import { useCallback, useEffect, useState } from "react";

const MONTH_SHORT: Record<number, string> = {
  1: "Jan",
  2: "Feb",
  3: "Mar",
  4: "Apr",
  5: "May",
  6: "Jun",
  7: "Jul",
  8: "Aug",
  9: "Sep",
  10: "Oct",
  11: "Nov",
  12: "Dec",
};

type Urgency = "critical" | "warning" | "safe";

interface DeadlineEntry {
  date: string;
  urgency: Urgency;
  title: string;
}

interface AcademicYearSlot {
  /** Calendar month 1–12 */
  calendarMonth: number;
  /** Calendar year for this month */
  calendarYear: number;
  /** Display label: "Aug" or "Jan 2025" for disambiguation */
  label: string;
  deadlines: DeadlineEntry[];
  /** True when this slot is the current calendar month */
  isCurrentMonth: boolean;
  /** Slot index 0–11 for stable keys */
  slotIndex: number;
}

interface TrackerApplication {
  applicationId: string;
  scholarshipTitle: string;
  deadline: string | null;
}

interface BucketsResponse {
  buckets: Record<string, TrackerApplication[]>;
}

function getAcademicYearRange(now: Date): { startYear: number; endYear: number } {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed: Jan=0, Jul=6, Aug=7
  // Aug 1 (month >= 7) starts new cycle: year–(year+1)
  if (month >= 7) {
    return { startYear: year, endYear: year + 1 };
  }
  return { startYear: year - 1, endYear: year };
}

/** Academic year month order: Aug, Sep, ..., Jul. Returns slots with labels. */
function buildAcademicYearSlots(
  startYear: number,
  endYear: number,
  now: Date
): Omit<AcademicYearSlot, "deadlines">[] {
  const todayMonth = now.getMonth() + 1;
  const todayYear = now.getFullYear();

  const order: { month: number; year: number }[] = [
    { month: 8, year: startYear },
    { month: 9, year: startYear },
    { month: 10, year: startYear },
    { month: 11, year: startYear },
    { month: 12, year: startYear },
    { month: 1, year: endYear },
    { month: 2, year: endYear },
    { month: 3, year: endYear },
    { month: 4, year: endYear },
    { month: 5, year: endYear },
    { month: 6, year: endYear },
    { month: 7, year: endYear },
  ];

  return order.map(({ month, year }, slotIndex) => {
    const isCurrentMonth = month === todayMonth && year === todayYear;
    const short = MONTH_SHORT[month] ?? String(month);
    const label =
      month >= 8
        ? short
        : `${short} ${year}`;

    return {
      calendarMonth: month,
      calendarYear: year,
      label,
      slotIndex,
      isCurrentMonth,
    };
  });
}

function computeUrgency(deadline: string | null): Urgency {
  if (!deadline) return "safe";
  const d = new Date(deadline);
  const now = new Date();
  const hoursLeft = (d.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursLeft < 48) return "critical";
  if (hoursLeft < 7 * 24) return "warning";
  return "safe";
}

function extractDeadlinesFromBuckets(buckets: BucketsResponse["buckets"]): {
  date: string;
  urgency: Urgency;
  title: string;
}[] {
  const seen = new Set<string>();
  const entries: { date: string; urgency: Urgency; title: string }[] = [];

  for (const bucket of Object.values(buckets)) {
    for (const app of bucket ?? []) {
      if (!app.deadline) continue;
      const key = `${app.applicationId}:${app.deadline}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        date: app.deadline,
        urgency: computeUrgency(app.deadline),
        title: app.scholarshipTitle,
      });
    }
  }
  return entries;
}

function assignDeadlinesToSlots(
  slots: Omit<AcademicYearSlot, "deadlines">[],
  deadlines: { date: string; urgency: Urgency; title: string }[]
): AcademicYearSlot[] {
  const bySlot = new Map<number, DeadlineEntry[]>();
  for (let i = 0; i < 12; i++) {
    bySlot.set(i, []);
  }

  for (const d of deadlines) {
    const date = new Date(d.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    const slotIndex = slots.findIndex(
      (s) => s.calendarMonth === month && s.calendarYear === year
    );
    if (slotIndex === -1) continue;

    const list = bySlot.get(slotIndex) ?? [];
    list.push({ ...d });
    bySlot.set(slotIndex, list);
  }

  return slots.map((slot, idx) => ({
    ...slot,
    deadlines: bySlot.get(idx) ?? [],
  }));
}

const URGENCY_CLASSES: Record<Urgency, string> = {
  critical: "bg-red-500",
  warning: "bg-amber-500",
  safe: "bg-green-500",
};

const LEGEND_ITEMS: { label: string; urgency: Urgency; desc: string }[] = [
  { label: "Critical", urgency: "critical", desc: "< 48 hours" },
  { label: "Warning", urgency: "warning", desc: "< 7 days" },
  { label: "Safe", urgency: "safe", desc: "≥ 7 days" },
];

export function SeverityHeatmap() {
  const [slots, setSlots] = useState<AcademicYearSlot[]>([]);
  const [academicYearLabel, setAcademicYearLabel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const json = (await res.json()) as BucketsResponse;
      const deadlines = extractDeadlinesFromBuckets(json.buckets);

      const now = new Date();
      const { startYear, endYear } = getAcademicYearRange(now);
      setAcademicYearLabel(`${startYear}–${endYear}`);

      const baseSlots = buildAcademicYearSlots(startYear, endYear, now);
      const filledSlots = assignDeadlinesToSlots(baseSlots, deadlines);
      setSlots(filledSlots);
    } catch {
      setError("Failed to load deadlines");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && slots.length === 0) {
    const now = new Date();
    const { startYear, endYear } = getAcademicYearRange(now);
    const baseSlots = buildAcademicYearSlots(startYear, endYear, now);

    return (
      <div className="flex h-full min-h-0 flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Loading {startYear}–{endYear}…
          </span>
          <div
            className="flex flex-wrap gap-3"
            role="img"
            aria-label="Legend loading"
          >
            <span className="text-xs text-muted-foreground">Legend loading…</span>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {baseSlots.map((slot) => (
            <div
              key={slot.slotIndex}
              className="flex flex-col rounded-lg border border-border bg-muted/20 p-3 animate-pulse"
              aria-label={`${slot.label} loading`}
            >
              <span className="text-sm font-medium text-muted-foreground">
                {slot.label}
              </span>
              <div className="mt-2 h-20 rounded bg-muted/30" aria-hidden />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground" aria-live="polite">
          Academic year {academicYearLabel}
        </p>
        <div
          className="flex flex-wrap items-center gap-3"
          role="img"
          aria-label="Critical, Warning, Safe urgency legend"
        >
          {LEGEND_ITEMS.map(({ label, urgency, desc }) => (
            <div
              key={urgency}
              className="flex items-center gap-2 text-sm"
            >
              <span
                className={`inline-block h-3 w-6 rounded ${URGENCY_CLASSES[urgency]}`}
                aria-hidden
              />
              <span className="text-foreground font-medium">{label}</span>
              <span className="text-muted-foreground">({desc})</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {slots.map((slot) => (
          <div
            key={slot.slotIndex}
            className={`flex min-h-[120px] flex-col rounded-lg border p-3 ${
              slot.isCurrentMonth
                ? "border-navy ring-2 ring-navy ring-offset-2 ring-offset-background bg-electric-mint/5"
                : "border-border bg-muted/20"
            }`}
            aria-label={`${slot.label} month${slot.isCurrentMonth ? " (current)" : ""}`}
            aria-current={slot.isCurrentMonth ? "date" : undefined}
          >
            <span className="text-sm font-medium text-foreground">
              {slot.label}
            </span>
            {slot.deadlines.length === 0 ? (
              <p className="mt-2 flex-1 text-xs text-muted-foreground">
                No deadlines
              </p>
            ) : (
              <ul className="mt-2 flex flex-1 flex-col gap-1 overflow-auto">
                {slot.deadlines.map((d, idx) => (
                  <li key={`${d.date}-${idx}`} className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${URGENCY_CLASSES[d.urgency]}`}
                      aria-hidden
                    />
                    <span
                      className="truncate text-xs text-foreground"
                      title={d.title}
                    >
                      {d.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
