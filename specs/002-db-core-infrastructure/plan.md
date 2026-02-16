# Implementation Plan: @repo/db Core Infrastructure

**Branch**: `002-db-core-infrastructure` | **Date**: 2025-02-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-db-core-infrastructure/spec.md`

## Summary

Create a shared Turborepo package `@repo/db` at `packages/database` that serves as the single source of truth for the TuitionLift data layer. The package centralizes Supabase schema (migrations), auto-generates TypeScript types, defines Zod validation for all tables, exports an environment-aware Supabase client, and supports referral tracking and RLS. Both `apps/web` (Next.js) and `apps/agent` (LangGraph) consume this package for type-safe, validated database access. Schema aligns with 001 (Waitlist Launch), 005 (Coach Execution Engine), and 006 (Dashboard).

## Technical Context

**Language/Version**: TypeScript 5.9
**Primary Dependencies**: @supabase/supabase-js, zod, supabase (CLI for migrations and type gen)
**Storage**: Supabase (PostgreSQL)
**Testing**: Vitest or Jest for schema/validation unit tests; integration tests against local Supabase
**Target Platform**: Node 18+ (server), browser (client)
**Project Type**: Turborepo monorepo (shared package)
**Performance Goals**: Type generation <10s; validation overhead negligible
**Constraints**: No logging/metrics in package (delegated to consumers); backward-compatible migrations only
**Scale/Scope**: 5 tables (waitlist, profiles, scholarships, applications, checkpoints); waitlist and scholarship discovery scale; profiles include Financial Aid Layer (SAI, Pell eligibility, household context)

## Constitution Check

*GATE: Passed before Phase 0. Re-checked after Phase 1 design.*

- **Mission & scope:** Feature supports "Search → Verify → Apply" by providing the data foundation (scholarships, applications, profiles). Core-loop work not deferred.
- **Technical standards:** Plan uses Supabase with RLS, Zod for validation, LangGraph checkpoints for agent persistence. Package lives in `packages/database` per monorepo layout. No HIGH/CRITICAL CVEs in deps.
- **Security & PII:** No SSN or full addresses in schema. Profile RLS: owner-only read. PII scrubbing remains in consuming apps (agent search). Waitlist INSERT service-role only; Server Actions enforce validation and rate limiting.
- **Workflow:** Spec and plan exist; tasks will be atomic.
- **UX/UI:** N/A (infrastructure package).
- **Forbidden:** No inline styles; no mock data in package (consumers handle Loading/Empty).
- **Data integrity:** Scholarships have trust_score, deadline; Trust Filter applied by consuming agent. Academic year dynamic per Constitution §8.
- **Documentation protocol:** Plan references Supabase CLI, Supabase JS, Zod, LangGraph. Types from Supabase; schemas from Zod; Checkpoints for persistence.

## Project Structure

### Documentation (this feature)

```text
specs/002-db-core-infrastructure/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── package-exports.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/database/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Unified exports
│   ├── client.ts          # createDbClient factory
│   ├── schema/            # Zod table definitions
│   │   ├── index.ts
│   │   ├── waitlist.ts
│   │   ├── profiles.ts       # includes Financial Aid Layer
│   │   ├── scholarships.ts
│   │   ├── applications.ts
│   │   └── checkpoints.ts  # Optional; LangGraph may own structure
│   └── generated/
│       └── database.types.ts  # supabase gen types output
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 00000000000000_create_enums.sql
│       ├── 00000000000001_create_waitlist.sql
│       ├── 00000000000002_create_profiles.sql
│       ├── 00000000000003_create_scholarships.sql
│       ├── 00000000000004_create_applications.sql
│       └── 00000000000005_create_checkpoints.sql
└── tests/
    ├── schema/
    └── integration/
```

**Structure Decision**: Turborepo monorepo per Constitution §3. Package at `packages/database`; consumed by `apps/web` and `apps/agent`. Migrations follow Supabase naming; Zod schemas in `src/schema/`; types generated to `src/generated/`.

## Schema Alignment (2025-02-16 Clarifications)

| Table | Alignment | Source |
|-------|-----------|--------|
| waitlist | segment, referral_count, unlock_sent_at; RLS service-role INSERT only | 001 |
| applications | momentum_score (renamed from priority_score), submitted_at, last_progress_at, confirmed_at | 005, 006 |
| profiles | No household_income_bracket; consumers derive from SAI at read | 003 |

## Complexity Tracking

> No Constitution violations requiring justification.

| Item | Status |
|------|--------|
| Complexity | Minimal; standard Supabase + Zod pattern |
