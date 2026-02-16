# Data Model: Coach Execution Engine

**Branch**: `005-coach-execution-engine` | **Date**: 2025-02-13  
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Overview

This feature extends the existing data layer with Coach Execution Engine artifacts. It does **not** change the `application_status` enum (002); it adds mapping logic, new tables for notifications and check-ins, and extends orchestration state. Coach lifecycle states live in orchestration; DB remains canonical.

---

## 1. Coach State ↔ DB Mapping (Bidirectional)

| Coach State (Orchestration) | DB application_status | Notes |
|-----------------------------|----------------------|-------|
| Tracked | draft | First added |
| Drafting | draft | Student editing |
| Review | draft | Ready for review |
| Submitted | submitted | After HITL confirmation |
| Outcome Pending | submitted | Awaiting result; metadata flag |
| Won | awarded | After HITL confirmation |
| Lost | rejected | No HITL for rejection |

**Mapping layer**: Implement in `packages/database` or `apps/agent/lib/coach/` as pure functions: `coachStateToDb()`, `dbToCoachState()`. Used on read/write to applications.

---

## 2. New Table: notification_log

Enforces FR-010 (max one email + one dashboard nudge per student per 24h).

| Field | Type | Constraints | Notes |
|-------|------|--------------|-------|
| id | uuid | PK, default gen_random_uuid() | |
| user_id | uuid | NOT NULL, FK → auth.users | |
| channel | notification_channel | NOT NULL | email \| dashboard_toast |
| sent_at | timestamptz | NOT NULL, default now() | |
| notification_type | text | nullable | deadline_72h \| deadline_24h \| micro_task \| top3 \| etc. |
| template_name | text | nullable | Template used (for SC-008 auditability; content reconstructable from templates) |
| application_ids | uuid[] | nullable | For deadline: which apps in consolidated email |

**Enum `notification_channel`**: `email`, `dashboard_toast`.

**Unique**: None. Query pattern: `SELECT 1 FROM notification_log WHERE user_id = $1 AND channel = 'email' AND sent_at > now() - interval '24 hours' LIMIT 1`. If row exists, skip send.

**Index**: `(user_id, channel, sent_at DESC)` for efficient 24h window check.

**RLS**: Service-role or Coach workflows only; users cannot read/write directly.

---

## 3. New Table: check_in_tasks

FR-011: Check-in 21 days after submission.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK, default gen_random_uuid() | |
| user_id | uuid | NOT NULL, FK → auth.users | |
| application_id | uuid | NOT NULL, FK → applications(id) | |
| due_at | timestamptz | NOT NULL | submitted_at + 21 days |
| status | check_in_status | NOT NULL, default 'pending' | pending \| completed \| dismissed |
| created_at | timestamptz | NOT NULL, default now() | |
| completed_at | timestamptz | nullable | Set when status = completed |

**Enum `check_in_status`**: `pending`, `completed`, `dismissed`.

**Unique**: (user_id, application_id) — one check-in per application per submission.

**RLS**: User can read/update only own rows (user_id = auth.uid()).

**Index**: `(user_id)`, `(due_at)` for batch scheduling queries.

---

## 4. New Table: application_snoozes (or user_preferences JSONB)

FR-013b: Snooze Micro-Task; must not extend past due date.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK, default gen_random_uuid() | |
| user_id | uuid | NOT NULL, FK → auth.users | |
| snoozed_until | timestamptz | NOT NULL | Must be < nearest app deadline |
| created_at | timestamptz | NOT NULL, default now() | |

**Alternative**: Add `profiles.preferences` JSONB: `{ micro_task_snoozed_until: string }`. Simpler; no new table.

**Decision**: Use `user_preferences` or extend `profiles` with `preferences` JSONB. Avoid new table if possible; 002 profiles already has updated_at.

---

## 5. Extend applications (if needed)

Per 002, `applications` has `status`, `momentum_score` (formerly priority_score). Add if missing:

| Field | Type | Notes |
|-------|------|-------|
| momentum_score | numeric(5,2) | nullable. Coach prioritization; (Deadline Proximity × 0.6) + (Trust Score × 0.4). |
| submitted_at | timestamptz | nullable. Set when status → submitted (after HITL confirm). Used for 21-day check-in. |
| last_progress_at | timestamptz | nullable. Updated on every status change (content save out of scope). For 48h staleness. |
| confirmed_at | timestamptz | nullable. Set when user confirms Won (HITL). 006 Debt Lifted sums only awarded + confirmed_at IS NOT NULL. |

**Migration**: Add columns if not in 002. Check 002 data-model for current schema.

---

## 6. Extend scholarships (for FR-009a prioritization)

| Field | Type | Notes |
|-------|------|-------|
| application_type | text | nullable. 'essay' \| 'form' \| 'mixed'. Or in metadata JSONB. |

If 002 scholarships has `metadata` JSONB, store `metadata.application_type` instead of new column.

---

## 7. Total Debt Lifted

**Option A** (aligned with 006): Compute on read: `SELECT COALESCE(SUM(s.amount), 0) FROM applications a JOIN scholarships s ON a.scholarship_id = s.id WHERE a.user_id = $1 AND a.status = 'awarded' AND a.confirmed_at IS NOT NULL`.

**Option B**: Add `profiles.total_debt_lifted` numeric, updated only after HITL confirmation.

**Decision**: Defer to implementation. If 002 profiles exists, Option B reduces query load. Need `confirmed_at` or equivalent on applications to track HITL.

---

## 8. TuitionLiftState / active_milestones Extension

Per 003, `active_milestones` is `ActiveMilestone[]`. Coach Execution Engine populates it with:

- Top 3 Game Plan: top 3 by Momentum Score
- Check-in tasks: when due
- Micro-Task suggestion: when 48h stale and not snoozed

Extend `ActiveMilestone` or add `CoachContext`:

| Field | Type | Notes |
|-------|------|-------|
| type | string | 'application' \| 'check_in' \| 'micro_task' |
| application_id | uuid | nullable; for application milestones |
| check_in_task_id | uuid | nullable; for check-in |
| momentum_score | number | For application milestones |
| due_at | timestamp | For deadline ordering |
| snoozed_until | timestamp | For micro-task; null if not snoozed |

Implementation: Extend 003 ActiveMilestone schema or add sibling `coach_suggestions` in state.

---

## 9. Zod Schemas (Validation)

- `NotificationLogSchema` — user_id, channel, sent_at, notification_type
- `CheckInTaskSchema` — user_id, application_id, due_at, status
- `CoachStateMappingSchema` — validate Coach state strings against allowed set
- `MomentumScoreSchema` — deadline_proximity 0–1, trust_score 0–1

---

## 10. Migrations Summary

| Migration | Purpose |
|-----------|---------|
| 005_notification_log | Create notification_log table |
| 005_check_in_tasks | Create check_in_tasks table |
| 005_applications_extend | Add momentum_score, submitted_at, last_progress_at, confirmed_at if missing (per 002 FR-013a) |
| 005_profiles_preferences | Add preferences JSONB for snooze if using profiles |

Exact migration names follow 002 conventions.
