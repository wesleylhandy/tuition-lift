# Implementation Plan: @repo/db Core Infrastructure

**Branch**: `002-db-core-infrastructure` | **Date**: 2025-02-13 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/002-db-core-infrastructure/spec.md`

## Summary

Create a shared Turborepo package `@repo/db` at `packages/database` that serves as the single source of truth for the TuitionLift data layer. The package centralizes Supabase schema (migrations), auto-generates TypeScript types, defines Zod validation for all tables, exports an environment-aware Supabase client, and supports referral tracking and RLS. Both `apps/web` (Next.js) and `apps/agent` (LangGraph) consume this package for type-safe, validated database access.

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

*GATE: Passed before Phase 0. Re-checked after Phase 1.*

- **Mission & scope:** Feature supports "Search → Verify → Apply" by providing the data foundation (scholarships, applications, profiles). Core-loop work not deferred.
- **Technical standards:** Plan uses Supabase with RLS, Zod for validation, LangGraph checkpoints for agent persistence. Package lives in `packages/database` per monorepo layout. No HIGH/CRITICAL CVEs in deps.
- **Security & PII:** No SSN or full addresses in schema. Profile RLS: owner-only read. PII scrubbing remains in consuming apps (agent search).
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
├── data-model.md        # Phase 1 entity definitions
├── quickstart.md        # Phase 1 developer guide
├── contracts/           # Package export contract
│   └── package-exports.md
└── tasks.md             # Phase 2 output (/speckit.tasks — not created by plan)
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
│   │   ├── profiles.ts       # includes Financial Aid Layer (SAI, pell_eligibility_status, household_size, number_in_college)
│   │   ├── scholarships.ts
│   │   ├── applications.ts
│   │   └── checkpoints.ts  # Optional; LangGraph may own structure
│   └── generated/
│       └── database.types.ts  # supabase gen types output
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 00000000000000_create_enums.sql      # scholarship_category, application_status, pell_eligibility_status
│       ├── 00000000000001_create_waitlist.sql
│       ├── 00000000000002_create_profiles.sql   # includes Financial Aid Layer (sai, pell_eligibility_status, household_size, number_in_college)
│       ├── 00000000000003_create_scholarships.sql
│       ├── 00000000000004_create_applications.sql
│       └── 00000000000005_create_checkpoints.sql
└── tests/
    ├── schema/
    └── integration/

apps/web/                 # Next.js (existing)
apps/agent/               # LangGraph (existing, to be populated)
```

**Structure Decision**: Option 4 (Turborepo monorepo) per Constitution. The `packages/database` directory already exists and is empty; this plan populates it. No `apps/agent` package.json yet—to be created when agent is implemented; `@repo/db` will be a dependency.

## Complexity Tracking

No Constitution violations requiring justification.

---

## SQL Migrations Specification

### Migration: Enums (00000000000000_create_enums.sql)

Runs before tables. Creates `scholarship_category`, `application_status`, `pell_eligibility_status`.

```sql
-- scholarship_category: for scholarships table
CREATE TYPE scholarship_category AS ENUM (
  'merit',
  'need_based',
  'minority',
  'field_specific',
  'other'
);

-- application_status: for applications table
CREATE TYPE application_status AS ENUM (
  'draft',
  'submitted',
  'awarded',
  'rejected',
  'withdrawn'
);

-- pell_eligibility_status: for profiles Financial Aid Layer
CREATE TYPE pell_eligibility_status AS ENUM (
  'eligible',
  'ineligible',
  'unknown'
);
```

### Migration: Profiles with Financial Aid Layer (00000000000002_create_profiles.sql)

```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  intended_major text,
  gpa numeric(3, 2) CHECK (gpa IS NULL OR (gpa >= 0 AND gpa <= 4)),
  state text,
  interests text[],
  -- Financial Aid Layer
  sai integer CHECK (sai IS NULL OR (sai >= -1500 AND sai <= 999999)),
  pell_eligibility_status pell_eligibility_status,
  household_size integer CHECK (household_size IS NULL OR household_size > 0),
  number_in_college integer CHECK (number_in_college IS NULL OR number_in_college >= 0),
  --
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

**Note**: The `sai` CHECK constraint enforces the federal range (-1500 to 999999) at the database layer. Zod provides runtime validation before writes.

---

## Zod Schema Specification: Profiles (Financial Aid Layer)

File: `packages/database/src/schema/profiles.ts`

```typescript
import { z } from 'zod';

// SAI: Student Aid Index, federal range -1500 to 999999
const SAI_MIN = -1500;
const SAI_MAX = 999999;

const saiSchema = z
  .number()
  .int()
  .min(SAI_MIN, { message: `SAI must be >= ${SAI_MIN}` })
  .max(SAI_MAX, { message: `SAI must be <= ${SAI_MAX}` })
  .nullable()
  .optional();

const pellEligibilityStatusSchema = z
  .enum(['eligible', 'ineligible', 'unknown'])
  .nullable()
  .optional();

export const profileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().nullable().optional(),
  intended_major: z.string().nullable().optional(),
  gpa: z
    .number()
    .min(0, { message: 'GPA must be >= 0' })
    .max(4, { message: 'GPA must be <= 4' })
    .nullable()
    .optional(),
  state: z.string().nullable().optional(),
  interests: z.array(z.string()).nullable().optional(),
  // Financial Aid Layer
  sai: saiSchema,
  pell_eligibility_status: pellEligibilityStatusSchema,
  household_size: z
    .number()
    .int()
    .positive({ message: 'household_size must be positive' })
    .nullable()
    .optional(),
  number_in_college: z
    .number()
    .int()
    .nonnegative({ message: 'number_in_college must be >= 0' })
    .nullable()
    .optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export type Profile = z.infer<typeof profileSchema>;
```

**Validation rules**:
- `sai`: Integer, -1500 to 999999, nullable. Rejects out-of-range values with clear ZodError.
- `pell_eligibility_status`: One of `eligible` | `ineligible` | `unknown`, nullable.
- `household_size`: Positive integer, nullable.
- `number_in_college`: Non-negative integer, nullable.
