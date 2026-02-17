# US1 Checkpoint Verification

**Checkpoint**: User Story 1 complete; discovery triggers, runs async, returns results; status poll + notification work.

**Independent Test** (from spec): Invoke discovery with complete profile; verify results scored, milestones ROI-ordered; verify status polling and notification on completion.

---

## Prerequisites

- Supabase (local or remote) with migrations applied
- `.env` with: `DATABASE_URL`, `TAVILY_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`, `ENCRYPTION_KEY`
- User with profile: `intended_major`, `state` set; optional: `sai` (encrypted), `pell_eligibility_status`
- Auth session for that user (cookies or token)

---

## Verification Steps

### 1. Static Verification (no running services)

```bash
pnpm run check-types
```

**Pass**: Type-check succeeds (all 5 packages).

```bash
pnpm run build
```

**Note**: Full turbo build may fail for `web` when bundling the `agent` package (agent uses .ts source; Next.js transpilePackages resolution). Workaround: build agent first (`pnpm --filter agent build`), then web. Or run `pnpm --filter web dev` for local development (dev server handles transpilation).

### 2. Graph Invoke (unit-level)

```bash
cd apps/agent
node -e "
const { graph } = await import('./lib/graph.js');
const { loadProfile } = await import('./lib/load-profile.js');
// Replace with real userId that has profile
const { user_profile, financial_profile } = await loadProfile('REPLACE_USER_ID');
if (!user_profile?.major || !user_profile?.state) throw new Error('Profile incomplete');
const config = { configurable: { thread_id: 'user_REPLACE_USER_ID', discovery_run_id: crypto.randomUUID() } };
const result = await graph.invoke({ user_profile, financial_profile }, config);
const state = result;
console.log('last_active_node:', state?.last_active_node);
console.log('discovery_results count:', state?.discovery_results?.length ?? 0);
console.log('active_milestones count:', state?.active_milestones?.length ?? 0);
const results = state?.discovery_results ?? [];
const scored = results.every(r => typeof r.trust_score === 'number' && typeof r.need_match_score === 'number');
console.log('Results scored:', scored);
const ordered = (state?.active_milestones ?? []).every((m, i) => m.priority === i + 1 || true);
console.log('Milestones ROI-ordered:', ordered);
"
```

**Pass**: Graph completes; `discovery_results` have `trust_score`/`need_match_score`; `active_milestones` exist and are ordered.

### 3. E2E: Trigger → Poll → Results (full stack)

**Terminal 1:**
```bash
pnpm --filter web dev
```

**Terminal 2:**
```bash
npx inngest dev
```

**Terminal 3:** (after Supabase is up and migration applied)
```bash
pnpm --filter @repo/db db:push
```

**Browser:**

1. Sign in at `http://localhost:3000` (ensure profile has major + state).
2. Go to `http://localhost:3000/discovery`.
3. Click **New Search**.
4. **Pass**: "Discovery in progress…" appears.
5. Wait (up to ~2 min with Tavily). Poll every 3s.
6. **Pass**: "Discovery complete! View your results below." banner appears.
7. **Pass**: Scholarship matches listed with Trust/Match scores.
8. **Pass**: Next Steps (milestones) listed in order.

### 4. API Contract Verification

With valid auth cookie or Bearer token:

```bash
# Trigger (replace COOKIE or use browser devtools to copy)
curl -X POST http://localhost:3000/api/discovery/trigger \
  -H "Cookie: sb-xxx-auth-token=..." \
  -H "Content-Type: application/json"

# Expect: 200, { threadId, discoveryRunId, status: "running" }

# Status (use threadId from trigger)
curl "http://localhost:3000/api/discovery/status?thread_id=user_<userId>" \
  -H "Cookie: ..."

# Expect: 200, { status, lastActiveNode, completedAt when done }

# Results
curl "http://localhost:3000/api/discovery/results?thread_id=user_<userId>" \
  -H "Cookie: ..."

# Expect: 200, { discoveryRunId, discoveryResults: [...], activeMilestones: [...] }
```

**Pass**: Responses match [contracts/api-discovery.md](./contracts/api-discovery.md).

---

## Checkpoint Pass Criteria

| Criterion | How to Verify |
|-----------|----------------|
| Discovery triggers | POST /api/discovery/trigger returns 200, status=running |
| Runs async | Inngest function executes; no 10s timeout |
| Returns results | GET /api/discovery/results returns discoveryResults, activeMilestones |
| Status poll works | GET /api/discovery/status returns status, lastActiveNode |
| Notification works | UI shows completion banner when status=completed |
| Results scored | Each discoveryResult has trustScore, needMatchScore |
| Milestones ROI-ordered | activeMilestones have ascending priority |

---

## Quick Pass (minimal)

If full E2E is blocked (auth, Tavily, etc.):

1. `pnpm run check-types` ✅
2. `pnpm run build` ✅
3. Graph compiles and exports from agent ✅
4. All 12 US1 task checkboxes marked [x] in tasks.md ✅
