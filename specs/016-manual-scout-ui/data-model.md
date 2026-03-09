# Data Model: Manual Scout Flyer-to-Fact UI (016)

**Branch**: `016-manual-scout-ui` | **Date**: 2025-03-08  
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Overview

Spec 016 extends the Scout UI; backend from 007 remains. New data: (1) **scout_config** table for global Scout settings (submission limit); (2) **scout_submissions** table for per-user, per-cycle rate limiting; (3) **scholarships.source** column for provenance; (4) **client-side state** for document preview (File/blob URL held in memory). No other changes to `scholarships`, `applications`, `scout_uploads`, or `scout_runs`.

---

## 1. scout_submissions (Rate Limit)

| Field        | Type        | Constraints                  | Notes                            |
|-------------|-------------|------------------------------|----------------------------------|
| id          | uuid        | PK, default gen_random_uuid() |                                  |
| user_id     | uuid        | NOT NULL, FK → auth.users     |                                  |
| academic_year | text      | NOT NULL                     | e.g., "2025-2026"                |
| count       | integer     | NOT NULL, default 0           | Successful confirms this cycle   |
| created_at  | timestamptz | NOT NULL, default now()       |                                  |
| updated_at  | timestamptz | NOT NULL, default now()       |                                  |

**Unique constraint**: (user_id, academic_year) — one row per user per year.

**RLS**: Authenticated users can SELECT/UPDATE only own rows. INSERT on first Scout confirm of cycle; UPDATE (increment count) on subsequent confirms.

**Limit**: Fetched from `scout_config.scout_submission_limit` (default 15). When count ≥ limit, block confirm and return `limitReached: true`. See §1a.

---

## 1a. scout_config (Global Scout Settings)

| Field                   | Type        | Constraints                  | Notes                    |
|-------------------------|-------------|------------------------------|--------------------------|
| id                      | uuid        | PK, default gen_random_uuid()| Single row per instance  |
| scout_submission_limit  | integer     | NOT NULL, default 15         | Max submissions per cycle|
| updated_at              | timestamptz | NOT NULL, default now()      |                          |

**Migration**: `packages/database/supabase/migrations/00000000000042_scout_config.sql`

```sql
CREATE TABLE public.scout_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_submission_limit integer NOT NULL DEFAULT 15,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scout_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scout_config_select_public"
  ON public.scout_config FOR SELECT USING (true);

-- Single default row (service-role INSERT)
INSERT INTO public.scout_config (scout_submission_limit) VALUES (15);
```

**Query**: `getScoutSubmissionLimit()` in `packages/database/src/config-queries.ts`; exported from `@repo/db`. Returns limit (fallback 15 if no row). Admin updates via service-role.

### Phase 9: Differential Limits

| Field                   | Type        | Constraints                  | Notes                    |
|-------------------------|-------------|------------------------------|--------------------------|
| scout_url_limit         | integer     | nullable, default 50        | URL/name submissions; NULL = unlimited |
| scout_file_limit        | integer     | NOT NULL, default 15         | PDF/image submissions    |

**Migration**: `00000000000043_scout_config_differential_limits.sql`. Existing `scout_submission_limit` retained for backward compat; new limits take precedence when present.

**scout_submissions Phase 9**:

| Field       | Type    | Notes                                  |
|-------------|---------|----------------------------------------|
| url_count   | integer | NOT NULL, default 0; URL/name confirms |
| file_count  | integer | NOT NULL, default 0; PDF/image confirms|

Migration adds columns; `count` may be deprecated in favor of url_count + file_count, or retained as total.

---

## 2. scholarships.source (Provenance)

| Value        | Meaning                                                |
|-------------|--------------------------------------------------------|
| `manual`    | User-submitted via Scout (flyer, URL, PDF, photo)      |
| `search`    | Professional Advisor discovery (Tavily, etc.)         |
| `warehouse` | Curated bulk import (e.g., Fastweb, institutional)    |
| `institution` | Direct .edu/.gov institutional aid (future)        |

**Migration**: `packages/database/supabase/migrations/00000000000041_scholarships_source.sql`:

```sql
ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS source text
  CHECK (source IS NULL OR source IN ('manual', 'search', 'warehouse', 'institution'));
```

Scout confirm sets `source = 'manual'` on upsert. Existing rows remain NULL; discovery/warehouse flows set `search`/`warehouse` when those specs are implemented.

**Rationale**: Enables analytics, "Added from Scout" display, and future cross-source deduplication.

---

## 3. Duplicate Prevention (Manual Submissions)

**Existing (007)**: (a) **URL upsert** — same URL updates existing scholarship, no duplicate row; (b) **Fuzzy title match** — fuzzball.ratio ≥ 0.85 vs user's tracked scholarships returns `duplicate: true, existingTitle`; user chooses add anyway or cancel (T029).

**No additional changes for 016**. Duplicate prevention is already in place. Source column aids future logic (e.g., "already in repository from search").

---

## 4. Client-Side State (No Persistence)

| State              | Type                    | Notes                                           |
|--------------------|-------------------------|-------------------------------------------------|
| sourceFile         | File \| null             | Uploaded file held for document preview         |
| sourceBlobUrl      | string \| null           | URL.createObjectURL(sourceFile) for preview     |
| sourceUrl          | string \| null           | When input_type=url, the submitted URL          |
| inputMethod        | "url" \| "pdf" \| "photo" | Selected card                                  |

**Lifecycle**: Set when user selects card and provides input; cleared on modal close or reset. Used only for left-panel preview in verification view.

---

## 5. Consumed Entities (Unchanged from 007, except scholarships.source, + scout_config)

| Entity         | Usage                                                                 |
|----------------|-----------------------------------------------------------------------|
| scout_config   | Read scout_submission_limit via getScoutSubmissionLimit()             |
| scout_runs     | Status polling; step, result                                          |
| scout_uploads  | File storage path for file_path input                                 |
| scholarships   | Upsert on confirm                                                     |
| applications   | Insert on confirm                                                     |
| profiles       | user_id for auth; award year for cycle                                |

---

## 6. confirmScoutScholarship Extension

Before upsert and insert:

1. Call `getOrCreateScoutSubmission(userId, academicYear)`.
2. Call `getScoutSubmissionLimit()`; if `count >= limit`, return `{ success: false, limitReached: true }`.
3. Otherwise, proceed with 007 logic; on success increment `count` and return ids.
4. On scholarship upsert, set `source = 'manual'` for Scout-originated entries.

**New result shape**:
```ts
type ConfirmScoutResult =
  | { success: true; scholarshipId: string; applicationId: string }
  | { success: false; error: string }
  | { success: false; duplicate: true; existingTitle: string }
  | { success: false; limitReached: true };
```

---

## 7. checkScoutLimit (New Server Action)

**Purpose**: Check if user has reached Scout submission limit before opening modal or enabling confirm.

**Output**:
```ts
type CheckScoutLimitResult =
  | { canSubmit: true; remaining: number; limit: number }
  | { canSubmit: false; limit: number };
```

**Usage**: Optional pre-check; `confirmScoutScholarship` remains the enforcement point.

---

## 8. Phase 9: URL Pre-Check (checkScholarshipByUrl)

**Purpose**: Avoid Tavily calls when scholarship URL already exists. Called before `startScoutProcess` when `input_type === "url"`.

**Query**: `checkScholarshipByUrl(url: string, userId: string)`

**Returns**:
```ts
| { exists: true; alreadyTracked: true; scholarshipId: string; applicationId?: string }
| { exists: true; alreadyTracked: false; scholarship: ScholarshipRow }  // user can add
| { exists: false }
```

**Logic**: SELECT from scholarships WHERE url = $1. If found, check applications for (user_id, scholarship_id, academic_year). If application exists → alreadyTracked. Else → return scholarship for short-circuit (map to ExtractedScholarshipData, create scout_run with result, skip Tavily).
