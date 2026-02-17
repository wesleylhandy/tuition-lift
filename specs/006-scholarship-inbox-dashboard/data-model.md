# Data Model: Scholarship Inbox & Dashboard

**Branch**: `006-scholarship-inbox-dashboard` | **Date**: 2025-02-13  
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## New Entities

### dismissals

Soft-dismiss tracking: when a user dismisses a scholarship from the Match Inbox, it is hidden for the current discovery run only. Scoped by discovery run so it may reappear when a new run returns the same scholarship.

| Field             | Type        | Constraints                       | Notes                                   |
|-------------------|-------------|-----------------------------------|-----------------------------------------|
| id                | uuid        | PK, default gen_random_uuid()     |                                         |
| user_id           | uuid        | NOT NULL, FK → auth.users(id)     |                                         |
| scholarship_id     | uuid        | NOT NULL, FK → scholarships(id)  |                                         |
| discovery_run_id   | uuid        | nullable                          | Optional; links to orchestration run ID |
| dismissed_at      | timestamptz | NOT NULL, default now()           |                                         |

**Unique**: (user_id, scholarship_id, discovery_run_id) — or (user_id, scholarship_id) if discovery_run_id is null and we use "latest run" semantics.

**Simpler option** (recommended for MVP): (user_id, scholarship_id) unique; add `dismissed_at`. Filter logic: exclude if dismissed_at is after the start of the current discovery run. "Current run" = most recent discovery completion timestamp for user (from orchestration state or a `discovery_runs` table). If no discovery_runs table exists, use: exclude (user_id, scholarship_id) in dismissals where dismissed_at > [some threshold, e.g., last 7 days] — softer heuristic.

**MVP simplification**: (user_id, scholarship_id) unique. When new discovery completes, clear or ignore dismissals older than that run. Requires orchestration to expose "last discovery completed at" or run ID. For minimal implementation: store (user_id, scholarship_id); when showing matches from "current" discovery results, filter out dismissed. "Current" = matches from the most recent discovery_results payload. Dismissals apply to the session/batch—on next full discovery, all new results show (don't filter by old dismissals). Implement by: dismissals have (user_id, scholarship_id); when loading matches, get discovery result IDs and filter: exclude if (user_id, scholarship_id) in dismissals. The "reappear on new run" means: new discovery produces new result set; we don't carry over dismissals to filter that set. So we can use simple (user_id, scholarship_id) and when we display "Run A" results, we filter by dismissals created while viewing Run A. Problem: how do we know "Run A"? Option: discovery_run_id from orchestration. If orchestration doesn't have it, use timestamp: dismissals created in last N hours apply to "current" run. When user triggers new discovery, we treat it as new run—stop filtering by dismissals older than the new run start. Simplest: add discovery_run_id to dismissals, nullable. When null, we don't filter (or treat as "legacy"). When present, only filter matches from that run. When displaying matches from run X, filter dismissals where discovery_run_id = X or creation predates run X.

**Final decision**: Include `discovery_run_id` (uuid, nullable). When orchestration provides a run ID with discovery results, store it on dismiss. Filter: exclude (user_id, scholarship_id) where discovery_run_id matches current run. New discovery run = new run_id = no matching dismissals = all show. If orchestration does not yet expose run IDs, make discovery_run_id nullable; fallback: use (user_id, scholarship_id) only and clear dismissals when new discovery completes (or use timestamp-based heuristic—deferred to implementation).

**RLS**: Authenticated users can INSERT their own rows (with user_id = auth.uid()); SELECT/DELETE own. No UPDATE (immutable).

**Validation**: Zod schema; user_id and scholarship_id must be valid UUIDs.

### Migration: add_dismissals.sql

```sql
CREATE TABLE public.dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scholarship_id uuid NOT NULL REFERENCES public.scholarships(id) ON DELETE CASCADE,
  discovery_run_id uuid,
  dismissed_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_dismissals_user_scholarship_run
  ON public.dismissals (user_id, scholarship_id, discovery_run_id)
  WHERE discovery_run_id IS NOT NULL;

CREATE UNIQUE INDEX idx_dismissals_user_scholarship_null_run
  ON public.dismissals (user_id, scholarship_id)
  WHERE discovery_run_id IS NULL;

CREATE INDEX idx_dismissals_user_id ON public.dismissals (user_id);

ALTER TABLE public.dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own dismissals"
  ON public.dismissals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select own dismissals"
  ON public.dismissals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dismissals"
  ON public.dismissals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

---

## Consumed Entities (from @repo/db)

| Entity       | Source       | Usage                                              |
|--------------|--------------|----------------------------------------------------|
| profiles     | 002 data-model | Coach's Prep Checklist (intended_major, state, GPA per 002 FR-014b; SAI for financial profile) |
| scholarships | 002 data-model | Match cards, trust_score for Trust Shield          |
| applications | 002 data-model | Application Tracker, Top 3, Debt Lifted           |
| discovery_results | Orchestration / Advisor (003) | Match Inbox feed; need_match_score, trust_score, discovery_run_id |

**Note**: discovery_results are retrieved via GET /api/discovery/results (003) which returns discoveryRunId and results with discovery_run_id per item. momentum_score and Coach's Take may be computed by Coach/Orchestration. applications.momentum_score (002; formerly priority_score) used for Top 3 ordering.

## Trust Shield Mapping

| trust_score | Badge Color |
|-------------|-------------|
| 80–100      | Green       |
| 60–79       | Amber       |
| 40–59       | Yellow      |
| 0–39        | Red         |
| null/missing | Neutral (gray) |

## Lifecycle Mapping (Coach ↔ Dashboard)

Dashboard displays: Tracked, Drafting, Review, Submitted, Outcome Pending; Won, Lost.

DB `application_status`: draft, submitted, awarded, rejected, withdrawn.

Mapping (per spec note, to be revisited):
- Tracked → draft (initial)
- Drafting → draft
- Review → draft (or new status if added)
- Submitted → submitted
- Outcome Pending → submitted
- Won → awarded
- Lost → rejected

Implement UI columns/sections by mapping DB status to display buckets.
