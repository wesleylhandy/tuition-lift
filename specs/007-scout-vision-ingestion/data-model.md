# Data Model: Scout Vision Ingestion

**Branch**: `007-scout-vision-ingestion` | **Date**: 2025-02-18  
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Overview

Scout adds **manual** scholarship ingestion via URL, name, or file upload. It does not extend the main discovery flow (Advisor_Search/Advisor_Verify). Data flows: (1) Scout state holds `temp_extracted_data` until user confirms; (2) On confirm, scholarship + application are created via existing `scholarships` and `applications` tables. One new Storage bucket; one optional lightweight table for run status.

---

## 1. Scout State (In-Memory / Checkpoint)

Scout runs as a separate LangGraph flow. State schema for Scout subgraph:

| Field              | Type                    | Notes                                                |
|--------------------|-------------------------|------------------------------------------------------|
| scout_input        | ScoutInput              | URL, name, or file path (after upload)              |
| scout_step         | ScoutStep               | reading_document \| searching_sources \| calculating_trust |
| temp_extracted_data| ExtractedScholarshipData | Nullable; populated when extraction completes       |
| persona_message    | string \| null          | Coach or Advisor message for HUD                     |
| error              | string \| null           | Populated on failure                                 |

**ScoutInput** (embedded):
- `type`: `"url"` \| `"name"` \| `"file"`
- `url`: string (when type=url)
- `name`: string (when type=name)
- `file_path`: string (Supabase Storage path when type=file)

**ExtractedScholarshipData** (embedded):
- `title`: string
- `amount`: number | null
- `deadline`: string | null (ISO date)
- `eligibility`: string | null
- `url`: string | null
- `trust_score`: number (0–100)
- `research_required`: Record<keyof ExtractedScholarshipData, boolean> — which fields need user verification
- `verification_status`: "verified" | "ambiguous_deadline" | "potentially_expired" | "needs_manual_review"
- `scoring_factors`?: { domain_tier, longevity_score, fee_check } — from TrustScorer when URL verified
- `trust_report`?: string — from TrustScorer when URL verified

**ScoutStep** (enum): `reading_document`, `searching_sources`, `calculating_trust`, `complete`, `error`

---

## 2. scout_runs (Optional — for status polling)

If status polling is used without loading LangGraph checkpoints, a lightweight table stores run progress:

| Field       | Type        | Constraints                  | Notes                    |
|-------------|-------------|------------------------------|--------------------------|
| id          | uuid        | PK, default gen_random_uuid()| Run identifier           |
| user_id     | uuid        | NOT NULL, FK → auth.users     |                          |
| step        | text        | NOT NULL                     | ScoutStep enum value     |
| result      | jsonb       | nullable                     | ExtractedScholarshipData when complete |
| created_at  | timestamptz | NOT NULL, default now()       |                          |
| updated_at  | timestamptz | NOT NULL, default now()       |                          |

**RLS**: Authenticated users can SELECT/UPDATE only own rows (user_id = auth.uid()). INSERT on run start; UPDATE on step change.

**Rationale**: Enables `GET /api/scout/status/:runId` without invoking LangGraph. Alternative: use checkpoint thread_id and poll graph state; that avoids this table but adds agent overhead. For MVP, `scout_runs` simplifies UI polling.

---

## 3. scout_uploads (Supabase Storage Bucket)

- **Bucket name**: `scout_uploads`
- **Public**: false (private)
- **Path pattern**: `{user_id}/{uuid}.{ext}` (e.g., `abc123/550e8400-e29b-41d4-a716-446655440000.pdf`)
- **Policies**:
  - INSERT: authenticated, `bucket_id = 'scout_uploads' AND (storage.foldername(name))[1] = auth.uid()::text`
  - SELECT: same (user can read own files)
  - DELETE: same (optional cleanup)
- **Max file size**: 10 MB (configurable)
- **Allowed MIME**: `application/pdf`, `image/png`, `image/jpeg`

---

## 4. Consumed Entities (@repo/db)

| Entity        | Source      | Usage                                                          |
|---------------|-------------|----------------------------------------------------------------|
| scholarships  | 002         | Upsert on user confirm; TrustScorer + CycleVerifier from 004  |
| applications  | 002         | Insert on user confirm; user_id, scholarship_id, academic_year |
| profiles      | 002         | user_id for auth; not used in extraction                      |

**Scholarship creation**: Use `scholarship-upsert` pattern from 004 (upsert by URL when present; else insert new). Trust score, metadata, deadline from ExtractedScholarshipData.

**ExtractedScholarshipData → ScholarshipMetadata mapping** (for `upsertScholarship` in confirmScoutScholarship):
- `source_url`: `data.url ?? ""`
- `snippet`: `data.eligibility ?? ""` (or first 500 chars)
- `scoring_factors`: `data.scoring_factors` when present (from TrustScorer); else `{ domain_tier: "under_review", longevity_score: 0, fee_check: "pass" }`
- `trust_report`: `data.trust_report ?? "Manual Scout entry"`
- `categories`: infer from eligibility/title (e.g., need_based, merit, other) or `["other"]`
- `verification_status`: `data.verification_status`

**DiscoveryResult shape for upsert**: Map ExtractedScholarshipData to `{ id, title, url, trust_score, need_match_score: 0, content: eligibility, trust_report, verification_status, categories, deadline, amount }`. `need_match_score: 0` (no profile match for manual add).

**Application creation**: Insert with status `draft`; academic_year from `getCurrentAcademicYear()`.

---

## 5. Fuzzy Match Check (Application Logic)

Before save, query `applications` joined with `scholarships` for current user; get list of scholarship titles. Compare incoming title with `fuzzball.ratio()`; if any ≥ threshold (0.85), return duplicate warning. Not a table—logic in Server Action or Scout completion handler.

---

## 6. Zod Schemas

Add to agent or packages/db:
- `ScoutInputSchema`
- `ExtractedScholarshipDataSchema`
- `ScoutStepSchema`

Validation before writing to state or returning from API.
