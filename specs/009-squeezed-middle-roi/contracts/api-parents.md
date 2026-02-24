# Parent & ROI Auditor API Contract

**Branch**: `009-squeezed-middle-roi` | **Date**: 2025-02-24  
**Spec**: [spec.md](../spec.md)

## Overview

APIs for parent-student linking, parent contributions (income, manual scholarships), and ROI comparison data. Parent role enforced via RLS and Server Action validation.

---

## 1. POST /api/parents/link

**Purpose**: Student links parent by email. Creates parent_students link; parent account created if needed. Parent gains access when they sign in.

**Auth**: Authenticated student.

**Request**:
```json
{
  "parentEmail": "parent@example.com"
}
```

| Field        | Type   | Required | Notes                          |
|--------------|--------|----------|--------------------------------|
| parentEmail  | string | yes      | Valid email; parent account created if needed (minimal flow: link record created; parent logs in later) |

**Response 201**:
```json
{
  "success": true,
  "linkId": "uuid",
  "parentId": "uuid"
}
```

**Response 400**: Invalid email, already linked.

---

## 2. DELETE /api/parents/link

**Purpose**: Student unlinks parent. Per FR-009, parent loses access immediately.

**Auth**: Authenticated student.

**Request**:
```json
{
  "parentId": "uuid"
}
```

**Response 200**:
```json
{ "success": true }
```

**Response 404**: No link found.

---

## 3. POST /api/parents/contributions (Parent only)

**Purpose**: Parent adds income information or manual scholarship to linked student.

**Auth**: Authenticated parent (role=parent).

**Request**:
```json
{
  "studentId": "uuid",
  "contributionType": "income" | "manual_scholarship",
  "payload": {
    "amount": 50000,
    "source": "W-2"
  }
}
```
or
```json
{
  "contributionType": "manual_scholarship",
  "payload": {
    "title": "Local Rotary Scholarship",
    "amount": 2000,
    "deadline": "2026-03-15"
  }
}
```

**Response 201**:
```json
{ "success": true, "contributionId": "uuid" }
```

**Response 403**: Parent not linked to student.

---

## 4. GET /api/roi/comparison

**Purpose**: Fetch institutions and career outcomes for side-by-side ROI comparison (4-year vs alternative paths). Used by ROI Auditor (parent or student).

**Auth**: Authenticated user (student or linked parent).

**Query**:
| Param      | Type   | Required | Notes                           |
|------------|--------|----------|---------------------------------|
| student_id | uuid   | no       | Default: current user (student) or linked student (parent) |
| path_types | string | no       | Comma-separated: 4_year,community_college,trade_school |

**Response 200**:
```json
{
  "institutions": [
    {
      "id": "uuid",
      "name": "Example CC",
      "institutionType": "community_college",
      "state": "CA",
      "stickerPrice": 12000,
      "automaticMerit": 2000,
      "netPrice": 10000,
      "remainingConfirmed": 8000,
      "remainingIfPotential": 6000
    }
  ],
  "careerOutcomes": [...],
  "scholarshipSummary": {
    "awardedTotal": 2000,
    "potentialTotal": 2000
  }
}
```

`remainingConfirmed`: netPrice − awarded scholarships. `remainingIfPotential`: netPrice − awarded − potential (clearly labeled as "if awarded — not guaranteed" in UI). Per FR-004, avoid misrepresentation.

---

## 5. GET /api/merit/preference

**Purpose**: Read current merit filter preference (merit_only | show_all).

**Auth**: Authenticated student.

**Response 200**:
```json
{
  "meritFilterPreference": "merit_only" | "show_all",
  "saiAboveThreshold": true
}
```

---

## 6. PATCH /api/merit/preference

**Purpose**: Update merit filter preference. Per FR-001, user can toggle between Merit only and Show all.

**Auth**: Authenticated student.

**Request**:
```json
{
  "meritFilterPreference": "merit_only" | "show_all"
}
```

**Response 200**:
```json
{ "success": true }
```

---

## 7. Server Actions (Onboarding)

**saveAcademicProfile** (extended): Add `sat_total`, `act_composite`, `spikes` to input schema. Validate sat_total 400–1600, act_composite 1–36, spikes array max 10 items.

**New action**: `saveMeritFilterPreference(preference: 'merit_only' | 'show_all')` — updates profiles.merit_filter_preference or preferences JSONB.
