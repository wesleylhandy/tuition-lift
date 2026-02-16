# Tasks: @repo/db Core Infrastructure

**Input**: Design documents from `/specs/002-db-core-infrastructure/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in spec; omitted. Add validation tests in Polish phase if desired.

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each capability.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Include exact file paths in descriptions

## Path Conventions

- **Turborepo (TuitionLift)**: `packages/database/`, `apps/web/`, `apps/agent/`
- All paths relative to repository root unless noted

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Package initialization and structure

- [x] T001 Create package structure: package.json with name `@repo/db`, exports, and scripts in packages/database/package.json
- [x] T002 Add dependencies @supabase/supabase-js and zod to packages/database/package.json
- [x] T003 [P] Create tsconfig.json extending @repo/typescript-config in packages/database/tsconfig.json
- [x] T004 [P] Create supabase/config.toml in packages/database/supabase/config.toml
- [x] T005 Create directory structure: packages/database/src/, packages/database/src/schema/, packages/database/src/generated/, packages/database/supabase/migrations/, packages/database/tests/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: All migrations and schema must exist before type generation and Zod schemas. Blocks all user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. Migration filenames per plan.md Project Structure (00000000000000_create_enums.sql, etc.).

- [x] T006 Create migration for enums: scholarship_category, application_status, pell_eligibility_status (eligible, ineligible, unknown) in packages/database/supabase/migrations/
- [ ] T007 Create migration for waitlist table (id, email, segment, referral_code, referred_by, referral_count, unlock_sent_at, created_at) with segment CHECK, RLS (service-role only INSERT), and indexes in packages/database/supabase/migrations/
- [ ] T008 Create migration for profiles table (id FK auth.users, full_name, intended_major, gpa, state, interests, sai, pell_eligibility_status, household_size, number_in_college, created_at, updated_at) with RLS (owner-only) in packages/database/supabase/migrations/
- [ ] T009 Create migration for scholarships table with scholarship_category enum, trust_score, deadline in packages/database/supabase/migrations/
- [ ] T010 Create migration for applications table (user_id, scholarship_id, academic_year, status, momentum_score, submitted_at, last_progress_at, confirmed_at, created_at, updated_at) with UNIQUE(user_id, scholarship_id, academic_year) and RLS in packages/database/supabase/migrations/
- [ ] T011 Create migration or document LangGraph checkpoint table setup for agent persistence in packages/database/supabase/migrations/ or quickstart.md
- [ ] T012 Add db:generate and db:push scripts to packages/database/package.json; run supabase gen types typescript --local and output to src/generated/database.types.ts

**Checkpoint**: All tables exist; types can be generated. Foundation ready for user story implementation.

---

## Phase 3: User Story 1 - Single Source of Truth (Priority: P1) 🎯 MVP

**Goal**: Shared package defines all schemas and exports types so frontend and agent get identical structures.

**Independent Test**: Add a field to a migration, run db:generate, import types in a stub consumer; both receive the new field.

### Implementation for User Story 1

- [ ] T013 [US1] Create placeholder or ensure db:generate outputs to packages/database/src/generated/database.types.ts; add to packages/database/.gitignore if generated
- [ ] T014 [US1] Create src/index.ts that exports Database, Tables, Enums from generated types in packages/database/src/index.ts
- [ ] T015 [US1] Configure package.json exports field to expose types and client entry points per contracts/package-exports.md

**Checkpoint**: Consuming apps can import types from @repo/db and receive identical definitions.

---

## Phase 4: User Story 2 - Validation Before Writes (Priority: P1)

**Goal**: Zod schemas for every table; validate before all writes; invalid payloads rejected with clear errors.

**Independent Test**: Call schema.parse(invalidData) and verify ZodError; call schema.parse(validData) and verify success.

### Implementation for User Story 2

- [ ] T016 [P] [US2] Create waitlistSchema with email, segment, referral_code, referred_by, referral_count, unlock_sent_at in packages/database/src/schema/waitlist.ts
- [ ] T017 [P] [US2] Create profileSchema with full_name, intended_major, gpa (0–4), state, interests, sai (-1500 to 999999), pell_eligibility_status (enum), household_size, number_in_college, updated_at in packages/database/src/schema/profiles.ts
- [ ] T018 [P] [US2] Create scholarshipSchema with title, amount, deadline, url, trust_score (0–100), category in packages/database/src/schema/scholarships.ts
- [ ] T019 [P] [US2] Create applicationSchema with user_id, scholarship_id, academic_year (YYYY-YYYY), status enum, momentum_score, submitted_at, last_progress_at, confirmed_at, updated_at in packages/database/src/schema/applications.ts
- [ ] T020 [US2] Create schema index exporting all schemas and optional parseOrThrow helper in packages/database/src/schema/index.ts
- [ ] T021 [US2] Export schemas from main package in packages/database/src/index.ts

**Checkpoint**: All write paths can validate with Zod before DB access; invalid data rejected.

---

## Phase 5: User Story 3 - Shared Client for Server and Client (Priority: P2)

**Goal**: Single createDbClient factory; server uses service-role or anon; client uses anon only; no secrets in browser.

**Independent Test**: Import createDbClient in Node and browser context; verify correct keys used (no service-role in client).

### Implementation for User Story 3

- [ ] T022 [US3] Implement createDbClient in packages/database/src/client.ts with runtime detection (typeof window, process.env)
- [ ] T023 [US3] Export createDbClient from packages/database/src/index.ts
- [ ] T024 [US3] Document env vars (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) in specs/002-db-core-infrastructure/quickstart.md

**Checkpoint**: Apps can import createDbClient and get environment-appropriate Supabase client.

---

## Phase 6: User Story 4 - Referral Tracking (Priority: P2)

**Goal**: Waitlist supports referral_code and referred_by; invalid codes leave referred_by empty; referrer counts queryable.

**Independent Test**: Join waitlist with valid referral code → referred_by set; invalid code → referred_by null; query referrer count.

### Implementation for User Story 4

- [ ] T025 [US4] Ensure waitlist migration includes index on referred_by for referrer count queries in packages/database/supabase/migrations/
- [ ] T026 [US4] Ensure waitlistSchema allows referred_by as optional; document FR-005a (invalid code → null) in schema or quickstart in packages/database/src/schema/waitlist.ts

**Checkpoint**: Referral tracking fully supported at data layer; consumers implement lookup logic.

---

## Phase 6.5: User Story 6 - Financial Aid Context (Priority: P2)

**Goal**: Profiles support SAI, Pell-eligibility, household size for need-based scholarship matching. Implemented via T006 (enum), T008 (migration), T017 (Zod schema).

**Independent Test**: Store SAI (-1500 to 999999), pell_eligibility_status, household_size in profile; query need-based scholarships filtered by eligibility.

- [ ] T027 [US6] Verify profileSchema rejects SAI outside -1500..999999 in packages/database/src/schema/profiles.ts
- [ ] T028 [US6] Verify pell_eligibility_status enum and profile migration are applied; add Financial Aid Layer section to quickstart (T032 does full quickstart update)

**Checkpoint**: Financial Aid Layer integrated; need-based matching can use profile data.

---

## Phase 7: User Story 5 - Row-Level Security and Profile Privacy (Priority: P1)

**Goal**: All tables have RLS; profiles readable only by owner; no cross-user profile access.

**Independent Test**: Attempt SELECT on another user's profile without auth → denied; with auth.uid() = id → allowed.

### Implementation for User Story 5

- [ ] T029 [US5] Verify profiles RLS policy: SELECT/UPDATE/INSERT only where auth.uid() = id in packages/database/supabase/migrations/
- [ ] T030 [US5] Verify all tables (waitlist, profiles, scholarships, applications) have RLS enabled with correct policies in packages/database/supabase/migrations/

**Checkpoint**: RLS enforced; profile data protected from cross-user access.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Integration, docs, consumer wiring

- [ ] T031 [P] Add @repo/db as dependency to apps/web/package.json (add to apps/agent/package.json when that app exists)
- [ ] T032 Update quickstart.md with full workflow (install, supabase start, db:generate, usage examples) including Financial Aid Layer section in specs/002-db-core-infrastructure/quickstart.md
- [ ] T033 Run pnpm install at repo root and verify @repo/db builds with pnpm --filter @repo/db build
- [ ] T034 Run quickstart.md workflow to validate package setup: install deps, supabase start, db:generate, import from stub consumer in specs/002-db-core-infrastructure/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — blocks all user stories
- **User Stories (Phase 3–7)**: All depend on Foundational
  - US1 can start right after Foundational (types + exports)
  - US2 can run parallel to US1 (Zod schemas)
  - US3 needs US1 (client uses generated types)
  - US4 depends on US2 (waitlist schema) and Foundational (migration)
  - US5 is verification of Foundational migrations
- **Polish (Phase 8)**: Depends on US1, US2, US3 complete

### User Story Dependencies

- **US1**: After Foundational — no other story deps
- **US2**: After Foundational — no other story deps
- **US3**: After Foundational, benefits from US1 (typed client)
- **US4**: After Foundational + US2 (waitlist schema)
- **US5**: Verification of Foundational migrations
- **US6**: After Foundational + US2 (profileSchema with Financial Aid fields)

### Within Each Phase

- Migrations: Enums before tables that use them; waitlist before applications (if any FK; none here)
- Schemas: Can be parallel (different files)
- Exports: Index aggregates after individual modules exist

### Parallel Opportunities

- T003, T004, T005 (Setup) can run in parallel
- T016–T019 (US2 Zod schemas) can run in parallel
- T031, T032 (Polish) can run in parallel; T033, T034 run sequentially after consumer wiring

---

## Parallel Example: User Story 2

```bash
# All four Zod schemas in parallel:
Task T016: waitlist schema in src/schema/waitlist.ts
Task T017: profile schema in src/schema/profiles.ts
Task T018: scholarship schema in src/schema/scholarships.ts
Task T019: application schema in src/schema/applications.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 + US2 + US5)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (all migrations, type gen)
3. Complete Phase 3: US1 (exports, single source of truth)
4. Complete Phase 4: US2 (Zod validation)
5. Complete Phase 7: US5 (verify RLS)
6. **STOP and VALIDATE**: Package exports types + schemas; RLS enforced
7. Deploy package to workspace; consume from apps/web

### Incremental Delivery

1. Setup + Foundational → Schema and types ready
2. US1 → Types exported (MVP for type safety)
3. US2 → Validation layer (MVP for data integrity)
4. US5 → RLS verified (MVP for security)
5. US3 → Client factory (enables actual DB access from apps)
6. US4 → Referral tracking (enables waitlist growth)
7. Polish → Consumer integration, docs

### Parallel Team Strategy

- Developer A: Setup + Foundational (T001–T012)
- Once done: Developer A continues US1, US3; Developer B does US2, US4, US5 in parallel
- Final: Polish together
