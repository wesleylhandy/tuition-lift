# Tasks: TuitionLift Landing Page and Marketing UI

**Input**: Design documents from `/specs/011-landing-marketing-ui/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in spec; Lighthouse, axe-core, viewport checks per quickstart verification checklist.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Include exact file paths in descriptions

## Path Conventions

- **Turborepo (TuitionLift)**: `apps/web/`, `packages/database/`
- Design tokens from 010-bento-shell-design-system: `apps/web/app/globals.css`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure feature prerequisites and create component structure

- [x] T001 Verify 010-bento-shell-design-system complete: design tokens (navy, electric-mint, off-white), fonts (Playfair, Inter), globals.css in apps/web/app/globals.css
- [x] T002 Create apps/web/components/landing/ directory for landing section components

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database, Server Actions, and shared infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create migration 00000000000032_landing_stats.sql with landing_stats table (id, stat_key UNIQUE, total_debt_lifted_cents, student_count, match_rate_percent, updated_at), RLS public SELECT, service-role write in packages/database/supabase/migrations/
- [x] T004 Create migration 00000000000033_testimonials.sql with testimonials table (id, quote CHECK (char_length(quote) <= 500), star_rating 1-5, avatar_url, student_name, class_year, display_order, created_at), RLS public SELECT, service-role write, idx_testimonials_display_order in packages/database/supabase/migrations/
- [x] T005 Run pnpm --filter @repo/db db:push and db:generate; verify database.types.ts includes landing_stats and testimonials
- [x] T006 [P] Create landing-stats Zod schema (total_debt_lifted_cents >= 0, student_count >= 0, match_rate_percent 0–100) in packages/database/src/schema/landing-stats.ts
- [x] T007 [P] Create testimonials Zod schema (quote non-empty max 500 chars, star_rating 1–5, student_name, class_year non-empty) in packages/database/src/schema/testimonials.ts
- [x] T008 Export landing-stats and testimonials schemas from packages/database/src/schema/index.ts and packages/database/src/index.ts
- [x] T009 Create redirectToSignUp Server Action: accept FormData with email, validate via Zod, enforce rate limit (3 attempts/email/hour per contract), redirect to /onboard?email= on valid, return { error } on invalid in apps/web/lib/actions/landing.ts
- [x] T010 Extend Step1Form to read ?email= via useSearchParams and prefill email input when navigating from landing hero in apps/web/components/onboard/step1-form.tsx
- [x] T011 [P] Create useScrollReveal hook using IntersectionObserver with prefers-reduced-motion support in apps/web/lib/hooks/use-scroll-reveal.ts

**Checkpoint**: Foundation ready — migrations applied, schemas exported, hero form action works, scroll reveal hook available

---

## Phase 3: User Story 1 - Discover Value and Capture Email (Priority: P1) — MVP

**Goal**: Visitor sees hero with "Lift the Weight of Student Debt", supporting copy, email form with "Get Started" CTA; valid email routes to Auth (/onboard?email=...).

**Independent Test**: Load landing page; verify hero content and form visible; enter valid email, click Get Started → redirect to /onboard?email=...; invalid email shows validation message.

- [x] T012 [P] [US1] Create FloatingPreviewCards with two static exemplar cards (scholarship match, priorities/tasks); subtle motion; prefers-reduced-motion check in apps/web/components/landing/floating-preview-cards.tsx
- [x] T013 [P] [US1] Create HeroSection with heading "Lift the Weight of Student Debt" (emphasize "Student Debt"), supporting copy, email input, "Get Started" button, "Free to start. No credit card required", form action=redirectToSignUp in apps/web/components/landing/hero-section.tsx
- [x] T014 [US1] Create LandingHeader with logo and "Login / Sign Up" link to /onboard in apps/web/components/landing/landing-header.tsx
- [x] T015 [US1] Compose apps/web/app/page.tsx with LandingHeader, HeroSection (embed FloatingPreviewCards); use dark navy gradient background per plan; wire hero form to redirectToSignUp from apps/web/lib/actions/landing.ts

**Checkpoint**: US1 complete — hero captures email and routes to Auth; Login / Sign Up in header works

---

## Phase 4: User Story 2 - Trust Through Social Proof (Priority: P1)

**Goal**: Visitor sees stats bar ($2.4M Lifted, 15K Students, 94% Match Rate) and testimonial grid; loading and empty states—no mock data in production.

**Independent Test**: Load landing page; verify stats bar and testimonials render with real data or show loading/empty state; no hardcoded fake content.

- [x] T016 [P] [US2] Create StatsBar component: fetch landing_stats (stat_key='default'), display total_debt_lifted_cents, student_count, match_rate_percent; loading skeleton, empty fallback per contracts/landing-sections.md in apps/web/components/landing/stats-bar.tsx
- [x] T017 [P] [US2] Create TestimonialGrid component: fetch testimonials ordered by display_order; cards with quote, star_rating, avatar_url, student_name, class_year; loading skeleton, empty state per contracts/landing-sections.md in apps/web/components/landing/testimonial-grid.tsx
- [x] T018 [US2] Add StatsBar and TestimonialGrid to apps/web/app/page.tsx; pass stats and testimonials from page (Server Component fetch) or fetch inside child Server Components

**Checkpoint**: US2 complete — stats and testimonials display with proper states

---

## Phase 5: User Story 3 - Understand Core Features (Priority: P2)

**Goal**: Visitor sees feature section "Everything You Need to Win Scholarships" with bento grid of four features: AI Matching, Trust Verification, Smart Deadlines, Coach's Guidance; scroll-triggered reveal.

**Independent Test**: Scroll to feature section; verify title, subheading, four feature cards with icon, title, description; section animates into view on scroll.

- [x] T019 [P] [US3] Create FeatureShowcase component: static config for four features (AI Matching, Trust Verification, Smart Deadlines, Coach's Guidance); bento-style grid; each card: icon, title, short description in apps/web/components/landing/feature-showcase.tsx
- [x] T020 [US3] Add FeatureShowcase to apps/web/app/page.tsx; wrap in useScrollReveal for scroll-triggered animation; ensure prefers-reduced-motion disables animation

**Checkpoint**: US3 complete — feature grid visible with scroll reveal

---

## Phase 6: User Story 4 - Convert via Prominent CTA (Priority: P2)

**Goal**: Visitor sees CTA section "Ready to Lift Your Tuition Burden?" and "Start Free Today" button; Debt Lifted widget; header has Login / Sign Up; both route to Auth.

**Independent Test**: Click "Start Free Today" and "Login / Sign Up" → both route through Auth; Debt Lifted widget shows platform total or fallback.

- [ ] T021 [P] [US4] Create DebtLiftedWidget component: displays total_debt_lifted from landing_stats or fallback when unavailable; format as currency; sourced from same fetch as StatsBar in apps/web/components/landing/debt-lifted-widget.tsx
- [ ] T022 [US4] Create CtaSection component: heading "Ready to Lift Your Tuition Burden?", supporting copy, "Start Free Today" button (links to /onboard), optional DebtLiftedWidget in apps/web/components/landing/cta-section.tsx
- [ ] T023 [US4] Add CtaSection to apps/web/app/page.tsx; pass stats for DebtLiftedWidget; apply useScrollReveal

**Checkpoint**: US4 complete — CTA and Debt Lifted widget functional

---

## Phase 7: User Story 5 - Experience Premium Visual Identity (Priority: P3)

**Goal**: Page uses dark navy gradient, electric mint accents; floating cards in hero; sections reveal on scroll; responsive 375px–1440px; no horizontal overflow.

**Independent Test**: View on desktop and mobile; verify color palette, floating cards, scroll reveals; check 375px, 768px, 1440px; reduced motion respected.

- [ ] T024 [US5] Apply dark navy gradient background and electric mint accents to landing page sections in apps/web/app/page.tsx and landing components; ensure CTAs, highlights, icons use electric mint
- [ ] T025 [US5] Verify all landing sections use useScrollReveal; ensure prefers-reduced-motion: reduce disables or simplifies animations in apps/web/components/landing/*.tsx
- [ ] T026 [US5] Verify responsive layout: 375px, 768px, 1440px; no horizontal overflow; floating cards, bento grid, form stack appropriately in apps/web/components/landing/

**Checkpoint**: US5 complete — premium visual identity and responsiveness verified

---

## Phase 8: User Story 6 - Navigate Footer and Legal Links (Priority: P3)

**Goal**: Footer shows TuitionLift logo, copyright, links to Privacy, Terms, Contact; links route to /privacy, /terms, /contact.

**Independent Test**: Footer visible; Privacy, Terms, Contact links navigate to correct pages.

- [ ] T027 [P] [US6] Create LandingFooter with logo, "© 2026 TuitionLift", links to /privacy, /terms, /contact in apps/web/components/landing/landing-footer.tsx
- [ ] T028 [P] [US6] Create privacy policy page at apps/web/app/privacy/page.tsx (placeholder content acceptable per research.md)
- [ ] T029 [P] [US6] Create terms of service page at apps/web/app/terms/page.tsx (placeholder content acceptable)
- [ ] T030 [P] [US6] Create contact page at apps/web/app/contact/page.tsx (MVP: static "Email us at support@tuitionlift.com"; contact form deferred post-MVP per quickstart)
- [ ] T031 [US6] Add LandingFooter to apps/web/app/page.tsx

**Checkpoint**: US6 complete — footer and legal pages functional

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, performance, validation

- [ ] T032 [P] Ensure all interactive elements (buttons, links, inputs) meet 44×44px touch target and WCAG 2.1 AA contrast in apps/web/components/landing/
- [ ] T033 [P] Add semantic landmarks (main, nav) and heading hierarchy (one h1, sequential) in apps/web/app/page.tsx and landing components
- [ ] T034 Add seed SQL for landing_stats (stat_key='default', total_debt_lifted_cents=240000000, student_count=15000, match_rate_percent=94) in packages/database or migration; document in quickstart
- [ ] T035 Run quickstart.md verification: landing loads, stats/testimonials, hero form redirects (SC-001: email capture in under 30s), footer links, Lighthouse 90+, responsive, reduced motion

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–8)**: All depend on Foundational
  - US1 (Phase 3): Core MVP; no story deps
  - US2 (Phase 4): Uses landing_stats, testimonials; no US1 dep
  - US3 (Phase 5): Static; no DB dep
  - US4 (Phase 6): Uses landing_stats for widget; no other story dep
  - US5 (Phase 7): Visual polish; applies to existing sections
  - US6 (Phase 8): Footer and pages; independent
- **Polish (Phase 9)**: Depends on all user stories

### User Story Dependencies

| Story | Can Start After | Blocks |
|-------|-----------------|--------|
| US1 | Foundational | — |
| US2 | Foundational | — |
| US3 | Foundational | — |
| US4 | Foundational | — |
| US5 | US1–US4 (needs sections) | — |
| US6 | Foundational | — |

US5 (visual identity) applies to sections built in US1–US4; can overlap or follow.

### Parallel Opportunities

- T006, T007: Schemas in parallel
- T012, T013: FloatingPreviewCards and HeroSection in parallel (US1)
- T016, T017: StatsBar and TestimonialGrid in parallel (US2)
- T027–T030: Footer + three static pages in parallel (US6)
- T028, T029, T030: Privacy, Terms, Contact pages in parallel

---

## Parallel Example: User Story 2

```bash
# StatsBar and TestimonialGrid can be built concurrently:
Task T016: "Create StatsBar component in apps/web/components/landing/stats-bar.tsx"
Task T017: "Create TestimonialGrid component in apps/web/components/landing/testimonial-grid.tsx"
```

## Parallel Example: User Story 6

```bash
# Footer and all three static pages in parallel:
Task T027: "Create LandingFooter in apps/web/components/landing/landing-footer.tsx"
Task T028: "Create privacy page in apps/web/app/privacy/page.tsx"
Task T029: "Create terms page in apps/web/app/terms/page.tsx"
Task T030: "Create contact page in apps/web/app/contact/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (CRITICAL)
3. Phase 3: US1 — Hero + email capture + Auth routing
4. **STOP and VALIDATE**: Hero form works; redirect to /onboard?email= works
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → DB ready, hero action works
2. US1 → Test hero flow → MVP
3. US2 → Stats + testimonials → Social proof
4. US3 → Feature showcase → Value clarity
5. US4 → CTA + Debt Lifted → Conversion
6. US5 → Visual polish → Premium identity
7. US6 → Footer + legal → Compliance
8. Polish → A11y, Lighthouse, quickstart validation

### Parallel Team Strategy

- Developer A: US1 (hero)
- Developer B: US2 (stats, testimonials) + US4 (CTA, widget)
- Developer C: US3 (features) + US6 (footer, pages)
- Developer D: US5 (visual identity) after sections exist

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to user story for traceability
- 010-bento-shell-design-system provides design tokens; no new design system work
- landing_stats and testimonials: seed after migrations (see quickstart)
- Contact form: defer to post-MVP if contact page is static "Email us" only
