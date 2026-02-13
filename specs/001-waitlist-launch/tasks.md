# Tasks: TuitionLift Waitlist & Launch System

**Input**: Design documents from `/specs/001-waitlist-launch/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/  
**Updated**: 2026-02-13 — aligned with spec clarifications (referral token base64url, Lighthouse SC-008, fail-fast/retry UX, client-side PII, upward-momentum design)

**Tests**: Not explicitly requested in spec; omitted.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3, US4)
- Include exact file paths

## Path Conventions

- Web app: `apps/web/` (Next.js App Router, monorepo)
- Components: `apps/web/app/components/`
- Actions: `apps/web/app/actions/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add dependencies and tooling per plan.md

- [ ] T001 Add Tailwind CSS to apps/web (tailwindcss, postcss, autoprefixer)
- [ ] T002 Add Shadcn/ui to apps/web and install Button, Input, Label primitives per ui.shadcn.com
- [ ] T003 Add Zod, Resend, @supabase/supabase-js to apps/web/package.json
- [ ] T004 [P] Create apps/web/.env.example with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, WAITLIST_JUMP_PER_REFERRAL, WAITLIST_RATE_LIMIT_PER_IP, WAITLIST_RATE_LIMIT_PER_EMAIL

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database, Supabase client, validation, rate limiting—required before any user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create Supabase migration for waitlist table (id, email, segment, referrer_id, referral_count, unlock_sent_at, created_at) per data-model.md
- [ ] T006 Create RLS policies for waitlist table (service role only for INSERT/SELECT/UPDATE)
- [ ] T007 Create indexes waitlist_email_idx, waitlist_created_at_idx, waitlist_referrer_id_idx
- [ ] T008 Create Supabase server client in apps/web/lib/supabase-server.ts using service role key (server-only)
- [ ] T009 Create rate-limiting utility in apps/web/lib/rate-limit.ts (in-memory or Upstash; keyed by IP and email; configurable via env)
- [ ] T010 [P] Create Zod schema for waitlist form in apps/web/lib/waitlist-schema.ts (email format + disposable domains, segment enum, honeypot)
- [ ] T011 [P] Create referral token helpers in apps/web/lib/referral.ts (base64url encode/decode of waitlist.id for ?ref= token; no extra DB column per data-model)

**Checkpoint**: Foundation ready—user story implementation can begin

---

## Phase 3: User Story 1 - Join the Waitlist (Priority: P1) 🎯 MVP

**Goal**: Visitor can sign up via email and see success state; duplicate/validation/rate-limit handled

**Independent Test**: Submit valid email → success; submit duplicate → friendly message + share incentive (no position); invalid email → validation error before submit (fail-fast); honeypot filled → silent reject; server error → "Please try again", form usable for retry

### Implementation for User Story 1

- [ ] T012 [US1] Create submitWaitlist Server Action in apps/web/app/actions/waitlist.ts (signature: prevState, formData)
- [ ] T013 [US1] Implement honeypot check (reject if website field populated), rate limit check, Zod validation in submitWaitlist; for server errors return { kind: 'error', message } including "Please try again" (retry only for server errors, not validation)
- [ ] T014 [US1] Implement duplicate-email detection in submitWaitlist; return { success: false, kind: 'duplicate', message } with share incentive, no position
- [ ] T015 [US1] Implement insert (with referrer_id when ref token present), update referrer referral_count, compute position in submitWaitlist
- [ ] T016 [US1] Create waitlist-form.tsx in apps/web/app/components/ with useActionState, email input, optional segment select, hidden honeypot (website), referrer_token from URL; fail-fast client-side validation before submit; no PII in console or error messages (FR-007)
- [ ] T017 [US1] Create hero.tsx in apps/web/app/components/ with headline and WaitlistForm
- [ ] T018 [US1] Create success-state.tsx in apps/web/app/components/ with position display ("You are #X in line") and share incentive placeholder
- [ ] T019 [US1] Integrate Hero, WaitlistForm, SuccessState into apps/web/app/page.tsx (show SuccessState when success; otherwise Hero with form)

**Checkpoint**: User Story 1 complete; signup flow works independently

---

## Phase 4: User Story 2 - Understand the Value Proposition (Priority: P1)

**Goal**: Visitor sees 3-step value section (Agentic Discovery, Anti-Scam Shield, The Playbook); Premium Academic Fintech aesthetic; mobile-friendly

**Independent Test**: View landing on desktop and mobile; all three value points visible and readable; min 44px tap targets

### Implementation for User Story 2

- [ ] T020 [P] [US2] Create value-section.tsx in apps/web/app/components/ with 3 bento-style cards (Agentic Discovery, Anti-Scam Shield, The Playbook)
- [ ] T021 [US2] Add ValueSection to apps/web/app/page.tsx below hero
- [ ] T022 [US2] Apply Premium Academic Fintech styling in apps/web/app/globals.css and components (Trust Navy #1A1A40, Electric Mint #00FFAB, Off-White #FDFDFD; serif headings, sans body; upward-momentum metaphor: abstract rising lines, ascending arrow, or minimalist "lift" icon per FR-011)
- [ ] T023 [US2] Add Framer Motion entry animations to hero and value section; ensure min 44px tap targets on CTAs

**Checkpoint**: User Stories 1 and 2 complete; landing page conveys value

---

## Phase 5: User Story 3 - Conversion Loop & Viral Incentive (Priority: P2)

**Goal**: Success state shows position and share incentive; Share button triggers recordShare; unlock email sent within 5 min; referral signups improve referrer position

**Independent Test**: Sign up → see position; click Share/Copy → unlock email sent; sign up via ?ref= token → referrer position improves by configurable jump

### Implementation for User Story 3

- [ ] T024 [US3] Add share incentive copy and referral link with unique identifier (base64url of id in ?ref=) to apps/web/app/components/success-state.tsx
- [ ] T025 [US3] Create recordShare Server Action in apps/web/app/actions/waitlist.ts (waitlistId param; update unlock_sent_at; send unlock email via Resend; idempotent)
- [ ] T026 [US3] Create unlock-asset email template (2026 Scholarship Prep Guide link or attachment) in apps/web/lib/emails/unlock-asset.ts
- [ ] T027 [US3] Add Share/Copy link button to success-state.tsx; on click call recordShare then copy referral URL to clipboard (or Web Share API)
- [ ] T028 [US3] Wire referrer_token (?ref=) from URL to form; in submitWaitlist decode base64url token to referrer_id, set referrer_id on insert, increment referrer referral_count

**Checkpoint**: Viral loop and unlock mechanics work independently

---

## Phase 6: User Story 4 - Welcome Email & First Coach Interaction (Priority: P2)

**Goal**: Successful signup triggers welcome email within 5 minutes; Coach persona content; no PII in logs

**Independent Test**: Sign up with real email → receive welcome email within 5 min; content is supportive, energetic (Coach persona)

### Implementation for User Story 4

- [ ] T029 [US4] Create welcome email template (Coach persona, HTML) in apps/web/lib/emails/welcome.ts
- [ ] T030 [US4] Add Resend welcome email trigger to submitWaitlist in apps/web/app/actions/waitlist.ts (after successful insert; fire-and-forget or awaited; no PII in console, user-facing errors, or client-side logs per FR-007)

**Checkpoint**: Welcome email delivers on signup

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Loading/Empty states, fail-fast + retry UX, accessibility, Lighthouse, verification

- [ ] T031 [P] Add Loading state (pending) to waitlist-form.tsx via useActionState; for server errors show "Please try again" (or equivalent) and keep form usable for retry; no PII in error messages
- [ ] T032 Verify WCAG 2.1 AA (text contrast, focus management, keyboard nav) on apps/web/app/page.tsx
- [ ] T033 Run quickstart.md verification checklist (valid signup, duplicate, honeypot, rate limit, share→unlock, fail-fast/retry); run Lighthouse and verify Performance and Best Practices scores ≥ 90 each (SC-008)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies—start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1—blocks all user stories
- **Phase 3 (US1)**: Depends on Phase 2—MVP
- **Phase 4 (US2)**: Depends on Phase 2; can parallel with Phase 3 (different components)
- **Phase 5 (US3)**: Depends on Phase 3 (success state exists)
- **Phase 6 (US4)**: Depends on Phase 3 (submitWaitlist exists)
- **Phase 7 (Polish)**: Depends on Phases 3–6

### User Story Dependencies

- **US1 (P1)**: After Foundational—no dependencies on other stories
- **US2 (P1)**: After Foundational—independent (static content)
- **US3 (P2)**: After US1 (builds on success state)
- **US4 (P2)**: After US1 (adds to submitWaitlist)

### Parallel Opportunities

- T004, T010, T011 can run in parallel within Phase 1/2
- T020 can run in parallel with T012–T019 (different files)
- T031 can run in parallel with T032, T033

---

## Parallel Example: Phase 3 (US1)

```bash
# Parallel: schema and referral helpers
Task T010: Create Zod schema in apps/web/lib/waitlist-schema.ts
Task T011: Create referral helpers (base64url encode/decode) in apps/web/lib/referral.ts

# Sequential: submitWaitlist then components
Task T012–T015: submitWaitlist implementation
Task T016–T019: Components and page integration
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Submit email → success state; duplicate → friendly message; invalid → validation
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → Test signup independently → Deploy (MVP)
3. US2 → Add value section → Test
4. US3 → Add share/unlock → Test viral flow
5. US4 → Add welcome email → Test email delivery
6. Polish → Final verification

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to user story for traceability
- Each user story is independently completable and testable
- No inline styles; Tailwind only (constitution)
- Commit after each task or logical group
