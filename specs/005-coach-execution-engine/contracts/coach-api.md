# Coach Execution Engine API Contract

**Branch**: `005-coach-execution-engine` | **Date**: 2025-02-13  
**Spec**: [spec.md](../spec.md)

## Overview

APIs for the Coach Execution Engine: Top 3 Game Plan, application lifecycle with HITL verification, Check-in completion, and Micro-Task snooze. Automation runs via Inngest; these endpoints provide the sync interface for the frontend.

---

## 1. GET /api/coach/game-plan

**Purpose**: Retrieve daily Top 3 Game Plan or zero-apps suggestion (FR-001, FR-001a).

**Auth**: Authenticated user required.

**Query**:
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| (none) | | | Uses auth user |

**Response 200** (with tracked applications):
```json
{
  "top3": [
    {
      "applicationId": "uuid",
      "scholarshipTitle": "string",
      "momentumScore": 0.85,
      "deadline": "2025-03-15",
      "coachState": "Drafting",
      "suggestion": "5 minutes on the intro today"
    }
  ],
  "generatedAt": "2025-02-13T06:00:00Z"
}
```

**Response 200** (zero tracked applications—FR-001a):
```json
{
  "top3": [],
  "suggestion": "Add applications or run discovery to get your game plan.",
  "generatedAt": "2025-02-13T06:00:00Z"
}
```

---

## 2. POST /api/coach/application/status

**Purpose**: Request status transition (Tracked → Drafting → Review → Submitted, etc.). For Submitted and Won, triggers HITL confirmation flow (FR-006).

**Auth**: Authenticated user (own application only).

**Request**:
```json
{
  "applicationId": "uuid",
  "targetState": "Submitted" | "Drafting" | "Review" | "Outcome Pending" | "Won" | "Lost"
}
```

**Response 200** (immediate transition, e.g., Drafting):
```json
{
  "success": true,
  "applicationId": "uuid",
  "currentState": "Drafting"
}
```

**Response 200** (requires HITL—Submitted or Won):
```json
{
  "success": true,
  "requiresConfirmation": true,
  "applicationId": "uuid",
  "targetState": "Submitted",
  "message": "Please confirm you've submitted this application."
}
```

**Response 400**: Invalid transition (e.g., Submitted → Drafting).

**Response 403**: Application not owned by user.

---

## 3. POST /api/coach/confirm-outcome

**Purpose**: HITL confirmation for Submitted or Won (FR-006, FR-006a, FR-007). Called when user confirms in the Coach prompt.

**Auth**: Authenticated user.

**Request**:
```json
{
  "applicationId": "uuid",
  "confirmed": true,
  "outcomeType": "Submitted" | "Won"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| applicationId | uuid | yes | Application in question |
| confirmed | boolean | yes | User confirmed |
| outcomeType | string | yes | "Submitted" or "Won" |

**Response 200** (confirmed):
```json
{
  "success": true,
  "applicationId": "uuid",
  "status": "Submitted",
  "totalDebtLiftedUpdated": false
}
```

For `outcomeType: "Won"`, `totalDebtLiftedUpdated: true` when Total Debt Lifted was updated.

**Response 200** (declined):
```json
{
  "success": false,
  "message": "Confirmation declined. No changes made."
}
```

---

## 4. POST /api/coach/check-in/complete

**Purpose**: Mark Check-in task as completed or dismissed (FR-011, FR-012). When completed with Won, triggers verification protocol.

**Auth**: Authenticated user.

**Request**:
```json
{
  "checkInTaskId": "uuid",
  "action": "completed" | "dismissed",
  "outcome": "Won" | "Lost" | null
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| checkInTaskId | uuid | yes | From check_in_tasks |
| action | string | yes | completed or dismissed |
| outcome | string | no | Required if action=completed; triggers status update |

**Response 200**:
```json
{
  "success": true,
  "checkInTaskId": "uuid",
  "status": "completed",
  "requiresConfirmation": true
}
```

If outcome=Won, `requiresConfirmation` signals frontend to show HITL prompt.

---

## 5. POST /api/coach/micro-task/snooze

**Purpose**: Snooze Micro-Task suggestion (FR-013b). Snooze must not extend past nearest action item due date.

**Auth**: Authenticated user.

**Request**:
```json
{
  "snoozedUntil": "2025-02-14T12:00:00Z"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| snoozedUntil | string (ISO 8601) | yes | Must be < nearest application deadline |

**Response 200**:
```json
{
  "success": true,
  "snoozedUntil": "2025-02-14T12:00:00Z"
}
```

**Response 400**: snoozedUntil exceeds nearest deadline.

---

## 6. GET /api/coach/notifications

**Purpose**: Poll for dashboard toasts (deadline, Micro-Task). Respects 24h limit (FR-010).

**Auth**: Authenticated user.

**Query**:
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| since | string (ISO 8601) | no | Return only notifications after this time |

**Response 200**:
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "deadline_72h" | "deadline_24h" | "micro_task" | "check_in",
      "title": "string",
      "body": "string",
      "applicationIds": ["uuid"],
      "createdAt": "2025-02-13T12:00:00Z"
    }
  ]
}
```

---

## 7. Inngest Events (Internal)

| Event Name | Trigger | Payload |
|------------|----------|---------|
| tuition-lift/coach.game-plan.daily | Cron (e.g., 6 AM daily) | { } |
| tuition-lift/coach.deadline.check | Cron (e.g., every hour) | { } |
| tuition-lift/coach.check-in.schedule | On application status → Submitted | { userId, applicationId, dueAt } |
| tuition-lift/coach.micro-task.check | Cron (e.g., every 4h) | { } |
| tuition-lift/coach.progress.recorded | On status change or save | { userId, applicationId } |

---

## 8. Dependency Direction

```
apps/web     ──calls──►  /api/coach/*
apps/agent   ──receives──►  Inngest Coach events
Inngest      ──triggers──►  Coach workflows (game plan, deadline, check-in, micro-task)
packages/database  ──used by──►  apps/agent, apps/web
```
