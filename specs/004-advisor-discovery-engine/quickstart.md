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

# Optional: rate limit (default 2000 ms)
DISCOVERY_SEARCH_BATCH_DELAY_MS=2000
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
