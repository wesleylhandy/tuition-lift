# Quickstart: Coach Execution Engine

**Branch**: `005-coach-execution-engine` | **Date**: 2025-02-13

## Prerequisites

- Node 18+
- pnpm
- Supabase project (002, 003 migrations applied)
- Inngest (from 003)
- Resend API key (from 001)

## Environment Variables

Add to `apps/web/.env.local` (or Vercel env):

```bash
# Supabase (from 002)
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Inngest (from 003)
INNGEST_SIGNING_KEY=xxx
INNGEST_EVENT_KEY=xxx

# Resend (from 001)
RESEND_API_KEY=re_xxx

# Coach-specific (optional)
COACH_GAME_PLAN_CRON="0 6 * * *"           # 6 AM daily
COACH_DEADLINE_CHECK_CRON="0 * * * *"     # Hourly
COACH_MICRO_TASK_CHECK_CRON="0 */4 * * *" # Every 4 hours
```

## Setup Steps

1. **Install dependencies** (from repo root):
   ```bash
   pnpm install
   ```

2. **Run 005 migrations** (notification_log, check_in_tasks, etc.):
   ```bash
   pnpm --filter @repo/db db:migrate
   ```

3. **Apply 005 migrations**:
   - Add migrations in `packages/database/supabase/migrations/`
   - See [data-model.md](./data-model.md) for schema

4. **Verify Inngest functions**:
   - Coach functions registered in `apps/web/lib/inngest/functions.ts`
   - Run `npx inngest dev` to test locally

## Running Coach Engine Locally

1. Start Supabase (local or remote)
2. Start apps:
   ```bash
   pnpm --filter web dev    # Next.js + Inngest
   ```
3. In another terminal:
   ```bash
   npx inngest dev
   ```
4. Trigger game plan:
   - Wait for cron, or
   - Send Inngest event manually: `tuition-lift/coach.game-plan.daily`

## Key Files

| Path | Purpose |
|------|---------|
| `apps/web/lib/inngest/functions/coach.ts` | Inngest Coach functions (game plan, deadline, check-in, micro-task) |
| `apps/agent/lib/coach/momentum-score.ts` | Momentum Score calculation |
| `apps/agent/lib/coach/state-mapper.ts` | Coach state ↔ DB enum mapping |
| `apps/web/app/api/coach/game-plan/route.ts` | GET Top 3 Game Plan |
| `apps/web/app/api/coach/application/status/route.ts` | POST status transition |
| `apps/web/lib/email/coach-templates/` | React Email Coach templates (deadline, micro-task, top3) |

## Testing

```bash
pnpm --filter web test
pnpm --filter agent test
```

Unit tests should mock Resend and Inngest; integration tests can use Inngest dev server.
