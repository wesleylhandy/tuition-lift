# Discovery Engine Internal Contracts

**Branch**: `004-advisor-discovery-engine` | **Date**: 2025-02-13  
**Spec**: [spec.md](../spec.md)

## Overview

Internal interfaces and data flows for the Advisor Discovery Engine. These are implementation contracts between modules, not user-facing APIs. User-facing APIs remain in 003 (trigger, status, results).

---

## 1. QueryGenerator

**Purpose**: Transform anonymized profile into 3–5 distinct search queries.

**Input**: `AnonymizedProfile`
```typescript
interface AnonymizedProfile {
  gpa: number;           // 0–4.00
  major: string;
  incomeBracket: "Low" | "Moderate" | "Middle" | "Upper-Middle" | "High";
  pellStatus: "eligible" | "ineligible" | "unknown";
}
```

**Output**: `string[]` — 3–5 distinct search query strings.

**Contract**: Must never receive or emit name or SSN. Input validated via Zod before use.

---

## 2. TavilyClient

**Purpose**: Execute deep web search via Tavily API.

**Method**: `search(query: string): Promise<TavilySearchResult[]>`

**TavilySearchResult**:
```typescript
interface TavilySearchResult {
  title: string;
  url: string;
  content: string;   // snippet
  score: number;     // relevance
}
```

**Config**: `search_depth: "advanced"`, `max_results: 10`, `topic: "general"`. Rate limit: configurable delay (default 2s) between calls.

---

## 3. TrustScorer

**Purpose**: Compute 0–100 trust score and Trust Report.

**Input**: `{ url: string, title: string, content?: string }` (and optional fee-check result)

**Output**: `TrustScoreResult`
```typescript
interface TrustScoreResult {
  trust_score: number;      // 0–100
  trust_report: string;
  domain_tier: "high" | "vetted" | "under_review";
  longevity_score: number;  // 0–25
  fee_check: "pass" | "fail";
}
```

**Rules**: .edu/.gov → high; fee required → fail, score 0; WHOIS for longevity (fallback 12 if unavailable).

---

## 4. CycleVerifier

**Purpose**: Verify deadline aligns with current/upcoming academic year.

**Input**: `{ deadline: string | null, url?: string }` (from raw result or page)

**Output**: `CycleVerificationResult`
```typescript
interface CycleVerificationResult {
  verification_status: "verified" | "ambiguous_deadline" | "needs_manual_review" | "potentially_expired";
  deadline: string | null;  // ISO date if verified
  active: boolean;         // true if after today and in cycle; false when past due (Constitution §8)
}
```

**Logic**: Compute current academic year from `new Date()`; no hardcoded years. Past-due deadlines → `verification_status: "potentially_expired"`, `active: false`.

---

## 5. Deduplicator

**Purpose**: Merge duplicate URL results; runs in Scout phase before TrustScorer (trust_score computed later in Verify).

**Input**: `RawResult[]` (from Tavily across all queries)

**Output**: `RawResult[]` — one per unique URL; merge snippets and keep highest Tavily relevance score when same URL appears from multiple queries.

---

## 6. ScholarshipUpsert

**Purpose**: Persist verified scholarship to DB; upsert by URL.

**Input**: `DiscoveryResult` (post-verify)

**Operation**: `INSERT ... ON CONFLICT (url) DO UPDATE SET trust_score, metadata, updated_at`

**Output**: `uuid` (scholarship id)

---

## 7. Advisor_Search Node (Scout)

**Flow**:
1. Load `user_profile`, `financial_profile` from state
2. Scrub PII; build `AnonymizedProfile`
3. `QueryGenerator.generate(profile)` → 3–5 queries
4. For each query (with rate limit): `TavilyClient.search(query)` → append results; extract domains from result URLs for Live Pulse
5. `Deduplicator.dedupe(results)` → unique by URL
6. Update state: `discovery_results` = raw results (pre-verify)
7. Expose scouting domains for 006 Live Pulse: orchestration should publish Broadcast to `user:{userId}:discovery` with `{ event: "scouting", domains: ["example.edu", ...], status: "active" }` during Scout; `{ event: "scouting", status: "idle" }` when done. If Broadcast unavailable, 006 falls back to polling GET /api/discovery/status (lastActiveNode=Advisor_Search → show "Active Scouting").
8. Checkpoint (automatic after node)

---

## 8. Advisor_Verify Node

**Flow**:
1. Load `discovery_run_id` from graph `config.configurable` (003 provides at run start)
2. Load `discovery_results` from state (from Scout)
3. For each result: `TrustScorer.score(...)`, `CycleVerifier.verify(...)`
4. Filter: exclude fee_check=fail from active; flag ambiguous
5. Assign `need_match_score` (SAI alignment)
6. Build `DiscoveryResult[]` with trust_report, verification_status, discovery_run_id (attach from config)
7. `ScholarshipUpsert` for each verified result
8. Update state: `discovery_results` = full array (verified + flagged)
9. Return `Command({ goto: "Coach_Prioritization", update: { ... } })`

---

## 9. GET /api/discovery/results Response (Extended)

Per 003 contract; extend `discoveryResults` item. 003 includes discoveryRunId at response root; each result includes discoveryRunId (camelCase in API; snake_case internally) for 006 dismissals scoping. `coachTake`: ROI micro-summary for 006 Match Inbox; Coach_Prioritization (005) may populate; when null, 006 may use trustReport as fallback.

```json
{
  "discoveryRunId": "uuid",
  "discoveryResults": [
    {
      "id": "string",
      "title": "string",
      "url": "string",
      "discoveryRunId": "uuid",
      "trustScore": 85,
      "needMatchScore": 72,
      "trustReport": "High-trust .edu source; domain established 2010; no fees.",
      "coachTake": "Strong fit for your SAI range; apply by March 15.",
      "verificationStatus": "verified",
      "categories": ["need_based", "field_specific"],
      "deadline": "2026-03-15",
      "amount": 5000
    }
  ],
  "activeMilestones": [...]
}
```
