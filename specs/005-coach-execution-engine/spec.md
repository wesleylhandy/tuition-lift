# Feature Specification: Coach Execution Engine

**Feature Branch**: `005-coach-execution-engine`  
**Created**: 2025-02-13  
**Status**: Draft  
**Input**: User description: "Create the Coach Execution Engine: An automation and state-management system for TuitionLift."

## Clarifications

### Session 2025-02-16 (Alignment with 002, 003, 004, 006)

- Q: How does Coach align with 002 applications schema (momentum_score, submitted_at, confirmed_at)? → A: Use momentum_score (002; formerly priority_score) for application prioritization; persist to applications.momentum_score. Set submitted_at when status→submitted; set confirmed_at when user confirms Won (HITL). 006 Debt Lifted sums only status='awarded' AND confirmed_at IS NOT NULL.
- Q: How does Coach_Prioritization consume discovery_results from Advisor (004)? → A: Coach receives discovery_results (trust_score, need_match_score, discovery_run_id) from Advisor_Verify. Coach maps to active_milestones and computes momentum_score for applications (different from need_match_score—momentum combines deadline proximity + trust for applications; need_match_score is Advisor's SAI alignment for discovery results).
- Q: Who produces Coach's Take (006 Match Inbox)? → A: 005 Coach may generate Coach's Take (ROI micro-summary) when mapping discovery_results to active_milestones; 004 produces Trust Report. Source is implementation-defined—Coach can derive from Trust Report or generate independently.
- Q: When must Coach update submitted_at, last_progress_at, confirmed_at? → A: submitted_at set when status→submitted (after HITL confirm); last_progress_at updated on every status change (for 48h staleness); confirmed_at set when user confirms Won (before Total Debt Lifted update).

### Session 2025-02-13

- Q: How should Coach lifecycle states (Tracked, Drafting, Review, Submitted, Outcome Pending) align with the Core Infrastructure application_status enum (draft, submitted, awarded, rejected, withdrawn)? → A: Coach states live in orchestration (LangGraph/active_milestones); DB keeps existing enum; a mapping layer converts between them.
- Q: When a student marks an application as Submitted, does the status transition before or after confirmation? → A: After—status stays in Review until confirmation; it transitions to Submitted only when the student confirms.
- Q: When a student has zero tracked applications, what happens with the daily Top 3 Game Plan? → A: No game plan generated; Coach surfaces a suggestion to add applications or run discovery.
- Q: When multiple applications have deadlines in the same 72h/24h window, what does the consolidated email contain? → A: One consolidated email listing all approaching deadlines, with a clear prioritization plan for each based on due dates and requirements (e.g., essays need more time than forms).
- Q: What counts as "progress" for the 48-hour staleness check? Can users snooze? → A: Progress = status change or any save/edit to application content. User may snooze the progress check for a limited time; snooze MUST NOT extend beyond the due date for action items.
- Q: What does "Trust Score" in the Momentum formula refer to? → A: Trust Score = trustworthiness of the scholarship source (from the Reputation Engine). Momentum combines urgency (deadline proximity) and source trustworthiness. High trust + high urgency = most valuable; high urgency + low trust = less valuable (quadrant logic). As deadlines approach or work is completed, urgency increases.
- Q: Does 005 own the "save application content" flow for progress tracking? → A: No. Coordinating external application submissions with the app (data copies, confirmations) requires its own feature. For 005, progress = status change only. A future feature will handle application content tracking and soliciting confirmations; 005 may consume those signals when available.
- Q: How should Coach communications be "auditable" for persona consistency (SC-008)? → A: Notification log stores metadata (type, template, timestamp); content can be reconstructed from templates for spot checks.
- Q: When status changes, when must active_milestones be updated? → A: Immediately—update active_milestones in the same flow as the status change (e.g., same API call).
- Q: Should urgency (Deadline Proximity) factor in application stage, or only time-to-deadline? → A: Both—time-to-deadline and application stage (e.g., Review closer than Tracked) contribute to a single urgency score.

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
7. **Given** an application status changes, **When** the update is persisted, **Then** the applications table reflects the new status and last_progress_at; Coach Game Plan and Dashboard read from applications.

---

### User Story 3 - Human-in-the-Loop Verification for Outcomes (Priority: P1)

When a student requests to mark an application as Submitted or Won, the Coach requires explicit student confirmation before applying the change. For Submitted, the status stays in Review until confirmed; for Won, Total Debt Lifted is not updated until confirmed. This prevents accidental or premature updates and keeps financial totals accurate.

**Why this priority**: Financial accuracy and user trust—dashboard totals must reflect confirmed outcomes only.

**Independent Test**: Can be tested by attempting to update Submitted or Won status and verifying the Coach prompts for confirmation before any dashboard total is updated.

**Acceptance Scenarios**:

1. **Given** a student requests to mark an application as Submitted, **When** the system receives the request, **Then** the Coach prompts for confirmation; status remains in Review until confirmed.
2. **Given** the student confirms submission, **When** confirmation is received, **Then** status transitions to Submitted.
3. **Given** a student requests to mark an application as Won, **When** the system receives the request, **Then** the Coach prompts for confirmation before updating Total Debt Lifted.
4. **Given** the student confirms Won, **When** confirmation is received, **Then** status and Total Debt Lifted are updated.
5. **Given** the student declines or dismisses the confirmation, **When** no confirmation is received, **Then** status remains unchanged and Total Debt Lifted is not updated.

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
3. **Given** the user receives a Micro-Task suggestion, **When** they snooze it, **Then** the snooze period is limited and MUST NOT extend beyond the due date for relevant action items.

---

### Edge Cases

- What happens when a student has zero tracked applications? No game plan is generated; the Coach surfaces a suggestion to add applications or run discovery.
- What happens when a student has fewer than 3 tracked applications? The Top 3 Game Plan includes only the available applications; ranking still uses Momentum Score.
- What happens when two applications have identical Momentum Scores? A deterministic tie-breaker (e.g., earlier deadline first) is used; both are ranked consistently.
- What happens when notification delivery fails (email bounce, etc.)? The notification is logged; the dashboard toast remains the fallback channel; retry or escalation behavior is implementation-defined.
- What happens when the student has multiple applications with deadlines in the same 72-hour or 24-hour window? The system consolidates into a single notification per 24-hour period per student to respect the frequency limit. The consolidated email MUST include a clear prioritization plan for each deadline based on due dates and requirements (e.g., essays need more time than forms).
- What happens when a student never confirms a Won status? Total Debt Lifted is not updated; the application may remain in Outcome Pending until confirmation or manual correction.
- What happens when 48 hours of no progress is detected but the student has no applications in Drafting? The Coach may suggest adding a new application or another Micro-Task appropriate to the current state.
- What happens when the user snoozes a Micro-Task suggestion? The suggestion is deferred for the snooze period; snooze MUST NOT extend beyond the due date for relevant action items (e.g., application deadline).

## Requirements *(mandatory)*

### Functional Requirements

**Momentum Algorithm**
- **FR-001**: System MUST generate a daily Top 3 Game Plan for each student with tracked applications, ordered by Momentum Score.
- **FR-001a**: When a student has zero tracked applications, the system MUST NOT generate a game plan; the Coach MUST surface a suggestion to add applications or run discovery.
- **FR-002**: Momentum Score MUST be calculated as (Deadline Proximity × 0.6) + (Trust Score × 0.4). Trust Score = source trustworthiness (scholarship reputation from the Reputation Engine). Deadline Proximity = composite urgency from (a) time-to-deadline and (b) application stage (e.g., Review > Drafting > Tracked). High trust + high urgency = highest priority; high urgency + low trust = deprioritized (quadrant logic). Exact normalization is implementation-defined but must be consistent.

**Application Lifecycle**
- **FR-003**: System MUST support application lifecycle states: Tracked → Drafting → Review → Submitted → Outcome Pending. All status changes MUST be validated against the defined lifecycle; invalid transitions MUST be rejected.
- **FR-003a**: Coach lifecycle states MUST be reconciled with the data layer application_status enum via a mapping layer; orchestration uses Coach states; persistence uses DB enum values; conversions MUST be bidirectional and consistent.
- **FR-004**: System MUST persist application status and momentum_score in a manner consistent with the shared data layer schema (002). When status→submitted, set submitted_at; on every status change, set last_progress_at; when user confirms Won, set confirmed_at before updating Total Debt Lifted.
- **FR-005**: System MUST persist application status changes immediately in the same flow (e.g., same API call). The applications table is the source of truth for application lifecycle; Coach Game Plan and Dashboard read from it. Orchestration's active_milestones (discovery-based) is separate; when user has tracked applications, Top 3 is derived from applications.momentum_score on read.

**Verification Protocol**
- **FR-006**: When a student requests to mark an application as Submitted or Won, the Coach MUST require explicit student confirmation before applying the change.
- **FR-006a**: For Submitted: status MUST remain in Review until confirmation; it transitions to Submitted only upon confirmation.
- **FR-007**: For Won: Total Debt Lifted and related dashboard values MUST NOT be updated until confirmation is received.

**Deadline Notifications**
- **FR-008**: System MUST trigger urgent notifications when an application deadline is within 72 hours and again when within 24 hours.
- **FR-009**: Urgent notifications MUST be delivered via email and an in-dashboard toast.
- **FR-009a**: When multiple deadlines fall within the same urgency window, the consolidated email MUST list all approaching deadlines with a clear prioritization plan for each based on due dates and requirements (e.g., essays need more time than forms).
- **FR-010**: System MUST enforce a maximum of one email and one dashboard nudge per student per 24-hour period.

**Post-Submission Follow-up**
- **FR-011**: System MUST automatically schedule a Check-in task 21 days after a student marks an application as Submitted.
- **FR-012**: Check-in tasks MUST be surfaced to the student via the Coach persona (e.g., "Have you heard back? Any updates?").

**Stale Progress**
- **FR-013**: When no progress has been made on any application for 48 hours, the Coach MUST suggest a Micro-Task (e.g., "Just spend 5 minutes on the intro today").
- **FR-013a**: For 005 scope, "Progress" means a status change. Application content tracking and coordination with external submission confirmations are out of scope (deferred to a future feature).
- **FR-013b**: The user MAY snooze the progress-check Micro-Task suggestion for a limited time; the snooze period MUST NOT extend beyond the due date for relevant action items.

**Coach Persona**
- **FR-014**: All Coach communications MUST use the Encouraging Coach persona: action-oriented, athletic/coaching metaphors, win-focused tone.
- **FR-015**: Notification and email content MUST support dynamic micro-copy that reflects the Coach persona.

**Automation & Persistence**
- **FR-016**: System MUST run daily game plan generation, deadline checks, and post-submission scheduling via scheduled and event-driven workflows.
- **FR-017**: System MUST maintain a notification delivery log to enforce the per-student, per-24-hour frequency limit.

### Key Entities

- **Application**: A scholarship application a student is pursuing. Has status (lifecycle state), deadline (from linked scholarship), momentum_score (Momentum Score; 002 schema), trust score (from linked scholarship's reputation), submitted_at, last_progress_at, confirmed_at (002).
- **Momentum Score**: Composite score for prioritization; (Deadline Proximity × 0.6) + (Trust Score × 0.4). Combines urgency and source trustworthiness; quadrant logic: high trust + high urgency = best; low trust deprioritizes even when urgent.
- **active_milestones**: Prioritized list from Orchestration (003)—discovery-based milestones. When user has tracked applications, Coach Game Plan and Top 3 derive from applications (momentum_score) on read; applications table is source of truth for application lifecycle.
- **Total Debt Lifted**: Dashboard aggregate of confirmed scholarship awards; updated only after verification protocol confirmation.
- **Notification Log**: Record of notifications sent per student; used to enforce one email and one dashboard nudge per 24-hour period.
- **Check-in Task**: A follow-up prompt scheduled 21 days after submission; asks the student for outcome updates.

### Assumptions

- The shared orchestration state (TuitionLiftState) and active_milestones are defined in the Orchestration spec. Coach Game Plan uses the applications table as source of truth for Top 3; orchestration's active_milestones serves discovery flow (no tracked applications).
- Application status values align with the data layer schema (ApplicationStatus) defined in the Core Infrastructure spec.
- **Lifecycle reconciliation**: Coach lifecycle states (Tracked, Drafting, Review, Submitted, Outcome Pending) live in orchestration; the DB application_status enum (draft, submitted, awarded, rejected, withdrawn) remains the persisted source of truth. A mapping layer converts between Coach states and DB values on read/write (e.g., Tracked/Drafting/Review → draft; Submitted → submitted; Outcome Pending → submitted with outcome metadata; Won → awarded).
- Scheduled and event-driven workflows are provided by the project's automation layer.
- Email and in-dashboard notifications are delivered via the project's notification layer; templates support dynamic Coach persona micro-copy.
- "Progress" for the 48-hour staleness check means a status change (within 005 scope). Application content tracking and external submission coordination are deferred to a future feature. Users may snooze the Micro-Task suggestion; snooze must not extend beyond action item due dates.
- Deadline Proximity and Trust Score are numeric values (0–1 or 0–100). Trust Score derives from the scholarship's reputation (Reputation Engine). Deadline Proximity is a composite of time-to-deadline and application stage (e.g., Review closer than Drafting closer than Tracked). Exact normalization is implementation-defined but must be consistent.
- Application requirements (e.g., essay vs form) are available or derivable so the Coach can prioritize within consolidated deadline notifications (essays need more lead time than simple forms).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Students receive a daily Top 3 Game Plan within the first hour of each day (or within 1 hour of first access that day), under normal load.
- **SC-002**: 100% of application status transitions respect the defined lifecycle; invalid transitions are rejected with clear feedback.
- **SC-003**: Total Debt Lifted is updated only after student confirmation for Submitted and Won statuses; zero unconfirmed financial total updates.
- **SC-004**: Students receive urgent deadline notifications at 72-hour and 24-hour marks for at least 95% of applicable deadlines, within a 2-hour window of the threshold.
- **SC-005**: No student receives more than one email and one dashboard nudge in any 24-hour period.
- **SC-006**: Check-in tasks are scheduled for 100% of applications marked Submitted, 21 days after submission date.
- **SC-007**: When 48 hours pass with no progress, students receive a Micro-Task suggestion within 4 hours of the threshold.
- **SC-008**: Coach communications are auditable via notification log metadata (type, template, timestamp); content can be reconstructed from templates for persona consistency spot checks (action-oriented, athletic metaphors, win-focused).

## Out of Scope (Deferred to Future Feature)

- **Application content tracking**: Storing and syncing copies of application data (essays, form fields) filled out on external scholarship sites.
- **External submission confirmation flow**: Soliciting and recording user confirmation when they submit applications outside the app (e.g., "Did you submit the FAFSA?").
- **Progress from content saves**: Recording progress when users edit application content in-app (depends on application editor feature).

A future feature will address coordination between external application submissions and the app; 005 may consume progress signals from it when available.

## Documentation References

- [Orchestration Spec](../003-langgraph-orchestration/spec.md) — TuitionLiftState, active_milestones, Coach handoffs, discovery_run_id
- [Core Infrastructure Spec](../002-db-core-infrastructure/spec.md) — Application schema (momentum_score, submitted_at, last_progress_at, confirmed_at), ApplicationStatus
- [Advisor Discovery Engine Spec](../004-advisor-discovery-engine/spec.md) — discovery_results (trust_score, need_match_score, Trust Report); Coach consumes for prioritization
- [Dashboard Spec](../006-scholarship-inbox-dashboard/spec.md) — Top 3 ordered by momentum_score; Debt Lifted uses confirmed_at; Coach's Take display
