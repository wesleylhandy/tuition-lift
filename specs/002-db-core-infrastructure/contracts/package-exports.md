# @repo/db Package Export Contract

**Branch**: `002-db-core-infrastructure` | **Date**: 2025-02-13  
**Spec**: [spec.md](../spec.md)

## Public API Surface

The `@repo/db` package MUST export the following. All consumers (apps/web, apps/agent) depend on this contract.

### 1. Client Factory

```typescript
// Default export or named: createDbClient
// Returns: SupabaseClient<Database> (typed with generated types)
// Behavior: Server context → service-role or anon per env; Client context → anon only
```

**Usage**: `import { createDbClient } from '@repo/db'`

### 2. Generated Types

```typescript
// Export: Database (full schema), plus table row types
// Source: supabase gen types typescript — generated from schema
// Path: src/generated/database.types.ts (or equivalent)
```

**Usage**: `import type { Database, Tables, Enums } from '@repo/db'`

### 3. Zod Schemas

```typescript
// Export: One Zod schema per table
// waitlistSchema, profileSchema (includes Financial Aid: sai, pell_eligibility_status, household_size, number_in_college), scholarshipSchema, applicationSchema
// Checkpoint: opaque; no schema (LangGraph manages)
```

**Usage**: `import { waitlistSchema, profileSchema } from '@repo/db/schema'`

### 4. Validation Helpers (Optional)

```typescript
// parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T
// Validates before write; throws ZodError on failure
```

### 5. Index Entry

```typescript
// src/index.ts re-exports:
// - createDbClient
// - Database, Tables, Enums (generated types)
// - *Schema from schema/
```

---

## Dependency Direction

```
apps/web    ──depends on──►  @repo/db
apps/agent  ──depends on──►  @repo/db
```

`@repo/db` has ZERO dependencies on apps. It depends only on:
- `@supabase/supabase-js`
- `zod`

---

## Migration Contract

- All migrations live in `packages/database/supabase/migrations/`
- Naming: `YYYYMMDDHHMMSS_description.sql`
- Backward-compatible only (FR-012): additive changes; no remove/rename in single step
