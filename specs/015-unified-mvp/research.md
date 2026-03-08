# Research: Unified MVP (015)

**Branch**: `015-unified-mvp` | **Phase 0**

## 1. Scholarship Identity (Content-Derived Hash)

**Decision**: Add `content_hash` column to `scholarships` table (or compute at discovery time and use for upsert/dedup). Use SHA-256 of canonical fields (url, title, deadline, amount rounded). Identity resolution agent/tool: when year-over-year variations make two records ambiguous (e.g., same scholarship, updated deadline), use fuzzy match on title+url domain; prefer newer record for active cycle.

**Rationale**: Spec FR-001 requires unique identifier propagated end-to-end. Existing `scholarships.id` (uuid) is DB-generated; discovery creates new rows. Content hash enables: (a) deduplication when same scholarship appears from multiple sources; (b) stable reference for Track/Dismiss so UI `scholarshipId` maps to correct DB row. **Identity resolution deferred to post-MVP**: when year-over-year variations make two records ambiguous, a future agent/tool may resolve via fuzzy match on title+url domain; MVP scope is content_hash + propagation only.

**Alternatives considered**:
- UUID only: No dedup; multiple rows for same scholarship from different runs.
- URL as identifier: URLs change (redirects, trailing slash); fragile.
- External ID from source: Aggregation sites don't provide stable IDs.

## 2. College List Status (Applied, Accepted, Committed)

**Decision**: Extend `user_saved_schools` with `status` column: `text CHECK (status IN ('applied', 'accepted', 'committed'))`; default `'applied'`. Update RLS to allow UPDATE (user owns row). Coach commitment logic: when status = 'committed', elevate institutional scholarships for that institution to Critical in Game Plan.

**Rationale**: Spec FR-008, FR-009. `user_saved_schools` already links user to institution; adding status avoids new table. Institutions table is shared catalog; user_saved_schools is user-specific list with status.

**Alternatives considered**:
- New `user_college_list` table: Duplicates user–institution relationship; rejected.
- Status on institutions: Institutions are shared; status is user-specific.

## 3. Deep-Scout Bounded Extraction

**Decision**: Add deep-scout sub-graph (or node) in Advisor flow. Configurable via `discovery_config`: `max_depth` (default 2), `max_links_per_page` (default 50), `max_records_per_run` (default 500). Use breadth-first crawl with visited URL set; cap depth via recursion level. On 403/timeout/CAPTCHA/rate-limit: log, skip page, continue with partial results (spec FR-017a). Cycle detection: track visited URLs; do not re-follow.

**Rationale**: Spec FR-004, FR-017, FR-017a. Aggregation pages (Bold.org, scholarships.com) and institutional lists (.edu) require following child links. Bounded depth prevents overflow; configurable limits allow tuning. Silent failure on external errors per spec.

**Alternatives considered**:
- Unbounded crawl: Risk of infinite loops, resource exhaustion; rejected.
- Single page only: Would not extract from aggregation sites; rejected.

## 4. Discovery Rate Limits

**Decision**: New `discovery_config` table (or extend existing config) with: `cooldown_minutes`, `per_day_cap`. Enforce at discovery trigger (Server Action or API): check last run timestamp and count for user today; block if within cooldown or over cap. Return 429 with retry-after header when blocked.

**Rationale**: Spec FR-019. Configurable via DB migrations or admin; no code deploy to change limits. Reduces risk of redundant runs and system overload.

**Alternatives considered**:
- Env vars: Requires redeploy; rejected.
- Hardcoded: Violates spec "configurable via DB."

## 5. Debt Lifted and "Won" Mapping

**Decision**: "Won" = DB `status = 'awarded'` AND `confirmed_at IS NOT NULL`. Existing game-plan.ts logic already uses this. Debt Lifted = SUM(scholarships.amount) for applications meeting that criteria. No schema change.

**Rationale**: Spec FR-010. Coach state "Won" maps to DB "awarded" (state-mapper.ts). confirmed_at indicates user confirmed outcome. Amount from scholarships table join.

**Alternatives considered**:
- New "won" status: Redundant with awarded+confirmed_at; rejected.

## 6. merit_tag Persistence

**Decision**: Add `merit_tag` column to `applications`: `text` nullable. Persist when user Tracks from discovery (alongside need_match_score). Coach uses for prioritization in merit-first mode.

**Rationale**: Spec FR-012. Discovery produces merit_tag (e.g., "merit", "need_blind"); persisting on Track enables long-term Coach sorting without re-running discovery.

**Alternatives considered**:
- Compute on read from scholarship metadata: Requires join; scholarship may not have tag; rejected.
- Store in JSONB: Overkill for single optional string; rejected.

## 7. Profile Completeness for Protected Routes

**Decision**: Required fields: `award_year`, `intended_major`, `state`, `gpa_unweighted` (or `gpa`). SAI optional—missing SAI does NOT block. Check in middleware or layout for `/dashboard`, `/scout`, discovery routes; redirect to onboarding when incomplete.

**Rationale**: Spec FR-016. award_year is needed for discovery and cycle logic; major, state, GPA are baseline for matching; SAI enhances but is post-FAFSA and optional.

**Alternatives considered**:
- SAI required: Spec explicitly says SAI must NOT block; rejected.
- All profile fields: Too strict; rejected.

## 8. Deep-Scout Resource Limits Defaults

**Decision**: Balanced preset: max_depth=2, max_links_per_page=50, max_records_per_run=500. Stored in discovery_config or similar. No separate "preset" table; single config row per award year or global.

**Rationale**: Spec clarifications. Balanced prevents overflow while allowing meaningful extraction from aggregation pages.

## 9. Coach's Take Failure Fallback

**Decision**: When Coach's Take generation fails (timeout, API error): display generic placeholder "Review this opportunity—details in your Match Inbox" on card. Do not break card render; do not fall back to Trust Report for primary display.

**Rationale**: Spec clarification. Trust Report is Advisor-focused; Coach's Take is different. Placeholder keeps UX consistent.

## 10. Discovery Run Observability

**Decision**: Emit structured logs (duration, success/fail, record_count) at discovery completion. Use existing logging (e.g., console/logger); no new dashboard. Optional: write to `discovery_runs` or `notification_log` for debugging; MVP scope = logs only.

**Rationale**: Spec FR-017b. Monitoring and debugging without dashboard for MVP.
