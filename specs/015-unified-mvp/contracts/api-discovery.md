# API Contracts: Discovery (015)

**Branch**: `015-unified-mvp`

## 1. POST /api/discovery/trigger

**Existing**: Yes. Extend with rate limit checks.

**Preconditions** (enforce before Inngest.send):
- Auth: user must be authenticated
- Profile completeness (FR-016): award_year, major, state, GPA required
- **NEW**: Rate limit: call canTriggerDiscovery(userId); if !allowed, return 429 with retry-after or message

**When discovery in progress** (existing): Return 200 with status "running" and message "Discovery already in progress".

**Response**:
- 401: Unauthorized
- 400: Profile incomplete (award_year, major, state, GPA per FR-016)
- **429**: Rate limited (cooldown or per_day_cap)
- 200: { threadId, discoveryRunId, status: "running", message }

## 2. GET /api/discovery/results

**Existing**: Yes. Ensure discovery_results include:
- id, scholarship_id (propagated consistently from pipeline)
- categories, verification_status (pass-through; no empty substitution)
- coach_take (or placeholder when generation failed)
- need_match_score, trust_score, trust_report, deadline, amount

**Consumer contract** (Match Inbox): Do NOT overwrite categories or verification_status with [] or null when present in API response.

## 3. Discovery Run Status

**Existing**: GET /api/discovery/status or equivalent. Used for "Discovery in progress" UI state. Block trigger when status=running.
