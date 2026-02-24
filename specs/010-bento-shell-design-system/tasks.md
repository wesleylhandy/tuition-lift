# Tasks: TuitionLift Bento Shell and Design System

**Input**: Design documents from `/specs/010-bento-shell-design-system/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependencies

- [x] T001 Add lucide-react dependency in apps/web/package.json
- [x] T002 [P] Add --color-slate (#64748b) to @theme and :root in apps/web/app/globals.css

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Design system and auth that MUST be complete before user story implementation

**Checkpoint**: Foundation ready — user story implementation can begin

- [x] T003 Load Playfair Display and Inter via next/font/google in apps/web/app/layout.tsx and assign to --font-heading and --font-body
- [x] T004 Ensure 16px base font size on html or body in apps/web/app/globals.css
- [x] T005 Extend middleware matcher to include /dashboard and /dashboard/* in apps/web/middleware.ts; redirect unauthenticated users to / (landing)
- [x] T005b [P] Create minimal / placeholder route (sign-in CTA) in apps/web/app/page.tsx so auth redirect has valid target; full landing design deferred
- [x] T006 Create SectionShell component with status (loading|error|content), onRetry, skeletonVariant, title in apps/web/components/dashboard/section-shell.tsx
- [x] T007 Implement SectionShell error state with user-friendly message and 44×44px retry button in apps/web/components/dashboard/section-shell.tsx

---

## Phase 3: User Story 1 - View Premium Academic Dashboard Shell (Priority: P1) — MVP

**Goal**: Authenticated user sees cohesive branded layout with global header, welcome area, bento grid (three sections), and stats row; all sections show loading skeletons.

**Independent Test**: Load /dashboard as authenticated user; verify header, welcome, bento grid, stats row render with skeletons; verify unauthenticated redirect to / (landing).

### Implementation for User Story 1

- [x] T008 [P] [US1] Create LogoPlaceholder with inline SVG "TL" monogram in apps/web/components/dashboard/logo-placeholder.tsx
- [x] T009 [P] [US1] Create generic list-skeleton (list-like structure) in apps/web/components/dashboard/skeletons/list-skeleton.tsx
- [x] T010 [P] [US1] Create generic card-skeleton (card-like structure) in apps/web/components/dashboard/skeletons/card-skeleton.tsx
- [x] T011 [P] [US1] Create welcome-skeleton (text-line variant) in apps/web/components/dashboard/skeletons/welcome-skeleton.tsx
- [x] T012 [P] [US1] Create stats-skeleton (four-card row variant) in apps/web/components/dashboard/skeletons/stats-skeleton.tsx
- [x] T013 [P] [US1] Create deadline-calendar-skeleton (calendar grid + list variant) in apps/web/components/dashboard/skeletons/deadline-calendar-skeleton.tsx
- [x] T014 [US1] Create GlobalHeader with LogoPlaceholder, search bar placeholder, notification center (Lucide Bell), user profile/account dropdown placeholder (for Parent Link 009), DebtLiftedRing in apps/web/components/dashboard/global-header.tsx
- [x] T015 [US1] Update BentoGrid to grid-cols-12 at lg; update BentoGridItem colSpan to support 1–12; apply wireframe-driven mapping (Game Plan 4, Discovery Feed 5, Deadline Calendar 3 cols) per contracts/component-shell.md in apps/web/components/dashboard/bento-grid.tsx
- [x] T016 [US1] Create WelcomeAreaShell using SectionShell and welcome-skeleton in apps/web/components/dashboard/welcome-area-shell.tsx
- [x] T017 [US1] Create StatsRowShell using SectionShell and stats-skeleton in apps/web/components/dashboard/stats-row-shell.tsx
- [x] T018 [US1] Create DeadlineCalendarShell using SectionShell and deadline-calendar-skeleton in apps/web/components/dashboard/deadline-calendar-shell.tsx
- [x] T019 [US1] Compose dashboard page with GlobalHeader, WelcomeAreaShell, BentoGrid (GamePlan, MatchInbox, DeadlineCalendarShell wrapped in SectionShell), StatsRowShell; omit ReconnectionIndicator for now in apps/web/app/(auth)/dashboard/page.tsx. Refactor GamePlan to accept optional `showDebtLifted?: boolean` (default true); pass false when composing for 010 since header owns Debt Lifted.
- [x] T020 [US1] Wire SectionShell skeletonVariants: list (generic list-skeleton) for GamePlan, card (generic card-skeleton) for MatchInbox, calendar for DeadlineCalendar; default status=loading in apps/web/app/(auth)/dashboard/page.tsx

**Checkpoint**: User Story 1 complete — dashboard shell renders with all sections in skeleton state; auth redirect works.

---

## Phase 4: User Story 2 - Use Accessible Interactive Elements (Priority: P2)

**Goal**: All interactive elements meet WCAG 2.1 AA; 44×44px touch targets; focus indicators visible.

**Independent Test**: Run axe-core or Lighthouse on /dashboard; zero critical/serious violations; verify tap targets and focus order.

### Implementation for User Story 2

- [x] T021 [US2] Add focus-visible ring to search bar, notification bell, Debt Lifted area, and retry button in apps/web/components/dashboard/global-header.tsx and section-shell.tsx
- [x] T022 [US2] Ensure all interactive elements (search input, bell, logo link) meet min 44×44px touch target in apps/web/components/dashboard/global-header.tsx
- [x] T023 [US2] Add aria-label to search bar and notification center; ensure notification badge hidden when count=0, visible when count>0 in apps/web/components/dashboard/global-header.tsx
- [x] T024 [US2] Verify 16px base font and color contrast (navy on off-white, mint accents) in apps/web/app/globals.css; fix any contrast failures

**Checkpoint**: User Story 2 complete — accessibility audit passes; touch targets verified.

---

## Phase 5: User Story 3 - Responsive Bento Grid Adapts to Viewport (Priority: P3)

**Goal**: Layout reflows at 375px, 768px, 1280px without horizontal scroll.

**Independent Test**: Resize viewport to 375px, 768px, 1280px; confirm no horizontal overflow; sections stack or resize.

### Implementation for User Story 3

- [x] T025 [US3] Verify BentoGrid responsive breakpoints (1/2/4/12 cols), wireframe-driven colSpan mapping (Game Plan 4, Discovery Feed 5, Calendar 3), and BentoGridItem colSpan at sm/md/lg in apps/web/components/dashboard/bento-grid.tsx
- [x] T026 [US3] Verify GlobalHeader reflows on mobile (e.g., search bar full-width, notifications compact) in apps/web/components/dashboard/global-header.tsx
- [x] T027 [US3] Test layout at 375px, 768px, 1280px; fix horizontal overflow if present in apps/web/app/(auth)/dashboard/page.tsx

**Checkpoint**: User Story 3 complete — layout adapts without horizontal scroll at all breakpoints.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification and cleanup

- [x] T028 Run Lighthouse on /dashboard; achieve Accessibility ≥ 90; document Performance and Best Practices scores
- [x] T029 Run quickstart.md verification steps (auth redirect, shell render, viewport test)
- [x] T030 Verify FR-017: SectionShell, list-skeleton, card-skeleton are generic and reusable (no section-specific logic that would block adding new bento sections)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on T001–T002 — blocks all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — core shell
- **Phase 4 (US2)**: Depends on US1 — a11y applies to shell components
- **Phase 5 (US3)**: Depends on US1 — responsive applies to shell
- **Phase 6 (Polish)**: Depends on US1, US2, US3 (T028, T029, T030)

### User Story Dependencies

- **US1 (P1)**: After Foundational — no dependency on US2/US3
- **US2 (P2)**: After US1 — a11y verification of US1 components
- **US3 (P3)**: After US1 — responsive verification of US1 layout

### Parallel Opportunities

- T001, T002 can run in parallel
- T005b can run in parallel with T003–T007 (different files)
- T008–T013 can run in parallel (logo + skeletons)
- US2 and US3 can run in parallel after US1 (different concerns)

---

## Parallel Example: User Story 1

```bash
# After T006–T007 (SectionShell), run in parallel:
Task T008: "Create LogoPlaceholder in logo-placeholder.tsx"
Task T009: "Create generic list-skeleton in skeletons/list-skeleton.tsx"
Task T010: "Create generic card-skeleton in skeletons/card-skeleton.tsx"
Task T011: "Create welcome-skeleton in skeletons/welcome-skeleton.tsx"
Task T012: "Create stats-skeleton in skeletons/stats-skeleton.tsx"
Task T013: "Create deadline-calendar-skeleton in skeletons/deadline-calendar-skeleton.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Load dashboard, verify auth redirect, shell layout, skeletons
5. Demo if ready

### Incremental Delivery

1. Setup + Foundational → design system and auth ready
2. US1 → shell with skeletons → Demo (MVP)
3. US2 → a11y verification → Demo
4. US3 → responsive verification → Demo
5. Polish → Lighthouse, quickstart validation
