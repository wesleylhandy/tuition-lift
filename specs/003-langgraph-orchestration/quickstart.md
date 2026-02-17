# Quickstart: System Orchestration & State Graph

**Branch**: `003-langgraph-orchestration` | **Date**: 2025-02-13

## Prerequisites

- @repo/db (002) package available with profiles, checkpoints
- Node 18+
- pnpm 9+
- Supabase (local or remote) with `DATABASE_URL`

## 1. Install Dependencies

```bash
pnpm add @langchain/langgraph @langchain/langgraph-checkpoint-postgres inngest
```

## 2. Environment Variables

| Variable | Required | Used By | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | Yes | PostgresSaver | Supabase Postgres connection string |
| `LANGCHAIN_API_KEY` | Optional | LangSmith | Tracing (FR-019) |
| `LANGCHAIN_TRACING_V2` | Optional | LangSmith | Set `true` to enable |
| `INNGEST_SIGNING_KEY` | Yes (prod) | Inngest | Webhook signing |
| `INNGEST_EVENT_KEY` | Yes (prod) | Inngest | Send events |

## 3. Checkpointer Setup

```typescript
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL!);
await checkpointer.setup(); // First-time: creates tables
```

## 4. Define TuitionLiftState

```typescript
import { Annotation } from "@langchain/langgraph";

const TuitionLiftState = Annotation.Root({
  user_profile: Annotation<UserProfile>({ reducer: (_, y) => y }),
  discovery_results: Annotation<DiscoveryResult[]>({ reducer: (_, y) => y }),
  active_milestones: Annotation<ActiveMilestone[]>({ reducer: (_, y) => y }),
  messages: Annotation<BaseMessage[]>({ reducer: (x, y) => x.concat(y) }),
  last_active_node: Annotation<string>({ reducer: (_, y) => y }),
  financial_profile: Annotation<FinancialProfile>({ reducer: (_, y) => y }),
  error_log: Annotation<ErrorLogEntry[]>({ reducer: (x, y) => x.concat(y) }),
});
```

## 5. Compile Graph with Checkpointer

```typescript
import { StateGraph, START, END } from "@langchain/langgraph";

// FR-003: Advisor_Search and Advisor_Verify are separate nodes; checkpoint occurs between them
const builder = new StateGraph(TuitionLiftState)
  .addNode("Advisor_Search", advisorSearchNode)
  .addNode("Advisor_Verify", advisorVerifyNode)
  .addNode("Coach_Prioritization", coachPrioritizationNode)
  .addNode("SafeRecovery", safeRecoveryNode)
  .addEdge(START, "Advisor_Search")
  .addEdge("Advisor_Search", "Advisor_Verify")
  // Advisor_Verify returns Command to Coach or SafeRecovery on error
  .addEdge("Advisor_Verify", "Coach_Prioritization")
  .addEdge("Coach_Prioritization", END);

const graph = builder.compile({ checkpointer });
```

## 6. Invoke from Inngest (Bypass Vercel Timeout)

```typescript
import { Inngest } from "inngest";
import { graph } from "../../agent/lib/graph"; // apps/web workspace dep on apps/agent

const inngest = new Inngest({ id: "tuition-lift" });

export const discoveryFunction = inngest.createFunction(
  { id: "discovery", timeout: "5m" },
  { event: "tuition-lift/discovery.requested" },
  async ({ event, step }) => {
    const { userId, threadId, useSaiRange } = event.data;
    const config = { configurable: { thread_id: threadId } };
    await graph.invoke(
      { /* initial state from profiles */ },
      config
    );
    return { status: "completed", threadId };
  }
);
```

## 7. Trigger Discovery (API Route)

```typescript
// apps/web/app/api/discovery/trigger/route.ts
import { inngest } from "@/lib/inngest";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const threadId = `user_${session.user.id}`;
  // Check if run already in progress (FR-013a)
  const existing = await getRunStatus(threadId);
  if (existing?.status === "running") {
    return Response.json({ threadId, status: "running", message: "Discovery already in progress." });
  }

  await inngest.send({
    name: "tuition-lift/discovery.requested",
    data: { userId: session.user.id, threadId, useSaiRange: false },
  });

  return Response.json({ threadId, status: "running", message: "Discovery in progress." });
}
```

## 8. Handoff Pattern (Advisor_Verify → Coach)

```typescript
import { Command } from "@langchain/langgraph";

// Advisor_Search: performs web search, returns state update (raw results)
// Advisor_Verify: scores results, applies Trust Filter, returns Command
const advisorVerifyNode = async (state: TuitionLiftState) => {
  try {
    const verified = await verifyResults(state.rawSearchResults);
    return new Command({
      goto: "Coach_Prioritization",
      update: {
        discovery_results: verified,
        last_active_node: "Advisor_Verify",
      },
    });
  } catch (err) {
    return new Command({
      goto: "SafeRecovery",
      update: {
        error_log: [{ node: "Advisor_Verify", message: String(err), timestamp: new Date().toISOString() }],
      },
    });
  }
};
```

## 9. Run Locally

```bash
# Terminal 1: Next.js
pnpm --filter web dev

# Terminal 2: Inngest Dev Server (for local function execution)
npx inngest dev
```

## 10. Verify Checkpoints (US1–US4)

Run from repo root with `.env` loaded:

```bash
pnpm verify-checkpoints
```

Verifies: checkpointer setup, state persistence (scheduled refresh path), and `discovery_completions` table. Requires `DATABASE_URL`; Supabase vars needed for the table check.

**Full e2e (including Inngest serve route)**: With `pnpm --filter web dev` running, run:

```bash
WEB_URL=http://localhost:3000 pnpm verify-checkpoints
```

This confirms the Inngest serve route at `/api/inngest` is reachable for event ingestion.

### 10a. Verify SC-001 (5-Minute SLA)

```bash
pnpm verify-sc001
```

Runs discovery end-to-end (graph.invoke) and asserts completion within 5 minutes. Requires a test profile with `intended_major` and `state`; optionally set `SC001_TEST_USER_ID` to target a specific user. Skips gracefully if no profile available.

---

## 11. Lighthouse (SC-007 / T041)

Verify discovery flow meets Performance and Best Practices scores ≥ 90 each (Constitution Section 6).

**Trigger view (automated)** — With dev server running (`pnpm --filter web dev`):

```bash
pnpm --filter web lighthouse:discovery
```

Defaults to `http://localhost:3000/discovery`. Pass a custom URL or set `LIGHTHOUSE_URL` if needed.

**All three views (manual)** — For full SC-007 verification of trigger, status poll, and results views, run Lighthouse manually in Chrome DevTools (F12 → Lighthouse tab) while logged in: load `/discovery`, run audit; click "New Search", run audit before completion; wait for results, run audit.

---

## 12. References

- [LangGraph JS State](https://langchain-ai.github.io/langgraphjs/concepts/state/)
- [LangGraph Persistence](https://langchain-ai.github.io/langgraphjs/how-tos/persistence/)
- [Multi-Agent Handoffs](https://langchain-ai.github.io/langgraphjs/how-tos/multi-agent-handoffs/)
- [Inngest Create Function](https://www.inngest.com/docs/reference/functions/create)
- [API Contracts](./contracts/api-discovery.md)
