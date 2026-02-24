# Scout API Contract

**Branch**: `007-scout-vision-ingestion` | **Date**: 2025-02-18

## Overview

Scout is triggered by user-submitted URL, name, or file. The flow: (1) Client uploads file (if any) via Server Action; (2) Client calls Scout process API with input; (3) Client polls status until complete; (4) Client displays verification form; (5) Client calls confirm Server Action to persist.

---

## 1. POST /api/scout/process

Starts a Scout run. Request body (JSON):

```json
{
  "input_type": "url" | "name" | "file",
  "url": "https://...",           // when input_type=url
  "name": "Coca-Cola Scholarship", // when input_type=name
  "file_path": "user_id/uuid.pdf"  // when input_type=file (Supabase Storage path)
}
```

**Response** (201):
```json
{
  "run_id": "uuid",
  "message": "Scout started"
}
```

**Errors**: 400 (invalid input), 401 (unauthenticated), 413 (file too large if path references oversized file), 500

---

## 2. GET /api/scout/status/:runId

Returns current Scout run status. Used for polling.

**Response** (200):
```json
{
  "run_id": "uuid",
  "step": "reading_document" | "searching_sources" | "calculating_trust" | "complete" | "error",
  "message": "Coach or Advisor persona message",
  "result": { ... }  // ExtractedScholarshipData when step=complete; null otherwise
}
```

**Result shape** (when step=complete):
```json
{
  "title": "string",
  "amount": number | null,
  "deadline": "YYYY-MM-DD" | null,
  "eligibility": "string" | null,
  "url": "string" | null,
  "trust_score": 0-100,
  "research_required": { "title": boolean, "amount": boolean, ... },
  "verification_status": "verified" | "ambiguous_deadline" | "potentially_expired" | "needs_manual_review",
  "scoring_factors": { "domain_tier": "...", "longevity_score": number, "fee_check": "..." } | null,
  "trust_report": "string" | null
}
```
`scoring_factors` and `trust_report` from TrustScorer when URL verified; used by confirmScoutScholarship for ScholarshipMetadata mapping.

**Errors**: 404 (run not found), 401, 403 (run belongs to other user)

---

## 3. Scout Confirm (Server Action)

Not a route—Server Action `confirmScoutScholarship(data: ExtractedScholarshipData)`:
- Validates input with Zod
- Runs fuzzy match check against user's applications
- If duplicate: return `{ success: false, duplicate: true, existingTitle: "..." }`
- Otherwise: upsert scholarship, insert application, return `{ success: true, scholarshipId, applicationId }`

---

## 4. File Upload (Server Action)

`uploadScoutFile(formData: FormData)`:
- Validates file type (PDF, PNG, JPG)
- Validates size ≤ 10 MB
- Uploads to `scout_uploads/{user_id}/{uuid}.{ext}`
- Returns `{ success: true, path: "..." }` or `{ success: false, error: "..." }`
