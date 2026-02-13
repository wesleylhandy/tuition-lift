# Feature Specification: Coach Execution Engine

**Feature Branch**: `005-coach-execution-engine`  
**Created**: 2025-02-13  
**Status**: Draft  
**Input**: User description: "Create the Coach Execution Engine: An automation and state-management system for TuitionLift."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Daily Top 3 Game Plan (Priority: P1)

A student with tracked scholarship applications receives a daily "Top 3 Game Plan"—the three applications they should focus on today—ranked by a Momentum Score that balances deadline urgency and progress trust. The Coach surfaces the right priorities so the student knows exactly where to spend their energy.

**Why this priority**: Core value—transforming a list of applications into an actionable daily focus. Without prioritization, students feel overwhelmed and lose momentum.

**Independent Test**: Can be fully tested by supplying applications with varying deadlines and trust scores, triggering daily prioritization, and verifying the Top 3 list respects the Momentum Score formula.

**Acceptance Scenarios**:

1. **Given** a student has multiple tracked applications, **When** the daily game plan is generated, **Then** the system produces a Top 3 list ordered by Momentum Score (Deadline Proximity × 0.6 + Trust Score × 0.4).
2. **Given** applications with different deadlines, **When** Momentum Score is calculated, **Then** applications with nearer deadlines receive higher weight in the ranking.
3. **Given** applications with different trust/progress levels, **When** Momentum Score is calculated, **Then** higher-trust applications receive higher weight in the ranking.
4. **Given** the daily game plan is produced, **When** the student views it, **Then** the Coach persona delivers it with action-oriented, athletic/coaching metaphors and win-focused language.

---

### User Story 2 - Application Lifecycle Management (Priority: P1)

A student tracks an application through clear stages: from first adding it (Tracked), to drafting (Drafting), to review-ready (Review), to submission (Submitted), to awaiting outcome (Outcome Pending). The system enforces valid transitions and reflects the current stage so both student and Coach know where each application stands.

**Why this priority**: State clarity prevents confusion; students and the Coach need a single source of truth for application progress.

**Independent Test**: Can be tested by moving an application through each stage and verifying only valid transitions succeed; invalid transitions are rejected.

**Acceptance Scenarios**:

1. **Given** a new application is added, **When** it is first tracked, **Then** its status is Tracked.
2. **Given** an application in Tracked status, **When** the student begins editing, **Then** it may transition to Drafting.
3. **Given** an application in Drafting, **When** the student marks it ready for review, **Then** it transitions to Review.
4. **Given** an application in Review, **When** the student submits it, **Then** it transitions to Submitted.
5. **Given** an application in Submitted, **When** an outcome is awaited (decision not yet known), **Then** it may transition to Outcome Pending.
6. **Given** any status change attempt, **When** the transition is invalid per the lifecycle, **Then** the system rejects the change and retains the previous status.
7. **Given** an application status changes, **When** the update is persisted, **Then** the shared orchestration state (active_milestones) and the data layer remain consistent.

---

### User Story 3 - Human-in-the-Loop Verification for Outcomes (Priority: P1)

When a student marks an application as Submitted or Won, the Coach requires explicit student confirmation before updating the "Total Debt Lifted" dashboard. This prevents accidental or premature updates and keeps financial totals accurate.

**Why this priority**: Financial accuracy and user trust—dashboard totals must reflect confirmed outcomes only.

**Independent Test**: Can be tested by attempting to update Submitted or Won status and verifying the Coach prompts for confirmation before any dashboard total is updated.

**Acceptance Scenarios**:

1. **Given** a student marks an application as Submitted, **When** the system processes the update, **Then** the Coach prompts the student to confirm before recording the submission.
2. **Given** a student marks an application as Won, **When** the system processes the update, **Then** the Coach prompts the student to confirm before updating Total Debt Lifted.
3. **Given** the student confirms, **When** confirmation is received, **Then** the relevant totals and status are updated.
4. **Given** the student declines or dismisses the confirmation, **When** no confirmation is received, **Then** Total Debt Lifted and related dashboard values are not updated.

---

### User Story 4 - Deadline Urgency Notifications (Priority: P2)

A student receives urgent notifications when an application deadline is 72 hours away and again at 24 hours. Notifications are delivered via email and an in-dashboard toast so the student cannot miss them.

**Why this priority**: Deadline awareness prevents missed opportunities; urgent nudges at critical moments increase submission rates.

**Independent Test**: Can be tested by setting application deadlines 72 and 24 hours in the future, triggering the scheduled checks, and verifying notifications are sent at each threshold.

**Acceptance Scenarios**:

1. **Given** an application deadline is 72 hours away, **When** the scheduled check runs, **Then** the student receives an urgent notification via email and an in-dashboard toast.
2. **Given** an application deadline is 24 hours away, **When** the scheduled check runs, **Then** the student receives an urgent notification via email and an in-dashboard toast.
3. **Given** multiple applications share the same urgency window, **When** notifications are sent, **Then** the system respects the notification frequency limit (no more than one email and one dashboard nudge per student per 24 hours).
4. **Given** a notification is delivered, **When** it is sent, **Then** the Coach persona uses urgent, action-oriented language appropriate to the deadline.

---

### User Story 5 - Post-Submission Follow-up (Priority: P2)

Twenty-one days after a student marks an application as Submitted, the system automatically schedules a "Check-in" task. The Coach uses this to prompt the student: "Have you heard back? Any updates?" This keeps the student engaged and surfaces outcome data for dashboard updates.

**Why this priority**: Post-submission engagement improves outcome tracking and re-engages students who may have moved on.

**Independent Test**: Can be tested by marking an application as Submitted, advancing time to 21 days later, and verifying a Check-in task is created and surfaced to the student.

**Acceptance Scenarios**:

1. **Given** a student marks an application as Submitted, **When** 21 days pass, **Then** the system schedules a Check-in task for that application.
2. **Given** a Check-in task exists, **When** the student views their game plan or dashboard, **Then** the Coach surfaces the Check-in prompt (e.g., "Have you heard back? Any updates?").
3. **Given** the student completes the Check-in (e.g., reports Won or Lost), **When** they respond, **Then** the system may update status and, if Won, trigger the verification protocol.

---

### User Story 6 - Stale Progress Micro-Task Suggestion (Priority: P3)

When a student has made no progress on any application for 48 hours, the Coach suggests a Micro-Task—a small, low-friction action (e.g., "Just spend 5 minutes on the intro today") to rekindle momentum.

**Why this priority**: Reduces abandonment; small wins break through inertia and help students re-engage.

**Independent Test**: Can be tested by simulating 48 hours of no activity and verifying the Coach suggests a Micro-Task with the Encouraging Coach tone.

**Acceptance Scenarios**:

1. **Given** no progress has been made on any application for 48 hours, **When** the Coach evaluates the student's state, **Then** the Coach suggests a Micro-Task (e.g., time-bound, small-scope action).
2. **Given** a Micro-Task suggestion is made, **When** it is delivered, **Then** the Coach uses the Encouraging Coach persona: action-oriented, athletic metaphors, win-focused.

---

### Edge Cases

- What happens when a student has fewer than 3 tracked applications? The Top 3 Game Plan includes only the available applications; ranking still uses Momentum Score.
- What happens when two applications have identical Momentum Scores? A deterministic tie-breaker (e.g., earlier deadline first) is used; both are ranked consistently.
- What happens when notification delivery fails (email bounce, etc.)? The notification is logged; the dashboard toast remains the fallback channel; retry or escalation behavior is implementation-defined.
- What happens when the student has multiple applications with deadlines in the same 72-hour or 24-hour window? The system consolidates into a single notification per 24-hour period per student to respect the frequency limit.
- What happens when a student never confirms a Won status? Total Debt Lifted is not updated; the application may remain in Outcome Pending until confirmation or manual correction.
- What happens when 48 hours of no progress is detected but the student has no applications in Drafting? The Coach may suggest adding a new application or another Micro-Task appropriate to the current state.

## Requirements *(mandatory)*

### Functional Requirements

**Momentum Algorithm**
- **FR-001**: System MUST generate a daily Top 3 Game Plan for each student with tracked applications, ordered by Momentum Score.
- **FR-002**: Momentum Score MUST be calculated as (Deadline Proximity × 0.6) + (Trust Score × 0.4). Exact normalization of Deadline Proximity and Trust Score is implementation-defined but must be consistent.

**Application Lifecycle**
- **FR-003**: System MUST support application lifecycle states: Tracked → Drafting → Review → Submitted → Outcome Pending. All status changes MUST be validated against the defined lifecycle; invalid transitions MUST be rejected.
- **FR-004**: System MUST persist application status and priority scores in a manner consistent with the shared data layer schema.
- **FR-005**: System MUST keep the shared orchestration state (active_milestones) in sync with application status changes.

**Verification Protocol**
- **FR-006**: When a student marks an application as Submitted or Won, the Coach MUST require explicit student confirmation before updating Total Debt Lifted or other financial totals.
- **FR-007**: If confirmation is not received, Total Debt Lifted and related dashboard values MUST NOT be updated.

**Deadline Notifications**
- **FR-008**: System MUST trigger urgent notifications when an application deadline is within 72 hours and again when within 24 hours.
- **FR-009**: Urgent notifications MUST be delivered via email and an in-dashboard toast.
- **FR-010**: System MUST enforce a maximum of one email and one dashboard nudge per student per 24-hour period.

**Post-Submission Follow-up**
- **FR-011**: System MUST automatically schedule a Check-in task 21 days after a student marks an application as Submitted.
- **FR-012**: Check-in tasks MUST be surfaced to the student via the Coach persona (e.g., "Have you heard back? Any updates?").

**Stale Progress**
- **FR-013**: When no progress has been made on any application for 48 hours, the Coach MUST suggest a Micro-Task (e.g., "Just spend 5 minutes on the intro today").

**Coach Persona**
- **FR-014**: All Coach communications MUST use the Encouraging Coach persona: action-oriented, athletic/coaching metaphors, win-focused tone.
- **FR-015**: Notification and email content MUST support dynamic micro-copy that reflects the Coach persona.

**Automation & Persistence**
- **FR-016**: System MUST run daily game plan generation, deadline checks, and post-submission scheduling via scheduled and event-driven workflows.
- **FR-017**: System MUST maintain a notification delivery log to enforce the per-student, per-24-hour frequency limit.

### Key Entities

- **Application**: A scholarship application a student is pursuing. Has status (lifecycle state), deadline, priority score (Momentum Score), and trust score.
- **Momentum Score**: Composite score for prioritization; (Deadline Proximity × 0.6) + (Trust Score × 0.4).
- **active_milestones**: Prioritized list of upcoming tasks (from Orchestration spec); Coach Execution Engine consumes and updates this as part of shared orchestration state.
- **Total Debt Lifted**: Dashboard aggregate of confirmed scholarship awards; updated only after verification protocol confirmation.
- **Notification Log**: Record of notifications sent per student; used to enforce one email and one dashboard nudge per 24-hour period.
- **Check-in Task**: A follow-up prompt scheduled 21 days after submission; asks the student for outcome updates.

### Assumptions

- The shared orchestration state (TuitionLiftState) and active_milestones are defined in the Orchestration spec; Coach Execution Engine integrates with them.
- Application status values align with the data layer schema (ApplicationStatus) defined in the Core Infrastructure spec.
- Scheduled and event-driven workflows are provided by the project's automation layer.
- Email and in-dashboard notifications are delivered via the project's notification layer; templates support dynamic Coach persona micro-copy.
- "Progress" for the 48-hour staleness check means a status change or meaningful edit to an application; exact definition is implementation-defined.
- Deadline Proximity and Trust Score are numeric values (0–1 or 0–100); exact source and normalization are implementation-defined.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Students receive a daily Top 3 Game Plan within the first hour of each day (or within 1 hour of first access that day), under normal load.
- **SC-002**: 100% of application status transitions respect the defined lifecycle; invalid transitions are rejected with clear feedback.
- **SC-003**: Total Debt Lifted is updated only after student confirmation for Submitted and Won statuses; zero unconfirmed financial total updates.
- **SC-004**: Students receive urgent deadline notifications at 72-hour and 24-hour marks for at least 95% of applicable deadlines, within a 2-hour window of the threshold.
- **SC-005**: No student receives more than one email and one dashboard nudge in any 24-hour period.
- **SC-006**: Check-in tasks are scheduled for 100% of applications marked Submitted, 21 days after submission date.
- **SC-007**: When 48 hours pass with no progress, students receive a Micro-Task suggestion within 4 hours of the threshold.
- **SC-008**: All Coach communications are auditable for persona consistency (action-oriented, athletic metaphors, win-focused).

## Documentation References

- [Orchestration Spec](../003-langgraph-orchestration/spec.md) — TuitionLiftState, active_milestones, Coach handoffs
- [Core Infrastructure Spec](../002-db-core-infrastructure/spec.md) — Application schema, ApplicationStatus, validation
