# Research: Coach Execution Engine

**Branch**: `005-coach-execution-engine` | **Date**: 2025-02-13  
**Spec**: [spec.md](./spec.md)

## Resolved Technical Decisions

### 1. Inngest for Coach Automation (Cron + Event-Driven)

**Decision**: Use Inngest (already adopted in 003, 004) for all Coach Execution Engine workflows: daily Top 3 Game Plan, deadline sentinel (72h/24h), post-submission check-in (21 days), and stale-progress Micro-Task (48h).

**Rationale**: Constitution requires bypassing Vercel timeouts; 003 research established Inngest for discovery and daily prioritization. Coach workflows are cron-based and event-driven—Inngest supports both `cron` and `event` triggers. Single automation platform reduces ops and aligns with existing architecture.

**Alternatives considered**:
- Vercel Cron: Limited; no step functions or durable execution.
- Separate queue (Bull/BullMQ): Adds infrastructure; Inngest is serverless and integrated.

**Reference**: [Inngest - Create Function](https://www.inngest.com/docs/reference/functions/create), [Inngest - Cron Triggers](https://www.inngest.com/docs/guides/scheduled-cron-jobs)

---

### 2. Resend + React Email for Coach Notifications

**Decision**: Use Resend (already used in 001) with React Email for Coach notification templates. Templates support dynamic micro-copy for the Encouraging Coach persona (action-oriented, athletic metaphors, win-focused).

**Rationale**: Spec requires email notifications with Coach persona micro-copy; 001 already uses Resend. React Email provides component-based templates, type-safe props, and preview dev server—ideal for Coach-branded content that varies by context (deadline, Micro-Task, Top 3, etc.).

**Alternatives considered**:
- Plain HTML strings: Harder to maintain; no component reuse.
- MJML/Handlebars: React Email integrates with Resend; single templating stack.

**Reference**: [Resend Docs](https://resend.com/docs), [React Email](https://react.email/docs/introduction)

---

### 3. Lifecycle Mapping Layer (Coach States ↔ DB Enum)

**Decision**: Implement a bidirectional mapping layer in `packages/database` or `apps/agent` that converts between Coach orchestration states (Tracked, Drafting, Review, Submitted, Outcome Pending) and DB `application_status` enum (draft, submitted, awarded, rejected, withdrawn). Orchestration reads/writes Coach states; persistence uses DB enum.

**Rationale**: Spec clarification: Coach states live in orchestration; DB keeps existing enum. Mapping: Tracked/Drafting/Review → draft; Submitted → submitted; Outcome Pending → submitted (with `outcome_pending` flag or metadata); Won → awarded; Lost → rejected.

**Alternatives considered**:
- Extend DB enum: Requires migration; 002 schema is canonical.
- Orchestration-only states: Mapping layer keeps both worlds aligned without schema change.

**Reference**: [002 data-model.md](../002-db-core-infrastructure/data-model.md), [003 data-model.md](../003-langgraph-orchestration/data-model.md)

---

### 4. Notification Log for Frequency Limit (FR-010)

**Decision**: Add `notification_log` table to persist notification delivery per student. Columns: `user_id`, `channel` (email | dashboard_toast), `sent_at`. Query: "Has user received email in last 24h?" before sending. Enforces max one email and one dashboard nudge per student per 24 hours.

**Rationale**: FR-010 and FR-017 require notification delivery logging to enforce frequency limit. In-memory state is lost on serverless cold starts; DB-backed log is durable and queryable.

**Alternatives considered**:
- Redis/TLRU: Adds dependency; Supabase already available.
- Inngest step memoization: Not designed for cross-function rate limiting.

---

### 5. Check-in Task Scheduling (21 Days Post-Submission)

**Decision**: Use Inngest `step.sleepUntil()` or scheduled event to create a Check-in task 21 days after `submitted_at`. Store `check_in_tasks` (or extend `active_milestones`) with `application_id`, `due_at`, `status` (pending | completed). Coach surfaces via dashboard/game plan when due.

**Rationale**: FR-011 requires automatic Check-in 21 days after submission. Inngest supports `step.sleepUntil(timestamp)` for delayed execution; alternative: cron job that queries applications with `submitted_at` 21 days ago and creates tasks.

**Alternatives considered**:
- Vercel Edge Config: No durable scheduling.
- External scheduler: Inngest handles it; fewer services.

**Reference**: [Inngest - step.sleepUntil](https://www.inngest.com/docs/reference/functions/step-sleep-until)

---

### 6. Momentum Score (Trust Score + Composite Deadline Proximity)

**Decision**: Trust Score = scholarship.trust_score (Reputation Engine; 0–100). Normalize to 0–1. Deadline Proximity = composite of (a) time-to-deadline (e.g., `1 - hours_until_deadline / max_hours`) and (b) application stage (Review > Drafting > Tracked; e.g., 1.0, 0.6, 0.3). Combine into single 0–1 urgency score. Formula: `(deadline_proximity * 0.6) + (trust_score * 0.4)`. Quadrant logic: high trust + high urgency = best; low trust deprioritizes even when urgent.

**Rationale**: Spec clarification: Trust Score = source trustworthiness; Deadline Proximity = time + stage. 0–1 normalization keeps weights interpretable.

---

### 7. Snooze Storage for Micro-Task (FR-013b)

**Decision**: Store snooze in `application_snoozes` or `user_preferences` (JSONB): `{ micro_task_snoozed_until: timestamp }`. Before suggesting Micro-Task, check: (1) 48h since last progress, (2) not snoozed, or snoozed_until passed, (3) snoozed_until < nearest application deadline.

**Rationale**: FR-013b requires snooze not to extend beyond action item due dates. Per-application deadline is the cap; store snooze per user or per application.

---

### 8. Application Requirements for Deadline Prioritization (FR-009a)

**Decision**: Derive application type (essay vs form) from scholarship metadata or application fields. If `scholarships` has `application_type` or `metadata.requires_essay`, use it. Otherwise default to "form". Prioritization: essays ordered before forms when deadlines are similar (essays need more lead time).

**Rationale**: Spec clarification: consolidated email includes prioritization based on requirements (essays need more time than forms). Scholarship metadata or discovery results may contain this; add column if missing.

---

### 9. Dashboard Toast Delivery

**Decision**: Use Supabase Realtime or polling on a `user_notifications` (or `notification_log`) table. When deadline/ Micro-Task notification is sent, insert row with `channel: 'dashboard_toast'`, `user_id`, `created_at`. Frontend subscribes or polls; on new row, show toast. Respect 24h limit: only one toast per 24h per user.

**Rationale**: FR-009 requires in-dashboard toast. 003 uses discovery_completions for similar pattern; reuse or extend for Coach notifications.

---

### 10. Total Debt Lifted Storage

**Decision**: Store `total_debt_lifted` as computed aggregate from `applications` where `status = 'awarded'` and confirmation received, or add `profiles.total_debt_lifted` updated only after HITL confirmation. Per spec, dashboard total is updated only when user confirms Won.

**Rationale**: FR-006, FR-007: Total Debt Lifted updated only after confirmation. Either compute on read from confirmed awards or persist on profiles; plan defers to 002/003 schema—add column or view if needed.

---

### 11. Progress Scope (Status Change Only)

**Decision**: For 005 scope, "progress" = status change only. Update last_progress_at when application status changes. Application content tracking and external submission coordination are out of scope (deferred to a future feature).

**Rationale**: Spec clarification: coordinating external application submissions with the app requires its own feature. 005 records progress from status transitions only.

---

### 12. active_milestones Immediate Sync (FR-005)

**Decision**: Update active_milestones in the same flow as the status change—within the API handler that persists the status change (e.g., POST /api/coach/application/status, POST /api/coach/confirm-outcome). Do not defer to the next daily game plan cron.

**Rationale**: Spec clarification: updates MUST occur immediately in the same flow. Ensures game plan reflects current state without delay.

---

### 13. Auditability (SC-008)

**Decision**: notification_log stores notification_type, and optionally template_name (or template_id) used. Content can be reconstructed from React Email templates for persona consistency spot checks. No full content storage required.

**Rationale**: Spec clarification: metadata (type, template, timestamp) suffices; templates are versioned in code.
