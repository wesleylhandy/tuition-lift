# Server Actions Contract: Scholarship Inbox & Dashboard

**Branch**: `006-scholarship-inbox-dashboard` | **Date**: 2025-02-13

## Overview

All state transitions (Track, Dismiss, Verify Submission) use Next.js Server Actions. Actions return `{ success: boolean; error?: string }`. Client shows toast on error with retry option.

---

## 1. trackScholarship

**Purpose**: Add a scholarship to the user's tracked applications.

**Signature**:
```typescript
async function trackScholarship(
  scholarshipId: string,
  academicYear: string
): Promise<{ success: boolean; error?: string }>
```

**Input**:
- `scholarshipId`: uuid (FK → scholarships.id)
- `academicYear`: string, format "YYYY-YYYY"

**Behavior**:
- Validate user is authenticated (auth.uid()).
- Validate scholarship exists and is active (trust_score > 0, deadline not past).
- Insert into `applications` (user_id, scholarship_id, academic_year, status: 'draft').
- On unique conflict (user already tracks this scholarship for this year), return success (idempotent).

**Errors**:
- Unauthenticated → `{ success: false, error: "Not authenticated" }`
- Invalid scholarship / not found → `{ success: false, error: "Scholarship not found or inactive" }`
- Validation failure → `{ success: false, error: "<message>" }`

---

## 2. dismissScholarship

**Purpose**: Soft-dismiss a scholarship from the Match Inbox for the current discovery run.

**Signature**:
```typescript
async function dismissScholarship(
  scholarshipId: string,
  discoveryRunId?: string | null
): Promise<{ success: boolean; error?: string }>
```

**Input**:
- `scholarshipId`: uuid (FK → scholarships.id)
- `discoveryRunId`: optional uuid; when DiscoveryResult includes discovery_run_id (003), MUST pass it to scope dismiss to this run.

**Behavior**:
- Validate user is authenticated.
- Insert into `dismissals` (user_id, scholarship_id, discovery_run_id, dismissed_at).
- Idempotent: if row exists, return success.

**Errors**:
- Unauthenticated → `{ success: false, error: "Not authenticated" }`

---

## 3. verifySubmission

**Purpose**: Mark an application as Submitted after user confirmation (per Coach verification protocol).

**Signature**:
```typescript
async function verifySubmission(
  applicationId: string,
  confirmed: boolean
): Promise<{ success: boolean; error?: string }>
```

**Input**:
- `applicationId`: uuid (FK → applications.id)
- `confirmed`: boolean; when true, update status to 'submitted'; when false, no-op (user declined).

**Behavior**:
- Validate user owns application (user_id = auth.uid()).
- If confirmed: update applications set status = 'submitted', updated_at = now() where id = applicationId and status in ('draft', ...).
- Validate transition per Coach Execution Engine lifecycle.

**Errors**:
- Unauthenticated / not owner → `{ success: false, error: "Not authorized" }`
- Invalid transition → `{ success: false, error: "Invalid status transition" }`

---

## Usage (Client)

```typescript
const [pending, startTransition] = useTransition();

const handleTrack = () => {
  startTransition(async () => {
    const result = await trackScholarship(scholarshipId, academicYear);
    if (!result.success) {
      toast.error(result.error, { action: { label: "Retry", onClick: () => handleTrack() } });
    }
  });
};
```
