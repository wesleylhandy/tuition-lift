# Tasks: Manual Scout Flyer-to-Fact UI and Dashboard Integration

**Input**: Design documents from `/specs/016-manual-scout-ui/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**007 dependency**: Run `specs/007-scout-vision-ingestion/tasks.md` T038 (quickstart verification) before or in parallel to verify backend. 016 T031 validates the combined 007+016 flow.

**Tests**: Not requested in spec; manual verification per quickstart.md.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Include exact file paths in descriptions

## Path Conventions

- **Turborepo (TuitionLift)**: `apps/web/`, `packages/database/`
- Scout components: `apps/web/components/dashboard/scout/`
- Server actions: `apps/web/lib/actions/scout.ts`
- Migrations: `packages/database/supabase/migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, rate limit schema, and scholarship provenance

- [ ] T001 Create `scout_submissions` migration in `packages/database/supabase/migrations/00000000000040_scout_submissions.sql` per contracts/scout-rate-limit-api.md §3 (CREATE TABLE, RLS, UNIQUE(user_id, academic_year))
- [ ] T001b [P] Create `scholarships_source` migration in `packages/database/supabase/migrations/00000000000041_scholarships_source.sql`: add `source text` with CHECK (source IN ('manual','search','warehouse','institution')); nullable for backward compat per data-model.md §2
- [ ] T002 [P] Add `SCOUT_SUBMISSION_LIMIT` env validation (default 15) in `apps/web` startup or Zod schema

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Rate limit infrastructure that MUST complete before confirmation flow works

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Implement `getOrCreateScoutSubmission(userId, academicYear)` and `getCurrentAcademicYear()` in `packages/database/` (or use existing) for `scout_submissions` upsert
- [ ] T004 Implement `checkScoutLimit` Server Action in `apps/web/lib/actions/scout.ts` returning `CheckScoutLimitResult` per contracts/scout-rate-limit-api.md §1
- [ ] T005 Extend `confirmScoutScholarship` in `apps/web/lib/actions/scout.ts`: add rate-limit check before upsert; increment `scout_submissions.count` on success; set `source = 'manual'` on scholarship upsert; return `{ success: false; limitReached: true }` when count ≥ limit per data-model.md §6

**Checkpoint**: Rate limit enforced; confirmation flow ready for UI integration

---

## Phase 3: User Story 1 — Scout Entry from Dashboard (Priority: P1) 🎯 MVP

**Goal**: Authenticated student sees prominent Scout FAB in bottom-right; clicking opens Manual Scout modal.

**Independent Test**: Log in → dashboard → FAB visible → click → modal opens with "Manual Scout" / "Flyer-to-Fact Workspace" → close returns to dashboard. When not logged in, FAB hidden.

- [ ] T006 [P] [US1] Create `ScoutFAB` in `apps/web/components/dashboard/scout/scout-fab.tsx` (fixed bottom-right, min 44×44px, opens modal on click) per contracts/scout-ui-016.md §1
- [ ] T007 [US1] Create client wrapper (e.g. `ScoutDashboardEntry`) composing `ScoutFAB` + `ScoutModal`; add to `apps/web/app/(auth)/dashboard/page.tsx`; auth-gate FAB via session/userId (hide when not authenticated)
- [ ] T008 [US1] Update `ScoutModal` title to "Manual Scout" and subtitle to "Flyer-to-Fact Workspace" in `apps/web/components/dashboard/scout/scout-modal.tsx`

**Checkpoint**: User Story 1 — Scout entry discoverable and opens modal

---

## Phase 4: User Story 2 — Input Selection View (Priority: P1)

**Goal**: Three distinct cards (Paste URL, Upload PDF, Snap Photo); selecting each triggers corresponding sub-flow.

**Independent Test**: Open modal → three cards visible (icons, labels) → Paste URL shows URL input → Upload PDF opens file picker (PDF) → Snap Photo opens camera or image picker.

- [ ] T009 [P] [US2] Create `ScoutInputCard` in `apps/web/components/dashboard/scout/scout-input-card.tsx` (Paste URL card, icon, min 44×44px, expands to input; accepts URL or scholarship name; send `input_type: "url"` or `"name"` per 007)
- [ ] T010 [P] [US2] Create `ScoutUploadCard` in `apps/web/components/dashboard/scout/scout-upload-card.tsx` (Upload PDF card, icon, file picker `accept="application/pdf"`)
- [ ] T011 [P] [US2] Create `ScoutPhotoCard` in `apps/web/components/dashboard/scout/scout-photo-card.tsx` (Snap Photo card, icon, camera or `accept="image/png,image/jpeg"`)
- [ ] T012 [US2] Replace `ScoutEntryPoint` in-place in `apps/web/components/dashboard/scout/scout-entry-point.tsx` with three-card composition (ScoutInputCard, ScoutUploadCard, ScoutPhotoCard); wire cards to `onSubmit` with `input_type: url | file`; store `File` for preview per research.md §1
- [ ] T013 [US2] Wire cards to Scout flow: URL/name → `onSubmit({ input_type: "url", url })` or `onSubmit({ input_type: "name", name })` (detect URL vs name); PDF/Photo → `uploadScoutFile` then `onSubmit({ input_type: "file", file_path })`; store `sourceFile`/`sourceUrl` in ScoutModal state for verification view

**Checkpoint**: User Story 2 — Three-card input selection working

---

## Phase 5: User Story 3 — Side-by-Side Verification Flow (Priority: P1)

**Goal**: After extraction, left panel shows document preview (or fallback); right panel shows verification form; user edits and confirms to persist.

**Independent Test**: Submit URL/PDF/image → extraction completes → side-by-side layout (preview left, form right) → AI-extracted values visually distinguished → edit field → Confirm → scholarship + application created. Cancel → no persistence.

- [ ] T014 [P] [US3] Create `ScoutVerificationView` in `apps/web/components/dashboard/scout/scout-verification-view.tsx` (grid/flex: document left, form right; stacked on mobile per contracts/scout-ui-016.md §4)
- [ ] T015 [US3] Implement document preview left panel in `ScoutVerificationView`: URL → iframe/link fallback; PDF → `URL.createObjectURL` + iframe or fallback; Image → `URL.createObjectURL` + `<img>`; fallback: file name + "Preview unavailable" per research.md §2
- [ ] T016 [US3] Integrate `ScoutVerificationView` into `ScoutModal` in `apps/web/components/dashboard/scout/scout-modal.tsx`; pass `sourcePreview` (blobUrl/url) and form props; replace current verification layout
- [ ] T017 [US3] Visually distinguish AI-extracted values and display FR-009 cycle/deadline flags in verification form (`scout-verification-form.tsx`): ghost text or highlight for extracted values; show `verification_status` from ExtractedScholarshipData (e.g., "Potentially Expired", "ambiguous_deadline") via badge or field hint per spec edge case
- [ ] T018 [US3] Handle "Enter manually" after extraction fail: show same verification view with empty form; user fills all fields and confirms
- [ ] T019 [US3] Add rate-limit check before confirm: call `checkScoutLimit` (optional pre-check); handle `limitReached` in confirm result with friendly message and "Request more" option in `ScoutModal`

**Checkpoint**: User Story 3 — Verification flow with persistence works

---

## Phase 6: User Story 4 — Processing Feedback (Priority: P2)

**Goal**: Processing overlay with step indicators; cancel after ~30s; timeout at ~60s with retry / Enter manually.

**Independent Test**: Trigger extraction → processing overlay replaces input → step indicators visible → after 30s cancel appears → cancel returns to input → or wait 60s → timeout error with retry / Enter manually.

- [ ] T020 [US4] Extend `useScoutStatus` in `apps/web/lib/hooks/use-scout-status.ts`: track elapsed time; set `canCancel: true` at ~30s; set `timedOut: true` at ~60s, stop polling; add `cancel()`, `onTimeout`; use AbortController for fetch when canceling per contracts/scout-ui-016.md §6
- [ ] T021 [US4] Update `ScoutProcessingHUD` in `apps/web/components/dashboard/scout/scout-processing-hud.tsx`: add `canCancel`, `onCancel`, `timedOut` props; render cancel button when `canCancel`; when `timedOut` show "Extraction took too long" with Retry and Enter manually per contracts/scout-ui-016.md §5
- [ ] T022 [US4] Wire `useScoutStatus` cancel and timeout into `ScoutModal` in `apps/web/components/dashboard/scout/scout-modal.tsx`; on cancel return to input selection; on timeout show error state with retry/Enter manually

**Checkpoint**: User Story 4 — Processing feedback with cancel and timeout

---

## Phase 7: User Story 5 — Responsive and Accessible Experience (Priority: P2)

**Goal**: Modal full-screen on ≤640px; full keyboard navigability; WCAG 2.1 AA (contrast, touch targets, labels).

**Independent Test**: Resize to ≤640px → modal full-screen; Tab through elements → all reachable; Escape closes modal; touch targets ≥44×44px; labels for screen reader.

- [ ] T023 [P] [US5] Update `ScoutModal` responsive styles in `apps/web/components/dashboard/scout/scout-modal.tsx`: full-screen (`fixed inset-0`) on viewport ≤640px (Tailwind `max-sm:` or `sm:`); `max-w-4xl` on larger per research.md §6
- [ ] T024 [US5] Ensure `ScoutVerificationView` stacks vertically (document top, form below) on ≤640px in `apps/web/components/dashboard/scout/scout-verification-view.tsx`
- [ ] T025 [US5] Verify keyboard navigability: Tab through cards, form fields, buttons; Enter/Space activate; Escape closes modal; focus trap in modal (existing logic)
- [ ] T026 [US5] Verify touch targets ≥44×44px and Confirm action contrast (WCAG 2.1 AA) across Scout components
- [ ] T027 [US5] Add smooth modal entrance and view-transition animations without obstructing interaction in `apps/web/components/dashboard/scout/scout-modal.tsx`

**Checkpoint**: User Story 5 — Responsive and accessible

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, cleanup, validation

- [ ] T028 Reject unsupported file types with clear message in `ScoutUploadCard` / `ScoutPhotoCard` (PDF-only for upload; PNG/JPEG for photo)
- [ ] T029 Handle duplicate scholarship (fuzzy title match): notify user, offer add anyway or cancel per spec edge case
- [ ] T030 Reconcile ApplicationTracker "Add Scholarship" with Scout FAB: **Decision** — FAB is primary Scout entry; retain "Add Scholarship" as secondary entry that opens the same Scout modal (both trigger ScoutModal). Remove secondary only if UX testing shows redundancy.
- [ ] T031 Run quickstart.md validation: FAB, three cards, verification, cancel/timeout, responsive, rate limit, accessibility

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS confirmation flow
- **User Story 1 (Phase 3)**: Depends on Foundational — can use existing ScoutModal
- **User Story 2 (Phase 4)**: Depends on Phase 3 (modal opens) — replaces entry point
- **User Story 3 (Phase 5)**: Depends on Phase 4 (input flows) — verification view
- **User Story 4 (Phase 6)**: Depends on Phase 3 — extends processing; can parallel with US3
- **User Story 5 (Phase 7)**: Depends on Phase 3 — modal + verification; can parallel with US4
- **Polish (Phase 8)**: Depends on Phases 3–7

### User Story Dependencies

- **US1 (P1)**: After Foundational — no other story dependencies
- **US2 (P1)**: After US1 (modal opens)
- **US3 (P1)**: After US2 (input provides source for verification)
- **US4 (P2)**: After US1 — processing feedback; can develop with US3
- **US5 (P2)**: After US1 — responsive/a11y; can develop with US3/US4

### Parallel Opportunities

- T001, T001b, T002 can run in parallel (Phase 1)
- T009, T010, T011 can run in parallel
- T014 can start once ScoutVerificationView contract is clear
- T023, T024 can run in parallel
- US4 and US5 can be worked in parallel after US1

---

## Parallel Example: User Story 2

```bash
# Launch all three card components together:
Task T009: "Create ScoutInputCard in apps/web/components/dashboard/scout/scout-input-card.tsx"
Task T010: "Create ScoutUploadCard in apps/web/components/dashboard/scout/scout-upload-card.tsx"
Task T011: "Create ScoutPhotoCard in apps/web/components/dashboard/scout/scout-photo-card.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3)

1. Complete Phase 1: Setup (scout_submissions + scholarships.source migrations, env)
2. Complete Phase 2: Foundational (rate limit)
3. Complete Phase 3: US1 — Scout entry (FAB, modal)
4. Complete Phase 4: US2 — Three-card input
5. Complete Phase 5: US3 — Side-by-side verification
6. **STOP and VALIDATE**: Full flow (select → extract → verify → confirm)
7. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → rate limit ready
2. US1 → FAB + modal (minimal) → Test
3. US2 → Three cards → Test
4. US3 → Verification → Test (MVP!)
5. US4 → Processing feedback → Test
6. US5 → Responsive + a11y → Test
7. Polish → quickstart validation

### Parallel Team Strategy

- Developer A: US1 + US2 (entry + input)
- Developer B: Phase 2 + US3 (rate limit + verification)
- Developer C: US4 + US5 (processing + responsive)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story independently completable and testable
- 007 backend (POST /api/scout/process, GET /api/scout/status, uploadScoutFile) unchanged; this spec extends UI and confirmScoutScholarship
- Migrations: `packages/database/supabase/migrations/`; package name `@repo/db`
