# Agent Internal Contracts: Award Year Intelligence (014)

**Branch**: `014-award-year-intelligence` | **Package**: `apps/agent`

## 1. Load Profile → Award Year

**Location**: `apps/agent/lib/load-profile.ts`

**Contract**: Loaded profile MUST include `award_year`. All downstream nodes (QueryGenerator, Advisor_Search, Coach) MUST receive and use `award_year` from profile.

```ts
// Profile shape (from @repo/db)
profile: {
  award_year: number | null;  // e.g., 2026
  sai: number | null;
  // ... other fields
}
```

## 2. Query Generator → Award Year Injection

**Location**: `apps/agent/lib/discovery/` (or equivalent)

**Contract**: Search queries MUST inject the user's `award_year` so external search targets the correct cycle (e.g., "2026-2027 scholarships").

```ts
// Query generation input
{ award_year: number; intended_major?: string; state?: string; ... }

// Output: queries include cycle context
// e.g., "scholarships for 2026-2027 academic year"
```

## 3. DB-First Discovery

**Location**: New or extended node before external search

**Contract**:
- Query `scholarships` WHERE `trust_score >= 60` AND profile/award year match
- **Profile match criteria (C3)**: DB-first lookup MUST match on:
  - `award_year` → filter scholarships by cycle (deadline in current/upcoming academic year)
  - `intended_major` → match `scholarships.category` or metadata (field_specific, etc.)
  - `state` → match scholarships with geographic scope (local/regional) when metadata supports it
  - `household_income_bracket` (SAI-derived) → match need_based vs merit when category indicates
- Join `scholarship_cycle_verifications` to check "verified for user's academic_year?"
- Scholarships with `deadline < today` → flag for re-verification; do not suggest as active without verification
- If DB returns matches, merge with external search results (or short-circuit if sufficient)

## 4. Merit-First Mode

**Location**: Advisor ranking / discovery flow

**Contract**:
- Fetch `merit_first_sai_threshold` from `merit_first_config` for user's `award_year`
- If `profile.sai > threshold` → activate Merit-First Mode: prioritize Need-Blind and merit-tier over Pell-based
- Fallback: if config read fails, use standard need-based prioritization (do not block discovery)

## 5. Coach Alternative Path

**Location**: Coach Game Plan / recommendations

**Contract**:
- For Squeezed Middle users: if 009 curated catalog has Alternative Path data → include comparison
- If no data → omit block; continue with other Coach content (no placeholder)

## 6. Discovery Result → Application

**Contract**: When user tracks from feed, the `need_match_score` from `DiscoveryResult` MUST be passed to the application create/update path. Agent or web layer responsible for passing this through to Server Action.
