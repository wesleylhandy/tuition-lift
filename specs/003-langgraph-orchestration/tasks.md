# Tasks: System Orchestration & State Graph

**Input**: Design documents from `/specs/003-langgraph-orchestration/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in spec; no test tasks included.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Turborepo (TuitionLift)**: `apps/web/`, `apps/agent/`, `packages/database/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and directory structure

- [x] T001 Create apps/agent directory structure (lib/, lib/nodes/) and apps/web/lib/inngest/ per plan.md
- [x] T002 Add @langchain/langgraph @langchain/langgraph-checkpoint-postgres to apps/agent/package.json; add inngest to apps/web/package.json
- [x] T003 [P] Add DATABASE_URL, INNGEST_SIGNING_KEY, INNGEST_EVENT_KEY, LANGCHAIN_TRACING_V2, LANGCHAIN_API_KEY to .env.example
- [x] T004 [P] Add Inngest client and serve route at apps/web/app/api/inngest/route.ts per Inngest docs

**Checkpoint**: Dependencies installed; Inngest serve route available; env vars documented

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core graph state, checkpointer, and schema—must complete before any user story

- [x] T005 [P] Define Zod schemas (FinancialProfileSchema, UserProfileSchema, DiscoveryResultSchema with discovery_run_id, ActiveMilestoneSchema, ErrorLogEntrySchema) in apps/agent/lib/schemas.ts per data-model.md
- [x] T006 Define TuitionLiftState using Annotation.Root with user_profile, discovery_results, active_milestones, messages, last_active_node, financial_profile, error_log in apps/agent/lib/state.ts
- [x] T007 Create PostgresSaver checkpointer using DATABASE_URL, call setup() on init, export from apps/agent/lib/checkpointer.ts
- [x] T008 Create graph skeleton (StateGraph with START, END) in apps/agent/lib/graph.ts with placeholder nodes Advisor_Search, Advisor_Verify, Coach_Prioritization, SafeRecovery; compile with checkpointer
- [x] T009 Implement profile loader: fetch user_profile and financial_profile from @repo/db profiles table by user_id; compute household_income_bracket from SAI; export from apps/agent/lib/load-profile.ts
- [x] T010 Create financial anonymization helper: map financial_profile to search-safe strings (household_income_bracket → "Low Income"|etc, is_pell_eligible → "Pell Eligible"|etc); use placeholders for geo ({{USER_STATE}}, {{USER_CITY}}) per FR-007a in apps/agent/lib/anonymize-financial.ts
- [x] T010a Implement application-level encryption for financial profile fields (SAI): add encrypt/decrypt helpers in packages/database (env key); use decrypt in apps/agent/lib/load-profile.ts on read; use encrypt on profile write paths (e.g. onboarding). household_income_bracket not stored—computed from SAI per 002 (FR-014)

**Checkpoint**: Graph compiles; state schema defined; checkpointer persists; profile loader, anonymization, and encryption ready

---

## Phase 3: User Story 1 - Discovery to Prioritization Flow (Priority: P1) MVP

**Goal**: Student requests discovery; Advisor searches with anonymized context, scores results; Coach prioritizes by ROI; student receives milestones. Async via Inngest; status poll + notification on complete.

**Independent Test**: Invoke discovery with complete profile; verify results scored, milestones ROI-ordered; verify status polling and notification on completion.

### Implementation for User Story 1

- [x] T011 [US1] Implement Advisor_Search node: web search (e.g., Tavily) using anonymized financial_profile and placeholders; return raw results in state in apps/agent/lib/nodes/advisor-search.ts
- [x] T012 [US1] Implement Advisor_Verify node: score results (trust_score, need_match_score), apply Trust Filter (.edu/.gov 2×, auto-fail fees); read discovery_run_id from graph config.configurable, attach to each DiscoveryResult; return Command({ goto: "Coach_Prioritization", update: { discovery_results, last_active_node } }) in apps/agent/lib/nodes/advisor-verify.ts
- [x] T013 [US1] Implement Coach_Prioritization node: map discovery_results to active_milestones ordered by ROI; when discovery_results empty, present "No matches yet" message, explain why, suggest next steps (FR-012b); set last_active_node; transition to END in apps/agent/lib/nodes/coach-prioritization.ts
- [x] T014 [US1] Wire graph edges: START → Advisor_Search; Advisor_Search → Advisor_Verify; Advisor_Verify → Coach_Prioritization; Coach_Prioritization → END in apps/agent/lib/graph.ts
- [x] T015 [US1] Create Inngest function tuition-lift/discovery.requested: import graph from apps/agent; receive discoveryRunId from event payload; load profile; invoke graph.invoke with thread_id=user_${userId}, config.configurable.discovery_run_id for nodes to use, 5m timeout in apps/web/lib/inngest/functions.ts
- [x] T016 [US1] Implement POST /api/discovery/trigger: auth check; validate required user_profile fields per FR-012a (return 400 with instructions if missing); surface warnings for optional/financial fields; check if run in progress (FR-013a); if yes return status; else generate discovery_run_id (uuid), send Inngest event with discoveryRunId, return threadId, discoveryRunId, status in apps/web/app/api/discovery/trigger/route.ts
- [x] T017 [US1] Implement status resolver: read discovery_completions or checkpoint for thread_id; return status, discoveryRunId, lastActiveNode, completedAt in apps/web/lib/discovery-status.ts
- [x] T018 [US1] Implement GET /api/discovery/status: auth; validate thread_id owned by user; return status JSON per contract in apps/web/app/api/discovery/status/route.ts
- [x] T019 [US1] Implement GET /api/discovery/results: auth; load checkpoint state for thread_id; return discoveryRunId (top-level), discoveryResults (each with discoveryRunId), and activeMilestones per contract in apps/web/app/api/discovery/results/route.ts
- [x] T020 [US1] Add discovery_completions table migration: id, discovery_run_id (uuid NOT NULL UNIQUE), user_id, thread_id, status, completed_at, created_at; RLS user_id=auth.uid() in packages/database/supabase/migrations/
- [x] T021 [US1] Update Inngest discovery function: on run start create discovery_completions row with discovery_run_id; on graph completion upsert status=completed, completed_at=now for notification (FR-013b)
- [x] T022 [US1] Add status polling + "Discovery in progress…" UI state and notification (bell/toaster) when status=completed in apps/web — create apps/web/app/discovery/page.tsx if not present

**Checkpoint**: User Story 1 complete; discovery triggers, runs async, returns results; status poll + notification work

---

## Phase 4: User Story 2 - Human-in-the-Loop Financial Deep Search (Priority: P2)

**Goal**: Before Advisor uses SAI range in search, Coach asks confirmation; user approves/denies; only with approval does Advisor include SAI bands.

**Independent Test**: Request deep search; system prompts; deny → tiers only; approve → SAI range used.

### Implementation for User Story 2

- [x] T024 [US2] Add useSaiRange to discovery state/trigger flow: when Advisor determines SAI range would help, set pending_sai_confirmation in state; Coach emits message asking user to confirm
- [x] T025 [US2] Implement POST /api/discovery/confirm-sai: auth; validate threadId owned by user; update state with approved flag; resume graph if waiting in apps/web/app/api/discovery/confirm-sai/route.ts
- [x] T026 [US2] Update Advisor_Search: if useSaiRange approved, include SAI band (e.g., "0-2000") in search query; else use only income tiers in apps/agent/lib/nodes/advisor-search.ts
- [x] T027 [US2] Add HITL flow: when Advisor needs SAI range, transition to human-in-the-loop; Coach prompts via messages; wait for confirm-sai before continuing in apps/agent/lib/graph.ts

**Checkpoint**: User Story 2 complete; HITL confirmation prevents SAI range use without approval

---

## Phase 5: User Story 3 - Fault Recovery and Resumability (Priority: P3)

**Goal**: Node failures update error_log, route to SafeRecovery; Coach notifies user; checkpoint after search prevents search re-run on verification failure.

**Independent Test**: Simulate node failure; verify error_log populated, SafeRecovery runs, user notified; verify resume does not re-run search.

### Implementation for User Story 3

- [ ] T028 [US3] Wrap Advisor_Search, Advisor_Verify, and Coach_Prioritization in try/catch; on error append error_log, return Command({ goto: "SafeRecovery", update: { error_log } }) in apps/agent/lib/nodes/advisor-search.ts, advisor-verify.ts, and coach-prioritization.ts
- [ ] T029 [US3] Implement SafeRecovery node: add Coach persona message to state notifying user of error; update discovery_completions status=failed; transition to END in apps/agent/lib/nodes/safe-recovery.ts
- [ ] T030 [US3] Add conditional edges from Advisor_Search, Advisor_Verify, and Coach_Prioritization to SafeRecovery (on Command goto) in apps/agent/lib/graph.ts
- [ ] T031 [US3] Verify resume from checkpoint after verification failure: load checkpoint, continue from Advisor_Verify or Coach_Prioritization; no search re-run (Advisor_Search and Advisor_Verify are separate nodes; checkpoint occurs between them per FR-003)

**Checkpoint**: User Story 3 complete; failures route to SafeRecovery; user notified; no duplicate search on resume

---

## Phase 6: User Story 4 - Scheduled Prioritization Refresh (Priority: P4)

**Goal**: Daily cron triggers Coach_Prioritization for users with discovery results; milestones refreshed without new discovery.

**Independent Test**: Trigger scheduled run; verify milestones recalculated; no duplicate discovery.

### Implementation for User Story 4

- [ ] T033 [US4] Create Inngest function tuition-lift/prioritization.scheduled with cron trigger (e.g., 0 6 * * * daily) in apps/web/lib/inngest/functions.ts
- [ ] T034 [US4] Implement batch load: fetch users/threads with discovery_results; for each, invoke Coach_Prioritization with existing state (no Advisor run) in apps/web/lib/inngest/functions.ts
- [ ] T035 [US4] Add scheduled_refresh entry point to graph: route directly to Coach_Prioritization; Inngest loads checkpoint via graph.getState(), invokes with entrypoint "scheduled_refresh" and existing state; Coach recalculates active_milestones; no Advisor nodes run (see plan.md Coach_Prioritization Standalone)

**Checkpoint**: User Story 4 complete; daily cron refreshes milestones

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Observability, security, and documentation

- [ ] T036 [P] Enable LangSmith tracing: set LANGCHAIN_TRACING_V2=true, LANGCHAIN_API_KEY in agent env; verify traces in LangSmith (FR-019)
- [ ] T037 Validate SAI range (-1500 to 999999) before loading financial_profile; reject invalid in profile loader in apps/agent/lib/load-profile.ts
- [ ] T038 Ensure no raw SAI, SSN, tax data, names, or addresses sent to search APIs; verify placeholders ({{USER_STATE}}, {{USER_CITY}}) used; audit anonymize-financial and Advisor_Search calls (FR-007, FR-007a, SC-003)
- [ ] T039 Run quickstart.md validation: verify checkpointer setup, graph invoke, Inngest trigger work end-to-end
- [ ] T040 [P] Add inline comments referencing LangGraph JS, Inngest, and contract docs in key files
- [ ] T041 Run Lighthouse on discovery flow (trigger, status poll, results view); verify Performance and Best Practices ≥ 90 each (SC-007)
- [ ] T042 Verify SC-001: run discovery end-to-end under normal conditions (single-user, sequential); assert completion within 5 minutes

**Checkpoint**: Observability enabled; security validated; quickstart passes; Lighthouse 90+ verified; SC-001 validated

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories
- **US1 (Phase 3)**: Depends on Foundational
- **US2 (Phase 4)**: Depends on US1 (confirm-sai integrates with discovery flow)
- **US3 (Phase 5)**: Depends on Foundational; can parallel with US1/US2 (error handling in same nodes)
- **US4 (Phase 6)**: Depends on US1 (Coach_Prioritization must exist)
- **Polish (Phase 7)**: Depends on US1–US4

### User Story Dependencies

- **US1**: Blocks US2, US4 (trigger, confirm, results, cron all build on discovery flow)
- **US2**: Builds on US1
- **US3**: Can be done alongside US1 (same node files)
- **US4**: Builds on US1

### Parallel Opportunities

- T003, T004 within Phase 1
- T005, T006, T007, T009, T010 within Phase 2 (after T008 graph skeleton)
- T036, T040 within Phase 7
- US2 and US3 can be implemented in parallel after US1

---

## Parallel Example: Phase 2

```bash
# After T008 graph skeleton exists:
T005: Zod schemas in apps/agent/lib/schemas.ts
T009: Profile loader in apps/agent/lib/load-profile.ts
T010: Anonymization helper in apps/agent/lib/anonymize-financial.ts
T010a: Application-level encryption for financial fields
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Trigger discovery, poll status, retrieve results, receive notification
5. Deploy/demo

### Incremental Delivery

1. Setup + Foundational → Graph runs with checkpointer
2. US1 → Full discovery-to-prioritization flow (MVP)
3. US2 → HITL for SAI range
4. US3 → Fault recovery
5. US4 → Scheduled refresh
6. Polish → Observability, security, docs

---

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 41 |
| Phase 1 (Setup) | 4 |
| Phase 2 (Foundational) | 7 |
| Phase 3 (US1) | 12 |
| Phase 4 (US2) | 4 |
| Phase 5 (US3) | 4 |
| Phase 6 (US4) | 3 |
| Phase 7 (Polish) | 7 |
| Parallel opportunities | T003, T004; T005, T009, T010, T010a; T036, T040 |
| MVP scope | Phases 1–3 (User Story 1) |
