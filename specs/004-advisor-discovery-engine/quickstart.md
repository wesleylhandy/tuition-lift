# Quickstart: Advisor Discovery Engine

**Branch**: `004-advisor-discovery-engine` | **Date**: 2025-02-13

## Prerequisites

- Node 18+
- pnpm
- Supabase project (002 migrations applied)
- Tavily API key ([app.tavily.com](https://app.tavily.com))
- LLM API key (OpenAI or Anthropic) for query generation

## Environment Variables

Add to `apps/agent/.env.local` (or Vercel env):

```bash
# Supabase (from 002)
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Tavily
TAVILY_API_KEY=tvly-xxx

# LLM (query generation)
OPENAI_API_KEY=xxx   # or ANTHROPIC_API_KEY

# Optional: rate limit between search batches (FR-014; default 2000 ms)
# Minimum delay in ms between Tavily calls to prevent 429 throttling. Tune for external limits.
DISCOVERY_SEARCH_BATCH_DELAY_MS=2000

# Optional: timeout for Tavily search batch (default 300000 ms = 5 min; T032)
# Prevents indefinite hang if Tavily API is slow or unresponsive.
DISCOVERY_SEARCH_TIMEOUT_MS=300000
```

## Setup Steps

1. **Install dependencies** (from repo root):
   ```bash
   pnpm install
   ```

2. **Run 002 migrations** (if not already):
   ```bash
   pnpm --filter @repo/db db:migrate
   ```

3. **Apply 004 migrations** (metadata, UNIQUE url):
   - Add migration in `packages/database/supabase/migrations/`
   - See [data-model.md](./data-model.md) for schema

4. **Verify checkpoint tables**:
   ```bash
   # PostgresSaver.setup() runs on first graph invocation
   # Or run manually if schema is managed separately
   ```

## Rate Limiting & Resumability (US4)

- **DISCOVERY_SEARCH_BATCH_DELAY_MS**: Minimum delay (ms) between Tavily search calls. Default 2000. Prevents 429 throttling (FR-014).
- **Checkpoints**: PostgresSaver writes a checkpoint after Advisor_Search (Scout). If Advisor_Verify fails or times out, resume with the same `thread_id` — Scout will not re-run.
- **Manual verification**: Run `pnpm verify-us4` to assert resumability.

## Running Discovery Locally

1. Start Supabase (local or remote)
2. Trigger discovery via 003 API or Inngest dev server:
   ```bash
   pnpm --filter web dev    # Next.js + Inngest
   ```
3. POST to `/api/discovery/trigger` (authenticated)
4. Poll `GET /api/discovery/status?thread_id=...`
5. On complete: `GET /api/discovery/results?thread_id=...`

## Key Files

| Path | Purpose |
|------|---------|
| `apps/agent/lib/nodes/advisor-search.ts` | Scout: query gen, Tavily, dedupe |
| `apps/agent/lib/nodes/advisor-verify.ts` | Trust score, cycle verify, persist |
| `apps/agent/lib/discovery/query-generator.ts` | LLM → 3–5 queries |
| `apps/agent/lib/discovery/tavily-client.ts` | Tavily API wrapper |
| `apps/agent/lib/discovery/trust-scorer.ts` | Reputation Engine |
| `apps/agent/lib/discovery/cycle-verifier.ts` | 2026/2027 deadline check |

## Testing

```bash
pnpm --filter agent test
```

Unit tests should mock Tavily and WHOIS; integration tests can use Tavily sandbox if available.

## Verification (T034)

Validate env and discovery flow:

1. **Build**: `pnpm --filter agent build` and `pnpm --filter agent check-types` — should succeed.
2. **Env vars**: Ensure `apps/agent/.env` or root `.env` has `DATABASE_URL`, `TAVILY_API_KEY`, `OPENAI_API_KEY`.
3. **US2 (Trust Report)**: `pnpm verify-us2` — full discovery; every result has trust_score and trust_report.
4. **US4 (Resumability)**: `pnpm verify-us4` — assert Scout not re-invoked on resume.

## SC-006 Timing (T035)

**Goal**: Discovery results within 5 minutes under normal load.

- **Design**: `DISCOVERY_SEARCH_TIMEOUT_MS=300000` (5 min) caps Tavily batch; rate limit (`DISCOVERY_SEARCH_BATCH_DELAY_MS=2000`) prevents throttling.
- **Validation**: Run `pnpm verify-us2` with `time pnpm verify-us2` and confirm completion under 5 min. Formal load tests deferred until infra ready.
