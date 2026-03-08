"use client";

/**
 * ScholarshipRepository — expanded view for Discovery Feed.
 * Search bar, filters (Major, SAI, State), active filter tags (removable),
 * filtered Match Card list with Trust Shield, Match Strength, Coach's Take.
 * Empty state for no matches with option to clear/adjust filters.
 * Per contracts/kanban-repository-heatmap.md, match-card-extended.md; T031–T034 [US5].
 */

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { MatchCard } from "./match-card";
import {
  type DiscoveryMatch,
  useRealtimeMatches,
} from "@/lib/hooks/use-realtime-matches";
import { getDismissedScholarshipIds } from "@/lib/actions/get-dismissed-ids";
import { getTrackedScholarshipIds } from "@/lib/actions/get-tracked-scholarship-ids";
import { Search, X } from "lucide-react";

const MAJOR_OPTIONS = [
  { value: "", label: "All majors" },
  { value: "computer science", label: "Computer Science" },
  { value: "engineering", label: "Engineering" },
  { value: "business", label: "Business" },
  { value: "stem", label: "STEM" },
  { value: "liberal arts", label: "Liberal Arts" },
  { value: "health", label: "Health" },
  { value: "education", label: "Education" },
  { value: "arts", label: "Arts" },
] as const;

const SAI_OPTIONS = [
  { value: "", label: "All financial aid" },
  { value: "need_based", label: "Need-based" },
  { value: "merit", label: "Merit" },
] as const;

const STATE_OPTIONS = [
  { value: "", label: "All states" },
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
] as const;

interface FilterState {
  search: string;
  major: string;
  sai: string;
  state: string;
}

function sortMatches(matches: DiscoveryMatch[]): DiscoveryMatch[] {
  return [...matches].sort((a, b) => {
    const trust = (b.trustScore ?? 0) - (a.trustScore ?? 0);
    if (trust !== 0) return trust;
    return (b.needMatchScore ?? 0) - (a.needMatchScore ?? 0);
  });
}

function filterMatches(
  matches: DiscoveryMatch[],
  filters: FilterState
): DiscoveryMatch[] {
  return matches.filter((m) => {
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      if (!m.title.toLowerCase().includes(q)) return false;
    }

    if (filters.major) {
      const majorLower = filters.major.toLowerCase();
      const titleMatch = m.title.toLowerCase().includes(majorLower);
      const categoryMatch = (m.categories ?? []).some((c) =>
        c.toLowerCase().includes(majorLower)
      );
      if (!titleMatch && !categoryMatch) return false;
    }

    if (filters.sai) {
      const categories = (m.categories ?? []).map((c) => c.toLowerCase());
      const hasNeedBased = categories.some(
        (c) => c === "need_based" || c.includes("need")
      );
      const hasMerit = categories.some(
        (c) => c === "merit" || c.includes("merit")
      );
      if (filters.sai === "need_based" && !hasNeedBased) return false;
      if (filters.sai === "merit" && !hasMerit) return false;
    }

    // State: no state data in match; filter prepared for future API extension
    if (filters.state) {
      // Placeholder: when scholarship state metadata available, filter here
    }

    return true;
  });
}

interface FilterTag {
  id: string;
  type: "search" | "major" | "sai" | "state";
  label: string;
  value: string;
}

function buildFilterTags(filters: FilterState): FilterTag[] {
  const tags: FilterTag[] = [];
  if (filters.search.trim()) {
    tags.push({
      id: "search",
      type: "search",
      label: `Search: ${filters.search.trim()}`,
      value: filters.search.trim(),
    });
  }
  if (filters.major) {
    const opt = MAJOR_OPTIONS.find((o) => o.value === filters.major);
    tags.push({
      id: "major",
      type: "major",
      label: opt?.label ?? filters.major,
      value: filters.major,
    });
  }
  if (filters.sai) {
    const opt = SAI_OPTIONS.find((o) => o.value === filters.sai);
    tags.push({
      id: "sai",
      type: "sai",
      label: opt?.label ?? filters.sai,
      value: filters.sai,
    });
  }
  if (filters.state) {
    const opt = STATE_OPTIONS.find((o) => o.value === filters.state);
    tags.push({
      id: "state",
      type: "state",
      label: opt?.label ?? filters.state,
      value: filters.state,
    });
  }
  return tags;
}

export function ScholarshipRepository() {
  const [userId, setUserId] = useState<string | null>(null);
  const [matches, setMatches] = useState<DiscoveryMatch[]>([]);
  const [trackedScholarshipIds, setTrackedScholarshipIds] = useState<
    Set<string>
  >(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    major: "",
    sai: "",
    state: "",
  });

  const { newMatches, clearNewMatches } = useRealtimeMatches({
    userId,
    enablePollingFallback: true,
  });

  const fetchContext = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) setError("Sign in required");
        else setError("Failed to load");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { userId: string };
      setUserId(data.userId);
      setError(null);
    } catch {
      setError("Failed to load");
      setLoading(false);
    }
  }, []);

  const fetchMatches = useCallback(async () => {
    if (!userId) return;
    const threadId = `user_${userId}`;
    try {
      const resultsRes = await fetch(
        `/api/discovery/results?thread_id=${encodeURIComponent(threadId)}`,
        { credentials: "include" }
      );
      if (!resultsRes.ok) return;
      const data = (await resultsRes.json()) as {
        discoveryRunId?: string | null;
        discoveryResults?: Array<{
          id: string;
          scholarshipId?: string;
          discoveryRunId?: string | null;
          title: string;
          url: string;
          trustScore: number;
          needMatchScore: number;
          trustReport?: string | null;
          coachTake?: string | null;
          deadline?: string | null;
          amount?: number | null;
          categories?: string[];
        }>;
      };
      const runId = data.discoveryRunId ?? null;
      const [dismissedIds, trackedIds] = await Promise.all([
        getDismissedScholarshipIds(runId),
        getTrackedScholarshipIds(),
      ]);
      const dismissedSet = new Set(dismissedIds);
      setTrackedScholarshipIds(new Set(trackedIds));
      const raw = (data.discoveryResults ?? []).map((r) => ({
        id: r.id,
        scholarshipId: r.scholarshipId ?? r.id,
        discoveryRunId: r.discoveryRunId ?? runId,
        title: r.title,
        url: r.url,
        trustScore: r.trustScore,
        needMatchScore: r.needMatchScore,
        trustReport: r.trustReport ?? null,
        coachTake: r.coachTake ?? null,
        verificationStatus: null,
        categories: r.categories ?? [],
        deadline: r.deadline ?? null,
        amount: r.amount ?? null,
      }));
      const filtered = raw.filter((m) => !dismissedSet.has(m.scholarshipId));
      setMatches(sortMatches(filtered));
    } catch {
      setError("Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetchMatches();
  }, [userId, fetchMatches]);

  useEffect(() => {
    if (newMatches.length === 0) return;
    setMatches((prev) => sortMatches([...prev, ...newMatches]));
    clearNewMatches();
  }, [newMatches, clearNewMatches]);

  const filteredMatches = filterMatches(matches, filters);
  const filterTags = buildFilterTags(filters);

  const removeFilter = useCallback((tag: FilterTag) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (tag.type === "search") next.search = "";
      if (tag.type === "major") next.major = "";
      if (tag.type === "sai") next.sai = "";
      if (tag.type === "state") next.state = "";
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      search: "",
      major: "",
      sai: "",
      state: "",
    });
  }, []);

  const coachTakeFallback = useCallback((m: DiscoveryMatch) => {
    return m.coachTake ?? m.trustReport ?? null;
  }, []);

  if (error) {
    return (
      <div
        className="flex items-center justify-center p-8"
        role="alert"
        aria-live="polite"
      >
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (loading && matches.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-4 p-4">
        <div className="h-10 animate-pulse rounded-md border border-border bg-muted/30" />
        <div className="flex gap-2">
          <div className="h-9 w-28 animate-pulse rounded-md border border-border bg-muted/30" />
          <div className="h-9 w-24 animate-pulse rounded-md border border-border bg-muted/30" />
          <div className="h-9 w-24 animate-pulse rounded-md border border-border bg-muted/30" />
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-auto">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg border border-border bg-muted/20"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 p-8" aria-label="Scholarship Repository">
      {/* T031: Search bar */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={filters.search}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, search: e.target.value }))
          }
          placeholder="Search scholarships..."
          className="min-h-[44px] w-full rounded-lg border border-border bg-muted/30 pl-[3.25rem] pr-5 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2"
          aria-label="Search scholarships"
        />
      </div>

      {/* T031: Filter controls (Major, SAI, State) */}
      <div className="flex flex-wrap gap-4">
        <select
          value={filters.major}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, major: e.target.value }))
          }
          className="min-h-[44px] min-w-[160px] cursor-pointer rounded-lg border border-border bg-muted/30 px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2"
          aria-label="Filter by major"
        >
          {MAJOR_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={filters.sai}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, sai: e.target.value }))
          }
          className="min-h-[44px] min-w-[160px] cursor-pointer rounded-lg border border-border bg-muted/30 px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2"
          aria-label="Filter by financial aid type"
        >
          {SAI_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={filters.state}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, state: e.target.value }))
          }
          className="min-h-[44px] min-w-[160px] cursor-pointer rounded-lg border border-border bg-muted/30 px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2"
          aria-label="Filter by state"
        >
          {STATE_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* T032: Active filter tags (removable) */}
      {filterTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filterTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-4 py-2.5 text-sm"
            >
              {tag.label}
              <button
                type="button"
                onClick={() => removeFilter(tag)}
                className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-full hover:bg-muted focus:outline-none focus:ring-2 focus:ring-electric-mint"
                aria-label={`Remove filter: ${tag.label}`}
              >
                <X className="size-4" aria-hidden />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="cursor-pointer rounded px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-electric-mint min-h-[44px] min-w-[44px]"
            aria-label="Clear all filters"
          >
            Clear all
          </button>
        </div>
      )}

      {/* T033: Filtered Match Card list */}
      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-slate-50/50 dark:bg-muted/10">
        {filteredMatches.length === 0 ? (
          /* T034: Empty state */
          <div
            className="flex flex-col items-center justify-center gap-6 p-12 text-center"
            role="status"
          >
            <p className="text-sm text-muted-foreground">
              {matches.length === 0
                ? "No scholarships yet. Run discovery to find matches."
                : "No matches for your current filters."}
            </p>
            {filterTags.length > 0 ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="cursor-pointer rounded-md bg-electric-mint/30 px-5 py-3 text-sm font-medium text-navy hover:bg-electric-mint/50 focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 min-h-[44px] min-w-[44px]"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="grid gap-8 p-6 md:p-8" role="list">
            <AnimatePresence mode="popLayout">
              {filteredMatches.map((m) => (
                <li key={m.id} role="listitem">
                  <MatchCard
                    id={m.id}
                    scholarshipId={m.scholarshipId}
                    title={m.title}
                    url={m.url}
                    trustScore={m.trustScore}
                    matchStrength={m.needMatchScore ?? null}
                    coachTakeText={coachTakeFallback(m)}
                    amount={m.amount}
                    deadline={m.deadline}
                    categories={m.categories}
                    discoveryRunId={m.discoveryRunId}
                    needMatchScore={m.needMatchScore}
                    isTracked={trackedScholarshipIds.has(m.scholarshipId)}
                    onTrackSuccess={() => {
                      setTrackedScholarshipIds((prev) =>
                        new Set(prev).add(m.scholarshipId)
                      );
                    }}
                    onDismissSuccess={() => {
                      setMatches((prev) => prev.filter((x) => x.id !== m.id));
                    }}
                  />
                </li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
