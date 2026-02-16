# Research: @repo/db Core Infrastructure

**Branch**: `002-db-core-infrastructure` | **Date**: 2025-02-13  
**Spec**: [spec.md](./spec.md)

## Resolved Technical Decisions

### 1. Supabase Type Generation

**Decision**: Use Supabase CLI `supabase gen types typescript` to generate TypeScript types from the database schema.

**Rationale**: Supabase CLI connects to the database (local or remote) and generates type definitions that match tables, views, and stored procedures. Types respect relationships, constraints, and custom types. Per Constitution Section 9: "Database interactions MUST use Supabase-generated types."

**Alternatives considered**:
- Manual TypeScript interfaces: Error-prone, drifts from schema.
- Prisma/Drizzle: Adds another ORM layer; Constitution mandates Supabase.

**Reference**: [Supabase CLI - supabase gen types](https://github.com/supabase/cli/blob/develop/docs/supabase/gen.md)

---

### 2. Zod Validation Layer

**Decision**: Define Zod schemas for every table; validate before all writes. Use `z.infer<typeof Schema>` for type extraction where useful.

**Rationale**: Constitution Section 9: "Schema validation MUST use Zod per its official documentation." Zod provides runtime validation and static type inference from a single source.

**Alternatives considered**:
- Supabase types only: No runtime validation; malformed data could reach DB.
- io-ts: Less ecosystem adoption than Zod; Constitution specifies Zod.

**Reference**: [Zod - Type inference](https://github.com/colinhacks/zod#type-inference)

**Financial Aid Layer (SAI validation)**: Use `z.number().int().min(-1500).max(999999)` for SAI. Federal Student Aid Index range is -1500 to 999999; Zod rejects out-of-range values before DB write. DB CHECK constraint provides defense-in-depth.

---

### 3. Supabase Client Factory (Server vs Client)

**Decision**: Export a singleton factory that detects runtime context. Server: use service-role or anon key from env; Client: use anon key only (never service-role in browser). Use `createClient(url, key)` from `@supabase/supabase-js`.

**Rationale**: Isomorphic client supports both Node (API routes, Server Components) and browser. Service-role must never be exposed to client. Environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client; optional `SUPABASE_SERVICE_ROLE_KEY` for server.

**Alternatives considered**:
- Separate server/client packages: Unnecessary; single package with runtime branching suffices.
- @supabase/ssr: Use for Next.js cookie-based sessions; client factory remains separate for simple anon access.

**Reference**: [Supabase JS - createClient](https://supabase.com/docs/reference/javascript/creating-a-client)

---

### 4. LangGraph Checkpoint Persistence

**Decision**: LangGraph uses `PostgresSaver` (or equivalent) with a Postgres connection. Checkpoints stored in tables created by `langgraph-checkpoint-postgres`. The `@repo/db` package provides the connection config and optionally runs migration for checkpoint tables; the agent app uses the checkpointer when compiling the graph.

**Rationale**: Constitution Section 9: "Checkpoints MUST be used to save agent progress in Supabase." LangGraph JS supports Postgres-backed checkpointers. Supabase is PostgreSQL—same DB, shared connection pool.

**Alternatives considered**:
- MemorySaver: Not durable; fails on server restart.
- Custom checkpoint table: LangGraph provides PostgresSaver; reuse rather than reimplement.

**Reference**: [LangGraph - Postgres checkpointer](https://docs.langchain.com/oss/python/langgraph/add-memory), [LangGraph.js persistence](https://langchain-ai.github.io/langgraphjs/concepts/persistence/)

---

### 5. Optimistic Locking Implementation

**Decision**: Add `updated_at` (timestamptz) to Profiles and Applications. Use Supabase `.eq('updated_at', oldValue)` in update conditions; if 0 rows affected, return conflict error for caller to retry.

**Rationale**: Spec clarification: "Optimistic locking—record has version or timestamp; concurrent write fails if version changed." Timestamp is simpler than version column for initial implementation; both are valid.

**Alternatives considered**:
- Version integer column: Slightly more explicit; timestamp sufficient and common in Supabase.
- Advisory locks: Overkill for typical web concurrency; optimistic locking preferred.

---

### 6. Academic Year Representation

**Decision**: Store `academic_year` as a string in format `"YYYY-YYYY"` (e.g., `"2025-2026"`). Compute dynamically from current date per Constitution Section 8; do not hardcode.

**Rationale**: Applications uniqueness is per (user, scholarship, academic_year). String format is human-readable, sortable, and aligns with common scholarship cycle naming.

**Alternatives considered**:
- Integer (start year only): Less explicit; "2025" could mean 2025-2026 or 2025-2026.
- Date range (start, end): More precise but heavier; YYYY-YYYY sufficient.

---

### 7. Referral Code Generation

**Decision**: Generate 8-character alphanumeric random string (e.g., `nanoid` or `crypto.randomBytes`). Ensure uniqueness via DB unique constraint; retry on collision (rare at expected scale).

**Rationale**: Spec: "Referral codes unique per user and sufficiently distinguishable." 8 chars provides ~2.8 trillion combinations; collision probability negligible for waitlist scale.

**Alternatives considered**:
- UUID: Long, not user-friendly for shareable links.
- Short numeric: Fewer combinations; alphanumeric preferred.

---

### 8. Cross-Spec Alignment (2025-02-16)

**Decision**: Add waitlist columns (segment, referral_count, unlock_sent_at) per 001; applications columns (momentum_score, submitted_at, last_progress_at, confirmed_at) per 005/006; waitlist RLS service-role only INSERT; rename priority_score → momentum_score; no household_income_bracket in profiles (derive from SAI at read).

**Rationale**: 002 is the canonical data layer. Consuming specs (001, 005, 006) require these fields; including them in 002 avoids downstream migrations and keeps single source of truth. Waitlist RLS: Server Actions use service-role for secure, validated inserts; no direct anon INSERT. household_income_bracket: computed from SAI by orchestration (003) at read time; avoids schema drift from federal tier changes.

**Alternatives considered**:
- Defer columns to consuming spec migrations: Fragments schema across specs; 002 would not be complete.
- Public waitlist INSERT: Bypasses Server Action validation; rate limiting and fraud checks would fail.
