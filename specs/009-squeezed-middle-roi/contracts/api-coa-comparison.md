# COA Comparison API Contract

**Branch**: `009-squeezed-middle-roi` | **Date**: 2025-02-24  
**Spec**: [spec.md](../spec.md)

## Overview

APIs for SAI vs. average COA of saved schools, Need-to-Merit transition visualization, and saved-schools CRUD. Per FR-011: COA − SAI = Financial Need; positive = need-based eligible, zero/negative = merit-based.

---

## 1. GET /api/coa/comparison

**Purpose**: Fetch SAI vs. average COA of saved schools; compute per-school and average demonstrated need; indicate Need-to-Merit transition zone. Used for financial aid profile view.

**Auth**: Authenticated student.

**Response 200** (student has saved schools with COA):
```json
{
  "sai": 35000,
  "awardYear": 2026,
  "averageCoa": 32000,
  "needToMeritZone": "merit_based",
  "savedSchools": [
    {
      "institutionId": "uuid",
      "name": "Example University",
      "institutionType": "4_year",
      "coa": 34000,
      "financialNeed": -1000
    }
  ],
  "fallbackUsed": false
}
```

| Field | Type | Notes |
|-------|------|-------|
| sai | number | Decrypted profiles.sai |
| awardYear | number | profiles.award_year |
| averageCoa | number | Mean of institutions.coa for saved schools (null if none) |
| needToMeritZone | string | "need_based" \| "merit_based" — from averageCoa − sai sign |
| savedSchools | array | Per-school COA and financialNeed (coa − sai) |
| fallbackUsed | boolean | true when no saved schools; response uses sai_zone_config instead |

**Response 200** (no saved schools—fallback):
```json
{
  "sai": 35000,
  "awardYear": 2026,
  "averageCoa": null,
  "needToMeritZone": "merit_based",
  "savedSchools": [],
  "fallbackUsed": true,
  "fallbackMessage": "Add saved schools to see your Need-to-Merit transition"
}
```

**Fallback**: When `savedSchools` is empty or institutions lack COA, use sai_zone_config (merit_lean_threshold) for zone determination; include fallbackMessage in response.

---

## 2. POST /api/coa/saved-schools

**Purpose**: Student saves an institution for COA comparison.

**Auth**: Authenticated student.

**Request**:
```json
{
  "institutionId": "uuid"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| institutionId | uuid | yes | Must exist in institutions table |

**Response 201**:
```json
{
  "success": true,
  "institutionId": "uuid"
}
```

**Response 400**: Invalid or missing institutionId, institution not found.  
**Response 409**: Institution already saved (idempotent—treat as success).

---

## 3. DELETE /api/coa/saved-schools

**Purpose**: Student removes an institution from saved schools.

**Auth**: Authenticated student.

**Request**:
```json
{
  "institutionId": "uuid"
}
```

**Response 200**:
```json
{ "success": true }
```

**Response 404**: Saved school not found for current user.

---

## 4. GET /api/coa/saved-schools

**Purpose**: List student's saved schools with institution details for COA comparison.

**Auth**: Authenticated student.

**Response 200**:
```json
{
  "savedSchools": [
    {
      "institutionId": "uuid",
      "name": "Example CC",
      "institutionType": "community_college",
      "state": "CA",
      "coa": 12000,
      "stickerPrice": 14000,
      "netPrice": 10000,
      "savedAt": "2026-02-24T12:00:00Z"
    }
  ]
}
```

| Field | Type | Notes |
|-------|------|-------|
| savedSchools | array | user_saved_schools joined with institutions |
| coa | number \| null | Cost of Attendance |
| stickerPrice | number \| null | Sticker price |
| netPrice | number \| null | Net price (after aid) |
