# Tasks: Coach Execution Engine

**Input**: Design documents from `/specs/005-coach-execution-engine/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Include exact file paths in descriptions

## Path Conventions

- **Turborepo (TuitionLift)**: `apps/web/`, `apps/agent/`, `packages/database/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Coach-specific dependencies

- [x] T001 [P] Add Resend, React Email to apps/web/package.json (if not from 001)
- [x] T002 [P] Add Coach env vars to apps/web/.env.example: RESEND_API_KEY, COACH_GAME_PLAN_CRON, COACH_DEADLINE_CHECK_CRON, COACH_MICRO_TASK_CHECK_CRON
- [x] T003 Create apps/web/lib/email/coach-templates/ directory for React Email Coach templates
- [x] T004 Create apps/agent/lib/coach/ directory (or packages/database/src/coach/) for state mapper and Momentum logic

**Checkpoint**: Coach structure and dependencies ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Add migration 005_notification_log: create notification_log table with user_id, channel (enum email|dashboard_toast), sent_at, notification_type, template_name (SC-008), application_ids in packages/database/supabase/migrations/
- [x] T006 Add migration 005_check_in_tasks: create check_in_tasks table with user_id, application_id, due_at, status (enum pending|completed|dismissed), created_at, completed_at in packages/database/supabase/migrations/
- [x] T007 Add migration 005_applications_extend: add momentum_score, submitted_at, last_progress_at, confirmed_at (per 002 FR-013a) to applications if missing in packages/database/supabase/migrations/
- [x] T008 Add migration 005_profiles_preferences: add preferences JSONB (nullable) to profiles for snooze in packages/database/supabase/migrations/
- [x] T009 [P] Implement coachStateToDb and dbToCoachState mapping functions in apps/agent/lib/coach/state-mapper.ts per data-model.md
- [x] T010 [P] Implement Momentum Score calculation (Deadline Proximity × 0.6 + Trust Score × 0.4) in apps/agent/lib/coach/momentum-score.ts
- [x] T011 [P] Add Zod schemas: NotificationLogSchema, CheckInTaskSchema, CoachStateMappingSchema in packages/database/src/schemas/ or apps/agent/lib/coach/schemas.ts
- [x] T012 Register Coach Inngest functions module in apps/web/lib/inngest/functions.ts (import and export coach functions)
- [x] T012a [P] Verify Coach–Orchestration integration: game-plan API reads from applications only; no checkpoint/active_milestones writes in Coach code paths; add comment referencing plan.md Coach–Orchestration Integration in game-plan.ts and game-plan route

**Checkpoint**: Foundation ready—user story implementation can begin

---

## Phase 3: User Story 1 - Daily Top 3 Game Plan (Priority: P1) 🎯 MVP

**Goal**: Student receives daily Top 3 Game Plan ordered by Momentum Score, or zero-apps suggestion (FR-001, FR-001a)

**Independent Test**: Supply applications with varying deadlines/trust scores; trigger daily prioritization; verify Top 3 respects Momentum Score formula. Zero apps → suggestion to add/run discovery.

### Implementation for User Story 1

- [x] T013 [US1] Implement Inngest function tuition-lift/coach.game-plan.daily with cron trigger (e.g., 30 6 * * * — after 003 prioritization at 06:00) in apps/web/lib/inngest/functions/coach.ts
- [x] T014 [US1] Implement game plan batch logic: load users with applications, compute Momentum Score, persist momentum_score to applications (002) only—no checkpoint write; zero-apps users skipped in apps/agent/lib/coach/game-plan.ts
- [x] T015 [US1] Implement zero-apps path: return suggestion "Add applications or run discovery" when user has no tracked apps (FR-001a) in apps/agent/lib/coach/game-plan.ts
- [x] T016 [US1] Implement GET /api/coach/game-plan in apps/web/app/api/coach/game-plan/route.ts: auth, compute Top 3 on demand from applications (ordered by momentum_score desc), include pending check-in tasks, return JSON per contract
- [x] T017 [US1] Create React Email template Top3GamePlan in apps/web/lib/email/coach-templates/Top3GamePlan.tsx with Coach persona micro-copy (FR-014, FR-015)

**Checkpoint**: User Story 1 complete—Top 3 Game Plan and zero-apps suggestion work independently

---

## Phase 4: User Story 2 - Application Lifecycle Management (Priority: P1)

**Goal**: Student tracks application through Tracked→Drafting→Review→Submitted→Outcome Pending; valid transitions enforced; applications table persisted immediately (FR-003, FR-004, FR-005)

**Independent Test**: Move application through each stage; verify only valid transitions succeed; invalid transitions rejected.

### Implementation for User Story 2

- [x] T018 [US2] Implement lifecycle transition validation (valid transitions matrix) in apps/agent/lib/coach/lifecycle.ts
- [x] T019 [US2] Implement POST /api/coach/application/status in apps/web/app/api/coach/application/status/route.ts: auth, ownership check, validate transition, for Submitted/Won return requiresConfirmation (do not persist yet)
- [x] T020 [US2] Persist status for non-HITL transitions: map Coach state to DB enum via state-mapper, update applications table, set last_progress_at on status change (FR-005) in apps/web/app/api/coach/application/status/route.ts
- [x] T021 [US2] Emit tuition-lift/coach.progress.recorded event on status change only (progress = status change only) for Micro-Task staleness in apps/web/app/api/coach/application/status/route.ts

**Checkpoint**: User Story 2 complete—lifecycle transitions work; Submitted/Won trigger HITL flow

---

## Phase 5: User Story 3 - Human-in-the-Loop Verification for Outcomes (Priority: P1)

**Goal**: Coach requires confirmation before Submitted/Won; Total Debt Lifted updated only after confirmation (FR-006, FR-006a, FR-007)

**Independent Test**: Request Submitted or Won; verify confirmation prompt; confirm → status/total updated; decline → no changes.

### Implementation for User Story 3

- [x] T022 [US3] Implement POST /api/coach/confirm-outcome in apps/web/app/api/coach/confirm-outcome/route.ts: auth, validate applicationId and outcomeType
- [x] T023 [US3] On confirmed Submitted: transition status to submitted, set submitted_at, update applications (FR-005) in apps/web/app/api/coach/confirm-outcome/route.ts
- [x] T024 [US3] On confirmed Won: transition status to awarded, set confirmed_at (required for 006 Debt Lifted); Total Debt Lifted computed on read from applications where status='awarded' AND confirmed_at IS NOT NULL in apps/web/app/api/coach/confirm-outcome/route.ts
- [x] T025 [US3] On declined: return success false, no DB changes in apps/web/app/api/coach/confirm-outcome/route.ts

**Checkpoint**: User Story 3 complete—HITL verification works for Submitted and Won

---

## Phase 6: User Story 4 - Deadline Urgency Notifications (Priority: P2)

**Goal**: Urgent notifications at 72h and 24h; email + dashboard toast; consolidated email with prioritization plan; max 1 email + 1 toast per 24h (FR-008, FR-009, FR-009a, FR-010)

**Independent Test**: Set deadlines 72h/24h ahead; trigger check; verify notifications sent; multiple deadlines → single consolidated email with prioritization.

### Implementation for User Story 4

- [ ] T026 [US4] Implement Inngest function tuition-lift/coach.deadline.check with cron (e.g., hourly) in apps/web/lib/inngest/functions/coach.ts
- [ ] T027 [US4] Implement deadline check logic: query applications JOIN scholarships on scholarship_id for deadline (scholarships.deadline), filter apps with deadline in 72h or 24h window, group by user, check notification_log for 24h limit in apps/agent/lib/coach/deadline-check.ts
- [ ] T028 [US4] Implement consolidated email: single email per user with all approaching deadlines, prioritization plan (essays before forms, by due date) per FR-009a in apps/agent/lib/coach/deadline-check.ts
- [ ] T029 [US4] Create React Email template DeadlineAlert in apps/web/lib/email/coach-templates/DeadlineAlert.tsx with Coach persona and prioritization section
- [ ] T030 [US4] Insert notification_log rows (notification_type, template_name for SC-008) for email and dashboard_toast before sending; respect 24h limit (skip if recent row exists) in apps/agent/lib/coach/deadline-check.ts
- [ ] T031 [US4] Implement GET /api/coach/notifications in apps/web/app/api/coach/notifications/route.ts: return dashboard toasts from notification_log for polling

**Checkpoint**: User Story 4 complete—deadline notifications sent; frequency limit enforced

---

## Phase 7: User Story 5 - Post-Submission Follow-up (Priority: P2)

**Goal**: Check-in task scheduled 21 days after Submitted; Coach surfaces "Have you heard back?"; student can complete with Won/Lost (FR-011, FR-012)

**Independent Test**: Mark app Submitted; advance time 21 days; verify check-in task created; complete Check-in with Won → trigger verification.

### Implementation for User Story 5

- [ ] T032 [US5] On status→Submitted (after HITL confirm), send Inngest event tuition-lift/coach.check-in.schedule with userId, applicationId, dueAt=submitted_at+21d in apps/web/app/api/coach/confirm-outcome/route.ts
- [ ] T033 [US5] Implement Inngest function tuition-lift/coach.check-in.schedule: create check_in_tasks row with due_at in apps/web/lib/inngest/functions/coach.ts
- [ ] T034 [US5] Implement cron or step.sleepUntil for check-in batch: query applications with submitted_at 21 days ago, create check_in_tasks for any missing in apps/web/lib/inngest/functions/coach.ts
- [ ] T035 [US5] Implement POST /api/coach/check-in/complete in apps/web/app/api/coach/check-in/complete/route.ts: auth, update check_in_tasks status, if outcome=Won trigger HITL (return requiresConfirmation)
- [ ] T036 [US5] Extend GET /api/coach/game-plan response contract to include pending check_in_tasks (T016 implements); ensure Coach persona can surface "Have you heard back?" per FR-012

**Checkpoint**: User Story 5 complete—Check-in tasks created and completable

---

## Phase 8: User Story 6 - Stale Progress Micro-Task Suggestion (Priority: P3)

**Goal**: After 48h no progress, Coach suggests Micro-Task; user can snooze (not past due date) (FR-013, FR-013a, FR-013b)

**Independent Test**: Simulate 48h no activity; verify Micro-Task suggested; snooze; verify snooze cannot exceed deadline.

### Implementation for User Story 6

- [ ] T037 [US6] Implement Inngest function tuition-lift/coach.micro-task.check with cron (e.g., every 4h) in apps/web/lib/inngest/functions/coach.ts
- [ ] T038 [US6] Implement staleness check: query applications where last_progress_at < now()-48h, exclude snoozed (profiles.preferences.micro_task_snoozed_until), validate snoozed_until < nearest deadline in apps/agent/lib/coach/micro-task.ts
- [ ] T039 [US6] Create React Email template MicroTaskSuggestion in apps/web/lib/email/coach-templates/MicroTaskSuggestion.tsx with Coach persona (FR-014)
- [ ] T040 [US6] Implement Micro-Task send: check notification_log 24h limit, send email + insert dashboard toast in apps/agent/lib/coach/micro-task.ts
- [ ] T041 [US6] Implement POST /api/coach/micro-task/snooze in apps/web/app/api/coach/micro-task/snooze/route.ts: auth, validate snoozedUntil < nearest app deadline, store in profiles.preferences

**Checkpoint**: User Story 6 complete—Micro-Task and snooze work

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple stories

- [ ] T042 [P] Add inline comments referencing Inngest, Resend, contract docs in key Coach files
- [ ] T043 Ensure all Coach communications use Encouraging Coach persona (action-oriented, athletic metaphors) in apps/web/lib/email/coach-templates/
- [ ] T044 Run quickstart.md validation: verify migrations, Inngest dev, game plan trigger work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies—start immediately
- **Phase 2 (Foundational)**: Depends on Setup—BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Foundational—MVP
- **Phase 4 (US2)**: Depends on Foundational
- **Phase 5 (US3)**: Depends on US2 (confirm-outcome completes status flow)
- **Phase 6 (US4)**: Depends on Foundational
- **Phase 7 (US5)**: Depends on Foundational, US3 (Submitted triggers check-in)
- **Phase 8 (US6)**: Depends on Foundational
- **Phase 9 (Polish)**: Depends on all desired stories complete

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|--------------------|
| US1 | Foundational | US2, US4, US6 |
| US2 | Foundational | US1, US4, US6 |
| US3 | US2 | — |
| US4 | Foundational | US1, US2, US6 |
| US5 | Foundational, US3 | US4, US6 |
| US6 | Foundational | US1, US2, US4 |

### Parallel Opportunities

- T001, T002, T003, T004 can run in parallel (Setup)
- T009, T010, T011 can run in parallel (Foundational)
- US1, US2, US4, US6 can start in parallel after Foundational
- US5 depends on US3 (Submitted flow); US3 depends on US2

### Parallel Example: After Foundational

```bash
# Developer A: US1 (Game Plan)
T013, T014, T015, T016, T017

# Developer B: US2 (Lifecycle)
T018, T019, T020, T021

# Developer C: US4 (Deadline Notifications)
T026, T027, T028, T029, T030, T031

# Developer D: US6 (Micro-Task)
T037, T038, T039, T040, T041
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Daily Top 3 Game Plan)
4. **STOP and VALIDATE**: Test game plan independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Top 3 Game Plan + zero-apps suggestion (MVP)
3. US2 + US3 → Lifecycle + HITL verification
4. US4 → Deadline notifications
5. US5 → Check-in follow-up
6. US6 → Micro-Task + snooze
7. Polish

### Suggested MVP Scope

**User Story 1 (Daily Top 3 Game Plan)** — 5 tasks (T013–T017). Delivers core Coach value: prioritized daily focus.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to user story for traceability
- Each user story independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
