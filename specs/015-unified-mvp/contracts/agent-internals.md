# Agent Internal Contracts: Unified MVP (015)

**Branch**: `015-unified-mvp`

## 1. Scholarship Identity Propagation

**Discovery pipeline** (apps/agent): Each discovery result MUST have a stable `scholarship_id` (uuid) that maps to a scholarships row. When creating scholarship from extraction: compute content_hash; upsert by content_hash if exists, else insert; return id. Propagate id to discovery_results.

**Consumer** (apps/web): Use scholarship_id from API for Track and Dismiss. No mapping or substitution.

## 2. Coach's Take Generation

**Location**: Coach node or post-processing step in discovery pipeline.

**Contract**: For each discovery result, generate one-sentence Coach's Take (ROI micro-summary) synthesizing trust_report, need_match_score, merit_tag. On failure (timeout, API error): set coach_take to placeholder "Review this opportunity—details in your Match Inbox". Never omit; never fall back to Trust Report as primary display.

## 3. Deep-Scout Sub-Graph

**Location**: apps/agent/lib/discovery/ or nodes/

**Contract**:
- Input: URL of aggregation or institutional list page
- Process: BFS crawl; max depth from discovery_config; max links per page; max records per run
- On 403/timeout/CAPTCHA/rate-limit: log, skip page, continue
- Output: Array of extracted scholarship records (each with url, title, etc.)
- Cycle detection: visited URL set

## 4. Coach Commitment Logic

**Location**: apps/agent/lib/coach/game-plan.ts (or prioritization)

**Contract**: When building Game Plan, load user_saved_schools where status='committed'. For each committed institution, find institutional scholarships (matched by institution name or scholarship metadata). Elevate those to Critical severity. Apply before or merged with existing prioritization.

## 5. Categories and verification_status Pass-Through

**Contract**: Discovery results schema and state MUST include categories (string[]) and verification_status (string). API and Match Inbox consumer MUST pass these through; no substitution with [] or null when values exist.
