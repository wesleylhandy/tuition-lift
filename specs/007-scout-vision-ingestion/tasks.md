# Tasks: Unified Manual Scout & Vision Ingestion

**Input**: Design documents from `/specs/007-scout-vision-ingestion/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Include exact file paths in descriptions

## Path Conventions

- **Turborepo (TuitionLift)**: `apps/web/`, `apps/agent/`, `packages/database/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and storage

- [x] T001 Install Scout dependencies (pdf-parse, fuzzball) in apps/agent via pnpm add pdf-parse fuzzball --filter apps/agent
- [x] T002 Create scout_uploads Storage bucket in Supabase with RLS policies per data-model.md §3 (path pattern {user_id}/{uuid}.{ext}, private, 10 MB max)
- [x] T003 [P] Add scout_runs migration in packages/database/supabase/migrations/ (id, user_id, step, result jsonb, created_at, updated_at) with RLS for authenticated users
- [x] T004 [P] Add SCOUT_MAX_FILE_SIZE_MB, SCOUT_DEDUP_SIMILARITY_THRESHOLD, SCOUT_VISION_MODEL to env validation in apps/agent/lib/env.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create Scout Zod schemas (ScoutInputSchema, ExtractedScholarshipDataSchema, ScoutStepSchema, verification_status enum) in apps/agent/lib/scout/schemas.ts or packages/database
- [x] T006 Implement POST /api/scout/process route in apps/web/app/api/scout/process/route.ts — authenticate, validate JSON body (input_type, url|name|file_path), create scout_run, directly invoke manual_research_node (per research §12), return run_id
- [x] T007 Implement GET /api/scout/status/[runId] route in apps/web/app/api/scout/status/[runId]/route.ts — authenticate, verify run belongs to user, return step, message, result from scout_runs
- [x] T008 Create manual_research_node (or Scout subgraph) in apps/agent/lib/nodes/manual-research.ts — accepts ScoutInput, for URL/name: call Tavily + TrustScorer + CycleVerifier; for file: delegate to extract; update scout_runs step/result
- [x] T009 Implement URL/name Scout flow in manual-research node — use TavilyClient.search with URL or name as query (per research §11), score trust via TrustScorer, verify cycle; include scoring_factors and trust_report in ExtractedScholarshipData; write to scout_runs result, set step=complete
- [x] T010 Create ScoutModal shell in apps/web/components/dashboard/scout/scout-modal.tsx — Dialog with open/onOpenChange, composes placeholder for entry + HUD + form per contracts/scout-ui-components.md
- [x] T011 Create ScoutEntryPoint shell in apps/web/components/dashboard/scout/scout-entry-point.tsx — placeholder composing input field + drop zone slots per contract
- [x] T012 Add Scout CTA and modal trigger to dashboard (e.g., Add Scholarship button) in apps/web/app/(auth)/dashboard/page.tsx or Application Tracker component

**Checkpoint**: Foundation ready — Scout API and modal shell exist; URL/name flow can be wired

---

## Phase 3: User Story 1 & 4 — Add by URL/Name + Verification (Priority: P1) 🎯 MVP

**Goal**: Student enters scholarship URL or name; system searches, verifies, presents data for confirmation; student confirms to persist.

**Independent Test**: Enter a known scholarship URL, observe search-and-verify flow, see verification form, confirm → scholarship and application created.

### Implementation for US1 + US4

- [x] T013 [P] [US1] Implement ScoutInputField in apps/web/components/dashboard/scout/scout-input-field.tsx — input for name/URL, placeholder "Enter scholarship name or URL", onSubmit callback
- [x] T014 [US1] Wire ScoutInputField to startScoutProcess in apps/web/lib/actions/scout.ts — startScoutProcess calls POST /api/scout/process with input_type url|name, returns run_id
- [x] T015 [US1] Implement status polling in ScoutModal (or custom hook) — poll GET /api/scout/status/{runId} every 1–2s until step=complete or error; store step, message, result in state
- [x] T016 [P] [US4] Implement ScoutField in apps/web/components/dashboard/scout/scout-field.tsx — label, value, onChange, researchRequired prop, type text|number|date|url; aria-describedby for research required
- [x] T017 [US4] Implement ScoutVerificationForm in apps/web/components/dashboard/scout/scout-verification-form.tsx — maps ExtractedScholarshipData to ScoutField components, research_required styling, Confirm and Cancel buttons
- [x] T018 [US4] Implement confirmScoutScholarship Server Action in apps/web/lib/actions/scout.ts — Zod validate, map ExtractedScholarshipData to DiscoveryResult + ScholarshipMetadata per data-model §4, upsert scholarship (reuse 004 pattern), insert application with getCurrentAcademicYear(), return scholarshipId and applicationId
- [x] T019 [US1] Integrate Scout flow in ScoutModal — show ScoutEntryPoint initially; on submit show processing state then ScoutVerificationForm when complete; on confirm call confirmScoutScholarship, close modal, refresh tracker
- [x] T020 [US1] Add cancel/dismiss handling — closing modal without confirm discards temp data; no scholarship or application created

**Checkpoint**: US1 + US4 complete — Add by URL/name with verification form; independently testable

---

## Phase 4: User Story 2 — Add by File Upload (Priority: P1)

**Goal**: Student uploads PDF, PNG, or JPG; system extracts scholarship data, verifies, presents for confirmation.

**Independent Test**: Drag-and-drop a PDF or image with scholarship info; observe "Reading Document" step; see extracted fields; confirm and persist.

### Implementation for US2

- [x] T021 [P] [US2] Implement ScoutDropZone in apps/web/components/dashboard/scout/scout-drop-zone.tsx — drag-and-drop area, accept application/pdf image/png image/jpeg, onFileSelect callback, max 10 MB, reject with clear message for invalid type/size
- [x] T022 [US2] Implement uploadScoutFile Server Action in apps/web/lib/actions/scout.ts — validate MIME (PDF/PNG/JPG) and size ≤ 10 MB, upload to scout_uploads/{user_id}/{uuid}.{ext}, return path or error
- [x] T023 [US2] Implement extract-vision in apps/agent/lib/scout/extract-vision.ts — GPT-4o vision extraction from base64 image, return ExtractedScholarshipData with research_required flags
- [x] T024 [US2] Implement extract-pdf in apps/agent/lib/scout/extract-pdf.ts — pdf-parse for digital PDFs (text density check); route to Vision LLM if scanned; return ExtractedScholarshipData
- [x] T025 [US2] Wire file path to manual_research node — when input_type=file, fetch from Storage, detect MIME (PDF vs image), call extract-pdf or extract-vision; verify extracted URL with CycleVerifier when present; update scout_runs
- [x] T026 [US2] Integrate ScoutDropZone into ScoutEntryPoint — on file select call uploadScoutFile, then startScoutProcess with file_path; show processing
- [x] T027 [US2] Handle extraction edge cases — unsupported file type rejection, "No data found" error state with retry/manual option, poor quality scan (flag research_required)

**Checkpoint**: US2 complete — Add by file upload; independently testable

---

## Phase 5: User Story 3 — Real-Time Processing Feedback (Priority: P2)

**Goal**: Student sees step-by-step processing overlay (HUD) with Coach/Advisor persona messages.

**Independent Test**: Trigger Scout flow; verify overlay shows "Reading Document", "Searching official sources", "Calculating Trust Score" steps and persona messages.

### Implementation for US3

- [x] T028 [P] [US3] Implement ScoutProcessingHUD in apps/web/components/dashboard/scout/scout-processing-hud.tsx — displays step badges and optional message; props: step, message, persona (coach|advisor)
- [x] T029 [US3] Add persona message generation in manual_research node — Coach messages for encouragement (e.g., "Nice scouting! I'm scanning that flyer now"); Advisor for facts (e.g., "I've extracted a $2,000 award. Deadline verified March 15, 2026"); store in scout_runs or API response
- [x] T030 [US3] Wire ScoutProcessingHUD to ScoutModal — show HUD when step in (reading_document, searching_sources, calculating_trust); pass step, message from status poll

**Checkpoint**: US3 complete — Processing HUD with persona feedback; independently testable

---

## Phase 6: User Story 5 — Deduplication and Cycle Freshness (Priority: P2)

**Goal**: Fuzzy match warns before save; past due dates flagged as "Potentially Expired".

**Independent Test**: Attempt to add scholarship with title similar to existing → see "This may already be in your list"; add one with past deadline → see "Potentially Expired" warning.

### Implementation for US5

- [x] T031 [US5] Implement fuzzy-dedup in apps/agent/lib/scout/fuzzy-dedup.ts — checkFuzzyDuplicate(title, userId) queries user's scholarship titles, uses fuzzball.ratio, returns match if ≥ threshold (0.85)
- [x] T032 [US5] Integrate fuzzy check into confirmScoutScholarship — before upsert, call checkFuzzyDuplicate; if match return { success: false, duplicate: true, existingTitle }; add "Add Anyway" UX in verification form
- [x] T033 [US5] Add potentially_expired handling in confirmScoutScholarship — when deadline < today, include potentiallyExpired: true in result; show warning in verification form but allow save; flag verification_status when persisting
- [x] T034 [US5] Add DuplicateWarningBanner in ScoutVerificationForm per contracts/scout-ui-components.md — "This scholarship may already be in your list: [title]" with Add Anyway | Cancel buttons

**Checkpoint**: US5 complete — Dedup and cycle freshness; independently testable

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, accessibility, validation

- [x] T035 [P] Add error state UI in ScoutModal — extraction failed, URL unreachable, "No data found" with retry and manual entry options per spec edge cases
- [x] T036 Add loading/empty state handling — skeleton or spinner during status poll; no mock data per Constitution
- [x] T037 Verify WCAG 2.1 AA for Scout components — focus trap in modal, aria labels, contrast; semantic HTML (button, input, dialog)
- [ ] T038 Run quickstart.md verification — manual test: URL path, file path, dedup, expired; confirm Application Tracker updates (see quickstart.md §Verification)
- [x] T039 [P] Add prompt-injection hardening to Scout extraction — apps/agent/lib/scout/prompt-injection-hardening.ts: delimiters (DOCUMENT_CONTENT_BEGIN/END), ignore-instructions, system message for text extraction; update extract-vision.ts extractFromText (system+user) and extractFromVision (hardened prompt) per Constitution §4

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1+US4)**: Depends on Phase 2 — MVP
- **Phase 4 (US2)**: Depends on Phase 2; benefits from Phase 3 (verification form already built)
- **Phase 5 (US3)**: Depends on Phase 2; can enhance Phase 3 or 4 flow
- **Phase 6 (US5)**: Depends on Phase 3 (confirmScoutScholarship exists)
- **Phase 7 (Polish)**: Depends on all story phases

### User Story Dependencies

- **US1 (URL/Name)**: After Foundational — no other story dependency
- **US4 (Verification)**: Built with US1; required for US1 and US2
- **US2 (File)**: After Foundational; uses same verification form as US1
- **US3 (HUD)**: After Foundational; enhances US1 and US2 flows
- **US5 (Dedup/Cycle)**: After US1 (confirm action exists)

### Parallel Opportunities

- Phase 1: T003 and T004 [P]
- Phase 2: T010 and T011 [P] after T005–T009
- Phase 3: T013 and T016 [P]; T017 can start after T016
- Phase 4: T021, T023, T024 [P]
- Phase 5: T028 [P]
- Phase 7: T035 [P]

---

## Parallel Example: User Story 1

```bash
# Models/UI components in parallel:
T013: ScoutInputField
T016: ScoutField

# Then sequential:
T014: startScoutProcess
T015: Status polling
T017: ScoutVerificationForm
T018: confirmScoutScholarship
T019: Integration
```

---

## Implementation Strategy

### MVP First (Phase 1 + 2 + 3)

1. Complete Phase 1: Setup (bucket, migration, deps)
2. Complete Phase 2: Foundational (schemas, API, agent URL/name flow, modal shell)
3. Complete Phase 3: US1 + US4 (URL/name + verification + confirm)
4. **STOP and VALIDATE**: Enter URL, see verification form, confirm → application in tracker
5. Deploy/demo MVP

### Incremental Delivery

1. MVP (Phases 1–3) → Add by URL/name working
2. Add Phase 4 (US2) → Add by file working
3. Add Phase 5 (US3) → Processing HUD enhancement
4. Add Phase 6 (US5) → Dedup and cycle freshness
5. Add Phase 7 → Polish and edge cases

### Task Count Summary

| Phase | Story | Task Count |
|-------|-------|------------|
| 1 | Setup | 4 |
| 2 | Foundational | 8 |
| 3 | US1 + US4 | 8 |
| 4 | US2 | 7 |
| 5 | US3 | 3 |
| 6 | US5 | 4 |
| 7 | Polish | 4 |
| **Total** | | **38** |
