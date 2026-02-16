# Discovery & Orchestration API Contract

**Branch**: `003-langgraph-orchestration` | **Date**: 2025-02-13  
**Spec**: [spec.md](../spec.md)

## Overview

APIs for triggering scholarship discovery, polling status, HITL confirmation, and retrieving results. Discovery runs asynchronously via Inngest; these endpoints provide the sync interface for the frontend.

---

## 1. POST /api/discovery/trigger

**Purpose**: Start a new discovery run or return in-progress status (FR-013a).

**Auth**: Authenticated user required.

**Request**:
```json
{
  "useSaiRange": false
}
```

| Field       | Type    | Required | Notes                                                |
|-------------|---------|----------|------------------------------------------------------|
| useSaiRange | boolean | no       | If true, triggers HITL flow; requires prior confirmation |

**Response 200** (new run started):
```json
{
  "threadId": "user_abc123",
  "status": "running",
  "message": "Discovery in progress. You'll be notified when results are ready."
}
```

**Response 200** (already in progress—FR-013a):
```json
{
  "threadId": "user_abc123",
  "status": "running",
  "message": "Discovery already in progress. Refresh or check back for updates."
}
```

**Response 400**: Invalid request (e.g., profile incomplete).

---

## 2. GET /api/discovery/status

**Purpose**: Poll discovery status (FR-013b). Used for "Discovery in progress…" UI and to detect completion for notification.

**Auth**: Authenticated user.

**Query**:
| Param     | Type   | Required | Notes              |
|-----------|--------|----------|--------------------|
| thread_id | string | yes      | From trigger response |

**Response 200**:
```json
{
  "threadId": "user_abc123",
  "discoveryRunId": "uuid",
  "status": "running" | "completed" | "failed",
  "lastActiveNode": "Advisor_Discovery" | "Coach_Prioritization" | "SafeRecovery" | null,
  "completedAt": "2025-02-13T12:00:00Z" | null,
  "errorMessage": null
}
```

`discoveryRunId` (uuid): Per-run identifier; exposed for 006 dismissals scoping. Present when run has started.

On `status=completed`, frontend may show toaster/bell (FR-013b).

---

## 3. POST /api/discovery/confirm-sai

**Purpose**: HITL confirmation for SAI range filter (FR-016). Called when Coach asks user to approve using SAI bands in search.

**Auth**: Authenticated user.

**Request**:
```json
{
  "threadId": "user_abc123",
  "approved": true
}
```

| Field    | Type    | Required | Notes                    |
|----------|---------|----------|--------------------------|
| threadId | string  | yes      | Active discovery thread  |
| approved | boolean | yes      | User confirmation        |

**Response 200**:
```json
{
  "success": true,
  "message": "Search will use SAI range. Discovery continues."
}
```

If `approved: false`, Advisor proceeds with income tiers only.

---

## 4. GET /api/discovery/results

**Purpose**: Retrieve discovery results and active milestones for a thread.

**Auth**: Authenticated user (own thread only).

**Query**:
| Param     | Type   | Required | Notes   |
|-----------|--------|----------|---------|
| thread_id | string | yes      | Thread ID |

**Response 200**:
```json
{
  "discoveryRunId": "uuid",
  "discoveryResults": [
    {
      "id": "string",
      "discoveryRunId": "uuid",
      "title": "string",
      "url": "string",
      "trustScore": 85,
      "needMatchScore": 72
    }
  ],
  "activeMilestones": [
    {
      "id": "string",
      "scholarshipId": "uuid",
      "title": "string",
      "priority": 1,
      "status": "pending"
    }
  ]
}
```

`discoveryRunId` (top-level and per result): Per-run identifier for 006 dismissals scoping. Same value for all results in a run.

**Response 404**: Thread not found or not owned by user.

---

## 5. Inngest Events (Internal)

| Event Name                     | Trigger        | Payload                              |
|--------------------------------|----------------|--------------------------------------|
| tuition-lift/discovery.requested | POST trigger   | { userId, threadId, useSaiRange }    |
| tuition-lift/prioritization.scheduled | Cron (daily) | { } — batches active users           |

---

## Dependency Direction

```
apps/web     ──calls──►  /api/discovery/*
apps/agent   ──receives──►  Inngest events, invokes graph
Inngest      ──triggers──►  apps/agent (or apps/web) functions
```
