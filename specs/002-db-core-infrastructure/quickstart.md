# Quickstart: @repo/db Development

**Branch**: `002-db-core-infrastructure` | **Date**: 2025-02-13

## Prerequisites

- Node 18+
- pnpm 9+
- Docker (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed

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

## 4. Use in an App

### apps/web (Server Component)

```typescript
import { createDbClient } from '@repo/db';
import { profileSchema } from '@repo/db/schema';

const supabase = createDbClient(); // server context
const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();

// Before insert/update (validates SAI range -1500..999999, Pell status, etc.):
const validated = profileSchema.parse(payload);
await supabase.from('profiles').upsert(validated);
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

| Variable | Required | Used By | Notes |
|----------|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client + Server | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Server | For admin operations; never expose to client |
| `DATABASE_URL` | Agent | LangGraph checkpointer | Postgres connection string (direct DB URL for checkpointer) |

## Financial Aid Layer (Profiles)

Profiles support SAI (Student Aid Index, -1500 to 999999), `pell_eligibility_status` (eligible/ineligible/unknown), `household_size`, and `number_in_college`. The `profileSchema` validates SAI range before write; out-of-range values throw ZodError.

## Package Scripts (packages/database/package.json)

| Script | Command | Purpose |
|--------|---------|---------|
| `db:generate` | `supabase gen types typescript --local` | Generate TypeScript types from schema |
| `db:push` | `supabase db push` | Apply migrations to linked remote |
| `db:reset` | `supabase db reset` | Reset local DB (dev only) |
