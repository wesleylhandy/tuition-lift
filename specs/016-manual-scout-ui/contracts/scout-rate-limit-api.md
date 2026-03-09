# Scout Rate Limit API Contract

**Branch**: `016-manual-scout-ui` | **Date**: 2025-03-08

## Overview

Per spec FR-015: 10–20 successful Scout submissions per user per scholarship cycle. Enforced in `confirmScoutScholarship`; optional pre-check via `checkScoutLimit`.

---

## 1. checkScoutLimit (Server Action)

**Purpose**: Pre-check whether user can submit more Scout scholarships this cycle.

**Input**: None (uses session user_id)

**Output**:
```ts
type CheckScoutLimitResult =
  | { canSubmit: true; remaining: number; limit: number }
  | { canSubmit: false; limit: number };
```

**Logic**:
- Get `user_id` from auth
- Get `academic_year` from `getCurrentAcademicYear()`
- Get `limit` from `getScoutSubmissionLimit()` (@repo/db; reads `scout_config.scout_submission_limit`; fallback 15)
- Query `scout_submissions` for (user_id, academic_year)
- If no row or count < limit: `{ canSubmit: true, remaining: limit - count, limit }`
- Else: `{ canSubmit: false, limit }`

**Usage**: Optional. Call before opening Scout modal or when showing limit-reached UI.

**Limit-reached message** (example): "You've reached your Scout limit for this cycle. Request more or wait until next year."

---

## 2. confirmScoutScholarship (Extended)

**New result variant**:
```ts
| { success: false; limitReached: true };
```

**Logic added**:
1. Before upsert: check scout_submissions count for (user_id, academic_year)
2. If count >= limit: return `{ success: false, limitReached: true }`
3. On success: upsert scout_submissions (INSERT or UPDATE count+1)

---

## 3. scout_submissions Table

See data-model.md §1.

**Migration**: `packages/database/supabase/migrations/00000000000040_scout_submissions.sql`

```sql
CREATE TABLE scout_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, academic_year)
);

ALTER TABLE scout_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own scout submissions"
  ON scout_submissions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 4. scout_config (Global DB Configuration)

**Table**: `scout_config` (single row). See data-model.md §1a.

| Column                  | Type    | Default | Notes                    |
|-------------------------|---------|---------|--------------------------|
| scout_submission_limit  | integer | 15      | Max submissions per cycle|

**Query**: `getScoutSubmissionLimit(): Promise<number>` in `packages/database/src/config-queries.ts`; exported from `@repo/db`. Returns limit; fallback 15 if no row.

---

## 5. Phase 9: Differential Limits

**Purpose**: URL/name inputs (Tavily) have lower cost than file inputs (Vision LLM). Enforce separate limits.

### scout_config (extended)

| Column                  | Type    | Default | Notes                         |
|-------------------------|---------|---------|-------------------------------|
| scout_url_limit         | integer | 50      | URL/name limit; NULL=unlimited|
| scout_file_limit        | integer | 15      | PDF/image limit               |

### scout_submissions (extended)

| Column     | Type    | Notes                     |
|------------|---------|---------------------------|
| url_count  | integer | URL/name confirms         |
| file_count | integer | PDF/image confirms        |

### checkScoutLimit (extended)

```ts
checkScoutLimit(inputType?: "url" | "file"): Promise<CheckScoutLimitResult>
```

When `inputType` specified: return remaining/limit for that type. When unspecified: return file limit (more restrictive) for backward compat.

### confirmScoutScholarship (extended)

Accept `inputType: "url" | "file"` (from client or inferred). Enforce `url_count < url_limit` or `file_count < file_limit` accordingly. Increment correct counter on success.

---

## 6. Phase 9: URL Pre-Check (checkScholarshipByUrl)

**Purpose**: Before Tavily, check if URL exists in scholarships. Skip external call when possible.

**Location**: `packages/database` or `apps/web/lib/actions/scout.ts`

**Called from**: `startScoutProcess` when `input_type === "url"`

**Returns**:
- `{ exists: true, alreadyTracked: true, scholarshipId }` → UI shows "Already in your list"
- `{ exists: true, alreadyTracked: false, scholarship }` → Short-circuit: create scout_run with result, skip Tavily
- `{ exists: false }` → Proceed with manual_research_node (Tavily)
