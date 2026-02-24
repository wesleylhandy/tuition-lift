# Scout Server Actions Contract

**Branch**: `007-scout-vision-ingestion` | **Date**: 2025-02-18

## Overview

Server Actions in `apps/web/lib/actions/` for Scout flows. All require authentication.

---

## 1. uploadScoutFile

**Purpose**: Upload PDF/PNG/JPG to Supabase Storage for Scout extraction.

**Input**: `FormData` with key `file` (File object)

**Output**:
```ts
type UploadScoutFileResult = 
  | { success: true; path: string }
  | { success: false; error: string };
```

**Validation**:
- MIME: `application/pdf`, `image/png`, `image/jpeg`
- Size: ≤ 10 MB (SCOUT_MAX_FILE_SIZE_MB env)
- Reject with clear error: "Please upload PDF, PNG, or JPG only" / "File too large (max 10 MB)"

---

## 2. startScoutProcess

**Purpose**: Trigger Scout extraction/verification. Calls agent or internal API.

**Input**:
```ts
type ScoutProcessInput = 
  | { input_type: "url"; url: string }
  | { input_type: "name"; name: string }
  | { input_type: "file"; file_path: string };
```

**Output**:
```ts
type StartScoutProcessResult = 
  | { success: true; run_id: string }
  | { success: false; error: string };
```

---

## 3. confirmScoutScholarship

**Purpose**: Persist verified scholarship and application after user confirmation.

**Input**: `ExtractedScholarshipData` (user-edited) from verification form.

**Output**:
```ts
type ConfirmScoutResult = 
  | { success: true; scholarshipId: string; applicationId: string }
  | { success: false; error: string }
  | { success: false; duplicate: true; existingTitle: string };
```

**Logic**:
- Zod validate input
- Map ExtractedScholarshipData → DiscoveryResult + ScholarshipMetadata per data-model.md §4
- Fuzzy match: if similarity ≥ threshold with any existing user scholarship title → return duplicate
- If deadline in past → include `potentiallyExpired: true` in result; still allow save with warning
- Upsert scholarship (by URL if present; else insert) via 004 pattern
- Insert application (user_id, scholarship_id, academic_year, status=draft)
- Return ids

---

## 4. getScoutStatus (Optional — if not using API route)

If status is fetched via Server Action instead of API route:

**Input**: `run_id: string`

**Output**:
```ts
type ScoutStatusResult = 
  | { success: true; step: ScoutStep; message?: string; result?: ExtractedScholarshipData }
  | { success: false; error: string };
```

---

## Extensibility

- Add `validateScoutInput` shared helper for reuse across actions.
- `confirmScoutScholarship` can be extended to accept optional `source` (e.g., "scout_file", "scout_url") for analytics without changing contract.
- File upload could later support multiple files (array of paths) by extending `startScoutProcess` input; UI composition supports adding multi-file drop zone.
