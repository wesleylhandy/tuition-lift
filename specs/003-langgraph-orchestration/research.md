# Research: System Orchestration & State Graph

**Branch**: `003-langgraph-orchestration` | **Date**: 2025-02-13  
**Spec**: [spec.md](./spec.md)

## Resolved Technical Decisions

### 1. LangGraph Checkpoint Persistence (Supabase/PostgreSQL)

**Decision**: Use `@langchain/langgraph-checkpoint-postgres` with `PostgresSaver`, connected to Supabase via `DATABASE_URL` (Supabase connection string). Call `checkpointer.setup()` on first use to create checkpoint tables.

**Rationale**: Constitution Section 9 mandates "Checkpoints MUST be used to save agent progress in Supabase." LangGraph JS provides official `PostgresSaver`; Supabase is PostgreSQL—direct compatibility. Spec 002 research already established this approach. The community package `@skroyc/langgraph-supabase-checkpointer` referenced in examples.md does not appear on npm; the official PostgresSaver with Supabase connection is the supported path.

**Alternatives considered**:
- Custom SupabaseSaver: Unnecessary; PostgresSaver works with Supabase connection string.
- MemorySaver: Not durable; fails on server restart (Constitution violation).

**Reference**: [LangGraph JS - Persistence with Checkpointers](https://langchain-ai.github.io/langgraphjs/how-tos/persistence/), [@langchain/langgraph-checkpoint-postgres](https://www.npmjs.com/package/@langchain/langgraph-checkpoint-postgres)

---

### 2. Async Discovery via Inngest (Vercel Timeout Bypass)

**Decision**: Use Inngest to trigger `advisorAgent.invoke()` as a background function. Next.js API route receives "New Search" request, sends event to Inngest (e.g., `tuition-lift/discovery.requested`), and returns immediately with thread_id. Inngest function runs discovery with extended timeout (e.g., 5 minutes).

**Rationale**: FR-013 requires discovery workflows to exceed request timeout limits (10–30s). Vercel serverless has hard limits; Inngest provides durable execution with configurable timeouts (e.g., `timeout: "5m"`).

**Alternatives considered**:
- Edge streaming: Complex; doesn't solve timeout for full discovery run.
- Vercel background functions: Not available in standard plans.
- Separate worker service: Adds infrastructure; Inngest is serverless and integrates with Next.js.

**Reference**: [Inngest - Create Function](https://www.inngest.com/docs/reference/functions/create), [Inngest JS SDK](https://github.com/inngest/inngest-js)

---

### 3. TuitionLiftState Schema (Annotation.Root)

**Decision**: Define `TuitionLiftState` using `Annotation.Root` with typed fields: `user_profile`, `discovery_results`, `active_milestones`, `messages`, `last_active_node`, `financial_profile`, `error_log`. Use appropriate reducers: append for messages/discovery_results, overwrite for last_active_node, merge for others.

**Rationale**: LangGraph JS state management uses Annotation.Root; FR-001 requires central shared state. Reducers control how concurrent updates merge (e.g., messages append; last_active_node overwrites).

**Alternatives considered**:
- Unstructured state object: No type safety; harder to validate.
- Separate state per agent: Would require sync layer; single root state simplifies handoffs.

**Reference**: [LangGraph JS - State Management](https://langchain-ai.github.io/langgraphjs/concepts/state/), [Multi-Agent Handoffs](https://langchain-ai.github.io/langgraphjs/how-tos/multi-agent-handoffs/)

---

### 4. Advisor → Coach Handoff via Command

**Decision**: Advisor_Verify node returns `new Command({ goto: "Coach_Prioritization", update: { ... } })` when results are verified. Use LangGraph's `Command` object for explicit routing and state update.

**Rationale**: FR-009 requires handoff via Command object. LangGraph multi-agent pattern uses Command for goto and update; aligns with official documentation.

**Reference**: [LangGraph - Implementing Agent Handoffs](https://langchain-ai.github.io/langgraphjs/concepts/multi_agent/), [Multi-Agent Network Example](https://github.com/langchain-ai/langgraphjs/blob/main/examples/how-tos/multi-agent-network.ipynb)

---

### 5. Checkpoint Placement (After Search, Before Verification)

**Decision**: Add an explicit checkpoint point in the graph: run checkpoint write after the search node completes and before the verification logic runs. Structure graph as: `Advisor_Search` → (checkpoint) → `Advisor_Verify` → `Coach_Prioritization`.

**Rationale**: FR-003 requires checkpoint after search but before verification so failed verification does not trigger search re-run. LangGraph checkpoints after each node by default; ensure verification is a separate node so checkpoint occurs between them.

**Alternatives considered**:
- Single node for search+verify: Would checkpoint only after both; verification failure would lose search results.
- Manual checkpoint call: LangGraph checkpoints automatically per node; graph structure achieves the requirement.

---

### 6. Safe Recovery and Error Routing

**Decision**: Add conditional edge from each node to a `SafeRecovery` node on caught errors. In the node, wrap logic in try/catch; on failure, set `error_log` in state and return `Command({ goto: "SafeRecovery" })`. SafeRecovery node invokes Coach persona to notify user (e.g., write to messages, trigger notification).

**Rationale**: FR-017, FR-018 require error_log update and routing to Safe Recovery; Coach notifies user. Constitution: "No floating promises; all async calls must be awaited and wrapped in error boundaries."

**Reference**: [LangGraph - Error Handling](https://langchain-ai.github.io/langgraphjs/) (general error boundaries)

---

### 7. Financial Anonymization for Search APIs

**Decision**: Before calling third-party search APIs (e.g., Tavily), map `financial_profile` to anonymized strings only: `household_income_bracket` → "Low Income" | "Moderate" | "Middle" | "Upper-Middle" | "High"; `is_pell_eligible` → "Pell Eligible" | "Not Pell Eligible" | "Unknown". Use placeholders for geo (e.g., {{USER_STATE}}, {{USER_CITY}}); never send raw student names or addresses (FR-007a). Never send `estimated_sai` raw; SAI range (e.g., "0–2000") only after HITL confirmation (FR-016).

**Rationale**: FR-007, SC-003: zero raw PII to external APIs. Constitution Section 4: placeholders for sensitive data. Brackets from spec clarification; SAI range requires confirmation.

---

### 8. Observability (LangSmith)

**Decision**: Enable LangSmith tracing for the LangGraph workflow. Set `LANGCHAIN_TRACING_V2=true` and `LANGCHAIN_API_KEY` in agent environment. Traces will show node executions, handoffs, and state transitions (FR-019).

**Rationale**: FR-019 requires real-time tracing of agent handoffs. LangSmith integrates with LangChain/LangGraph out of the box.

**Reference**: [LangSmith](https://smith.langchain.com/), LangChain docs

---

### 9. Scheduled Prioritization (Cron)

**Decision**: Use Inngest cron trigger (e.g., `cron: "0 6 * * *"` for 6 AM daily) to fire event `tuition-lift/prioritization.scheduled`. Inngest function loads active threads/users with discovery results and invokes Coach_Prioritization node for each.

**Rationale**: FR-010 requires Coach_Prioritization on a defined schedule (e.g., daily). Inngest supports cron; no separate cron service needed.

**Reference**: [Inngest - Cron Triggers](https://www.inngest.com/docs/guides/scheduled-cron-jobs)

---

### 10. Notification Delivery (Bell/Toaster)

**Decision**: When discovery completes, write a completion record (e.g., `discovery_completions` table or update `threads` with status). Frontend polls `GET /api/discovery/status?thread_id=X` or subscribes via Supabase Realtime to a `user_notifications` table. On status=complete, show toaster/bell. Keep polling as fallback for environments without Realtime.

**Rationale**: FR-013b requires notification when discovery completes. Supabase Realtime provides push; polling provides fallback. Avoids separate push service for MVP.

---

### 11. discovery_run_id for 006 Dismissals (2025-02-16)

**Decision**: Generate a uuid for each discovery run at start; include in discovery_completions (as discovery_run_id column) and in each DiscoveryResult in state. Expose via GET /api/discovery/results and GET /api/discovery/status responses so 006 can scope dismissals by run (soft dismiss: hidden for current run only; reappears on new discovery).

**Rationale**: 006 dismissals table expects discovery_run_id to filter "dismissed for this run." Without it, 006 falls back to timestamp heuristics. Per 2025-02-16 clarification: add discovery_run_id to support clean soft-dismiss semantics.

**Alternatives considered**:
- Timestamp heuristic: Fragile; run boundaries unclear.
- No run ID: 006 would filter by user+scholarship only; dismissals would persist across runs (stricter than spec).
