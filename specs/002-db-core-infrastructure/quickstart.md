# Quickstart: @repo/db Development

**Branch**: `002-db-core-infrastructure` | **Date**: 2025-02-16

## Prerequisites

- Node 18+
- pnpm 9+
- Docker (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed

## Full Workflow (End-to-End)

Run these steps in order to validate package setup:

```bash
# 1. Install dependencies
cd /path/to/tuition-lift
pnpm install

# 2. Start local Supabase (Docker required)
cd packages/database
supabase start

# 3. Copy credentials to .env.local (from supabase status output)
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...

# 4. Generate TypeScript types from schema
pnpm db:generate

# 5. Verify package builds
pnpm --filter @repo/db build

# 6. Validate stub consumer (import from apps/web)
pnpm --filter web check-types
```

Stub consumer: `apps/web/lib/db.ts` re-exports `createDbClient`, schemas, and types from `@repo/db`.

Then import from `@repo/db`:

```typescript
import { createDbClient } from '@repo/db';
import { profileSchema, parseOrThrow } from '@repo/db';
import type { Tables, Enums } from '@repo/db';
```

The stub consumer `apps/web/lib/db.ts` re-exports these for use across the app.

---

## 1. Install Dependencies

```bash
cd /path/to/tuition-lift
pnpm install
```

## 2. Start Local Supabase (Optional)

```bash
cd packages/database
supabase start
```

Copy the local credentials from `supabase status` into `.env.local` at repo root or in packages/database.

## 3. Generate Types

After migrations are applied (local or linked project):

```bash
cd packages/database
pnpm db:generate
# Or: supabase gen types typescript --local > src/generated/database.types.ts
```

## 4. Usage Examples

### Client, types, and schemas

```typescript
import { createDbClient } from '@repo/db';
import { waitlistSchema, profileSchema, scholarshipSchema, applicationSchema, parseOrThrow } from '@repo/db';
import type { Database, Tables, Enums } from '@repo/db';

const supabase = createDbClient();
```

### apps/web — Profiles (Server Component / Server Action)

```typescript
import {
  createDbClient,
  parseOrThrow,
  withEncryptedSai,
  profileSchema,
} from '@repo/db';

const supabase = createDbClient(); // server context
const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();

// Validate (SAI -1500..999999, Pell status, etc.), then encrypt SAI before write (FR-014):
const validated = parseOrThrow(profileSchema, payload);
const forDb = withEncryptedSai(validated);
await supabase.from('profiles').upsert(forDb);
```

### apps/web — Waitlist (Server Action, service-role)

```typescript
import { createDbClient } from '@repo/db';
import { waitlistSchema, parseOrThrow } from '@repo/db';

// Server Action uses service-role (bypasses RLS). Validate before insert.
const validated = parseOrThrow(waitlistSchema, { email, segment, referral_code });
const { error } = await createDbClient().from('waitlist').insert(validated);
```

### apps/web — Scholarship discovery (anon/authenticated)

```typescript
const { data } = await createDbClient()
  .from('scholarships')
  .select('id, title, amount, deadline, trust_score, category')
  .not('deadline', 'lt', new Date().toISOString());
```

### apps/agent (LangGraph)

```typescript
import { createDbClient } from '@repo/db';
import { PostgresSaver } from 'langgraph/checkpoint/postgres'; // or equivalent

const connectionString = process.env.DATABASE_URL;
const checkpointer = new PostgresSaver({ connectionString });
const graph = builder.compile({ checkpointer });
```

## 5. Add a Migration

```bash
cd packages/database
supabase migration new add_my_table
# Edit supabase/migrations/*_add_my_table.sql
supabase db push  # or: pnpm db:push
pnpm db:generate  # regenerate types
```

## 6. Run Tests

```bash
pnpm --filter @repo/db test
# Or from packages/database:
pnpm test
```

## LangGraph Checkpoint Setup (Agent Persistence)

Checkpoint tables for agent state are **not** created by Supabase migrations. The `@langchain/langgraph-checkpoint-postgres` package creates them when `PostgresSaver.setup()` is called.

**Setup flow (apps/agent)**:

1. Use `DATABASE_URL` (Supabase direct Postgres connection string, e.g. `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`).
2. Create checkpointer: `PostgresSaver.fromConnString(DATABASE_URL)`.
3. Call `await checkpointer.setup()` once before first use (e.g. on agent init). This creates the checkpoint tables in the configured schema (default: `public`).
4. Compile the graph with the checkpointer: `workflow.compile({ checkpointer })`.

**RLS**: Checkpoint tables are service-role/agent-only. No user-facing RLS; the agent accesses via `DATABASE_URL` (service credentials). Never expose checkpoint data to the client.

**Reference**: [LangGraph JS - Persistence with Postgres](https://langchain-ai.github.io/langgraphjs/how-tos/persistence-postgres/)

## Environment Variables

`createDbClient` reads these variables at runtime. Server context uses service-role when available; client context uses anon only (never exposes service-role to the browser).

| Variable | Required | Used By | Notes |
|----------|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client + Server | Supabase project URL. Required by `createDbClient`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client + Server | Public anon key. Used in browser; used on server when service-role is not set. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Server | For admin operations (bypasses RLS). Used by `createDbClient` in Node when set. **Never expose to client.** |
| `DATABASE_URL` | Agent | LangGraph checkpointer | Postgres connection string (direct DB URL for checkpointer). Not used by `createDbClient`. |

## Referral Tracking (Waitlist)

The waitlist supports `referral_code`, `referred_by`, and `referral_count`. **FR-005a**: When a user joins with an invalid or unknown referral code, the system MUST allow signup, leave `referred_by` empty, and NOT surface an error. Consumers implement the lookup: before insert, look up `waitlist` by `referral_code`; if found, set `referred_by` to that row's `id`; otherwise omit `referred_by` (null). The migration indexes `referred_by` for referrer count queries: `SELECT COUNT(*) FROM waitlist WHERE referred_by = $referrerId`.

## Row-Level Security (RLS)

All tables have RLS enabled (verified T029, T030). Profile data is protected from cross-user access.

| Table | RLS | Policies |
|-------|-----|----------|
| **waitlist** | Enabled | No policies for anon/authenticated (default deny). INSERT/SELECT/UPDATE via service-role only. |
| **profiles** | Enabled | SELECT, INSERT, UPDATE only where `auth.uid() = id`. No cross-user access. |
| **scholarships** | Enabled | Public SELECT (`USING (true)`). INSERT/UPDATE/DELETE service-role only. |
| **applications** | Enabled | SELECT, INSERT, UPDATE, DELETE only where `auth.uid() = user_id`. |

**Independent test**: With anon client, `SELECT` another user's profile → denied. With auth `auth.uid() = id` → allowed.

## Financial Aid Layer (Profiles)

Profiles support need-based scholarship matching via:

| Field | Type | Validation |
|-------|------|------------|
| `sai` | integer | -1500 to 999999 (profileSchema rejects out-of-range) |
| `pell_eligibility_status` | enum | `eligible`, `ineligible`, `unknown` |
| `household_size` | integer | positive |
| `number_in_college` | integer | ≥ 0 |

**Enum and migration**: `pell_eligibility_status` is defined in `00000000000000_create_enums.sql`; the profiles table uses it in `00000000000002_create_profiles.sql`.

**Usage**: Store SAI, pell_eligibility_status, and household context in a profile. Consumers can query need-based scholarships filtered by eligibility (e.g. `scholarship_category = 'need_based'` with profile SAI/Pell data).

## Package Scripts (packages/database/package.json)

| Script | Command | Purpose |
|--------|---------|---------|
| `db:generate` | `supabase gen types typescript --local` | Generate TypeScript types from schema |
| `db:push` | `supabase db push` | Apply migrations to linked remote |
| `db:reset` | `supabase db reset` | Reset local DB (dev only) |
