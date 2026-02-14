# Tasks: Advisor Discovery Engine

**Input**: Design documents from `/specs/004-advisor-discovery-engine/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

**Prerequisites (Feature Dependencies)**: This feature requires **002-db-core-infrastructure** (packages/database, scholarships schema) and **003-langgraph-orchestration** (apps/agent, graph topology, state.ts, checkpointer.ts) to be implemented first. If those features are incomplete, Phase 1–2 tasks may need to create minimal scaffolding.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Turborepo (TuitionLift)**: `apps/agent/`, `packages/database/`, `apps/web/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization for discovery engine; extend existing structure

- [ ] T001 Create apps/agent package structure with lib/ and lib/discovery/ per plan in apps/agent/
- [ ] T002 Add dependencies to apps/agent: @langchain/langgraph, @langchain/langgraph-checkpoint-postgres, @supabase/supabase-js, zod in apps/agent/package.json
- [ ] T003 [P] Add TAVILY_API_KEY and DISCOVERY_SEARCH_BATCH_DELAY_MS to env schema in apps/agent/ or .env.example
- [ ] T004 [P] Add workspace dependency from apps/agent to packages/database (if database package exists) in pnpm-workspace.yaml and apps/agent/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DB migration, Zod schemas, and shared types that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete. Requires 002 packages/database with scholarships table.

- [ ] T005 Create migration adding metadata JSONB and UNIQUE(url) partial index to scholarships table in packages/database/supabase/migrations/
- [ ] T006 [P] Create AnonymizedProfileSchema (gpa, major, incomeBracket, pellStatus; no PII) in apps/agent/lib/discovery/schemas.ts
- [ ] T007 [P] Create DiscoveryResultSchema with trust_score 0-100, trust_report, verification_status, categories in apps/agent/lib/discovery/schemas.ts
- [ ] T008 [P] Create ScholarshipMetadataSchema for metadata JSONB shape (source_url, snippet, scoring_factors, trust_report, categories, verification_status) in apps/agent/lib/discovery/schemas.ts
- [ ] T009 [P] Create PII scrub utility that strips full_name and SSN from profile before external calls in apps/agent/lib/discovery/pii-scrub.ts
- [ ] T010 Wire TuitionLiftState and discovery_results type extensions in apps/agent/lib/state.ts (align with 003 data-model; requires 003 graph and state)

**Checkpoint**: Foundation ready—user story implementation can begin

---

## Phase 3: User Story 1 - Privacy-Safe Scholarship Search (Priority: P1) MVP

**Goal**: Transform profile into 3–5 anonymized queries; execute Tavily search; deduplicate; verify cycle eligibility; no PII leaves system.

**Independent Test**: Run discovery with profile containing name and SSN; verify (a) no name/SSN in outbound logs, (b) 3–5 queries generated, (c) all results verified or flagged.

### Implementation for User Story 1

- [ ] T011 [P] [US1] Create QueryGenerator that accepts AnonymizedProfile and returns 3–5 query strings via LLM in apps/agent/lib/discovery/query-generator.ts
- [ ] T012 [P] [US1] Create TavilyClient with search(query) method calling POST https://api.tavily.com/search; search_depth advanced, max_results 10 in apps/agent/lib/discovery/tavily-client.ts
- [ ] T013 [US1] Add rate-limit delay (DISCOVERY_SEARCH_BATCH_DELAY_MS, default 2000ms) between Tavily calls in apps/agent/lib/discovery/tavily-client.ts
- [ ] T014 [P] [US1] Create Deduplicator that merges by URL, keeps highest Tavily relevance score and merges snippets (runs pre-TrustScorer; trust_score applied later in Verify) in apps/agent/lib/discovery/deduplicator.ts
- [ ] T015 [P] [US1] Create CycleVerifier that computes academic year from Date, verifies deadline in cycle, returns verification_status (verified|ambiguous_deadline|needs_manual_review|potentially_expired) and active (false when deadline past today per Constitution §8) in apps/agent/lib/discovery/cycle-verifier.ts
- [ ] T016 [US1] Implement Advisor_Search node: load profile, scrub PII, call QueryGenerator, TavilyClient (rate-limited), Deduplicator; write raw results to state.discovery_results in apps/agent/lib/nodes/advisor-search.ts
- [ ] T017 [US1] Ensure graph checkpoints after Advisor_Search (separate node from Advisor_Verify) in apps/agent/lib/graph.ts
- [ ] T018 [US1] Wire CycleVerifier into Advisor_Verify for each result; set verification_status; flag ambiguous for manual review in apps/agent/lib/nodes/advisor-verify.ts

**Checkpoint**: User Story 1—privacy-safe search with cycle verification works independently

---

## Phase 4: User Story 2 - Trust-Scored Results with Transparent Rationale (Priority: P1)

**Goal**: Every result has trust_score 0–100 and Trust Report; fee-required auto-fail; .edu/.gov weighted higher.

**Independent Test**: Run discovery; verify every result has trust_score and trust_report; fee-required scholarships score 0 and excluded from active.

### Implementation for User Story 2

- [ ] T019 [P] [US2] Create TrustScorer: domain tier (.edu/.gov→high, .com/.org→vetted/under_review), longevity (WHOIS fallback 12), fee check; output trust_score, trust_report in apps/agent/lib/discovery/trust-scorer.ts
- [ ] T020 [US2] Add fee-detection logic (application fee, processing fee, guarantee fee) to TrustScorer; set fee_check=fail and trust_score=0 when detected in apps/agent/lib/discovery/trust-scorer.ts
- [ ] T021 [US2] Integrate TrustScorer into Advisor_Verify; exclude fee_check=fail from active discovery_results; include trust_report in each result in apps/agent/lib/nodes/advisor-verify.ts
- [ ] T022 [US2] Create ScholarshipUpsert: INSERT ON CONFLICT(url) DO UPDATE for trust_score, metadata in apps/agent/lib/discovery/scholarship-upsert.ts
- [ ] T023 [US2] Persist verified results to scholarships table with metadata (source_url, snippet, scoring_factors, trust_report, categories, verification_status) in apps/agent/lib/discovery/scholarship-upsert.ts
- [ ] T024 [US2] Extend GET /api/discovery/results response to include trustReport, verificationStatus, categories per contracts/discovery-internals.md in apps/web/app/api/discovery/results/

**Checkpoint**: User Story 2—Trust Report on every result; fee-required excluded

---

## Phase 5: User Story 3 - SAI-Aware Prioritization and Gap Alignment (Priority: P2)

**Goal**: Rank Last-Dollar and need-based scholarships by SAI eligibility; assign need_match_score.

**Independent Test**: Run discovery for student with known SAI; verify SAI-eligible scholarships rank higher.

### Implementation for User Story 3

- [ ] T025 [P] [US3] Create need_match_score calculator comparing student SAI to scholarship eligibility (0–100) in apps/agent/lib/discovery/need-match-scorer.ts
- [ ] T026 [US3] Integrate need_match_score into Advisor_Verify; assign to each DiscoveryResult; order results by SAI alignment + trust_score in apps/agent/lib/nodes/advisor-verify.ts
- [ ] T027 [US3] Store multiple categories in metadata.categories when scholarship fits need_based and field_specific in apps/agent/lib/discovery/scholarship-upsert.ts

**Checkpoint**: User Story 3—SAI-aware ranking and multi-category support

---

## Phase 6: User Story 4 - Durable State and Resumable Discovery (Priority: P2)

**Goal**: Checkpoint after Scout; rate limit; resume does not re-run search.

**Independent Test**: Simulate verification failure after Scout; resume; Scout must not re-run.

### Implementation for User Story 4

- [ ] T028 [US4] Verify PostgresSaver checkpoint configuration; ensure checkpoint writes after Advisor_Search node in apps/agent/lib/checkpointer.ts
- [ ] T029 [US4] Add resumability test: invoke graph, stop after Scout, resume with same thread_id; assert Scout not re-invoked in apps/agent/tests/ or manual verification
- [ ] T030 [US4] Document DISCOVERY_SEARCH_BATCH_DELAY_MS in quickstart.md and .env.example in specs/004-advisor-discovery-engine/quickstart.md

**Checkpoint**: User Story 4—durable state and rate limiting verified

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, edge cases, documentation

- [ ] T031 [P] Handle zero search results: return empty discovery_results without error in apps/agent/lib/nodes/advisor-search.ts
- [ ] T032 [P] Handle Tavily timeout/failure: log error, update error_log, route to SafeRecovery per 003 in apps/agent/lib/nodes/advisor-search.ts
- [ ] T033 [P] Add updated_at to scholarship upsert for conflict update in apps/agent/lib/discovery/scholarship-upsert.ts
- [ ] T034 Run quickstart.md validation; verify env vars and local discovery flow in specs/004-advisor-discovery-engine/quickstart.md
- [ ] T035 Validate SC-006 (discovery results within 5 min): run end-to-end discovery under normal load and document timing; defer formal load test if infra not ready

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies—start immediately
- **Phase 2 (Foundational)**: Depends on Setup—blocks all user stories
- **Phase 3 (US1)**: Depends on Foundational—privacy-safe search
- **Phase 4 (US2)**: Depends on US1 (Advisor_Verify node structure)—Trust scoring
- **Phase 5 (US3)**: Depends on US2—need_match_score and ranking
- **Phase 6 (US4)**: Depends on US1 (graph structure)—checkpoint and rate limit
- **Phase 7 (Polish)**: Depends on US1–US4 complete

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|-------------------|
| US1   | Foundational | — |
| US2   | US1        | — |
| US3   | US2        | US4 (partial) |
| US4   | US1        | US3 (partial) |

### Within Each User Story

- Schemas and pure modules (marked [P]) can run in parallel
- Nodes depend on discovery modules
- Advisor_Verify depends on TrustScorer, CycleVerifier, ScholarshipUpsert

### Parallel Opportunities

- T006, T007, T008, T009 can run in parallel (Phase 2)
- T011, T012, T014, T015 can run in parallel (Phase 3)
- T019 can run parallel to T020 prep (Phase 4)
- T025 can run early (Phase 5)
- T031, T032, T033 can run in parallel (Phase 7)

---

## Parallel Example: User Story 1

```bash
# Launch discovery modules together:
Task T011: "Create QueryGenerator in apps/agent/lib/discovery/query-generator.ts"
Task T012: "Create TavilyClient in apps/agent/lib/discovery/tavily-client.ts"
Task T014: "Create Deduplicator in apps/agent/lib/discovery/deduplicator.ts"
Task T015: "Create CycleVerifier in apps/agent/lib/discovery/cycle-verifier.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: US1—Privacy-safe search
4. Complete Phase 4: US2—Trust-scored results
5. **STOP and VALIDATE**: End-to-end discovery with trust reports
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Base ready
2. US1 → Privacy-safe search + cycle verification (partial MVP)
3. US2 → Trust reports + fee exclusion (full core MVP)
4. US3 → SAI ranking
5. US4 → Checkpoint/resumability verification
6. Polish → Edge cases, docs

### Suggested MVP Scope

**MVP = Phase 1 + 2 + 3 + 4** (Setup, Foundational, US1, US2). Delivers complete discovery with privacy, trust scoring, and persistence.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps to spec user stories for traceability
- Tests not explicitly requested in spec—no TDD test tasks included
- packages/database and apps/agent may be created by 002/003; 004 extends them
- Commit after each task or logical group
