# Implementation Plan: System Orchestration & State Graph

**Branch**: `003-langgraph-orchestration` | **Date**: 2025-02-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/003-langgraph-orchestration/spec.md`

## Summary

Build a durable, stateful orchestration layer using LangGraph JS that coordinates the Advisor (Discovery Specialist) and Coach (Execution Specialist). TuitionLiftState is the single source of truth; checkpoints persist every transition in Supabase. **Graph topology**: Advisor_Search and Advisor_Verify are separate nodes (FR-003—checkpoint after search, before verification). Inngest serve route and functions run in apps/web; graph and node logic live in apps/agent. Inngest triggers long-running discovery to bypass Vercel timeouts. Advisor performs anonymized search, scores results, and hands off via Command to Coach for ROI-based prioritization. SafeRecovery handles node failures; LangSmith provides tracing. **002/006 alignment**: household_income_bracket derived from SAI at read (not stored); discovery_run_id exposed with results for 006 dismissals scoping.

## Technical Context

**Language/Version**: TypeScript 5.x (Node 18+)
**Primary Dependencies**: LangGraph JS (@langchain/langgraph), @langchain/langgraph-checkpoint-postgres, Inngest, Supabase
**Storage**: Supabase (PostgreSQL) — checkpoints table via PostgresSaver; profiles, scholarships from @repo/db; discovery_completions table (includes discovery_run_id)
**Testing**: Vitest or Jest for unit; Inngest test utilities for workflow
**Target Platform**: Vercel (apps/web, apps/agent or shared functions)
**Project Type**: Turborepo monorepo (web + agent)
**Performance Goals**: Discovery-to-plan ≤ 5 min (single-user); 60s error notification; 95% handoff success
**Constraints**: Vercel 10–30s timeout bypassed via Inngest; checkpoint after search, before verification
**Scale/Scope**: Single-user sequential for v1; concurrent load deferred

## Constitution Check

*GATE: Passed before Phase 0. Re-checked after Phase 1 design.*

- **Mission & scope:** ✓ Feature supports "Search → Verify → Apply"; core loop (Discovery → Coach prioritization) is primary scope.
- **Technical standards:** ✓ Next.js App Router, React, Tailwind + Shadcn/ui, LangGraph for agentic flows, Supabase with RLS; agent logic in apps/agent or packages; secrets server-only.
- **Security & PII:** ✓ No raw PII to third-party APIs; financial data anonymized to brackets; Trust Filter for scholarships; no data brokering. household_income_bracket computed from SAI at read (002 FR-014a).
- **Workflow:** ✓ Spec and plan exist; tasks are atomic.
- **UX/UI:** ✓ MVP scope; WCAG 2.1 AA; Loading/Empty states (discovery in progress, notification on complete).
- **Forbidden:** ✓ No inline styles; no floating promises in LangGraph; no mock data; Loading/Empty handled.
- **Data integrity:** ✓ .edu/.gov weighted 2×; dynamic cycle checks; no hardcoded academic years.
- **Documentation protocol:** ✓ References LangGraph JS, Supabase, Zod, Inngest official docs; Checkpoints for persistence.

## Project Structure

### Documentation (this feature)

```text
specs/003-langgraph-orchestration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api-discovery.md
└── tasks.md             # Phase 2 (speckit.tasks)
```

### Source Code (repository root)

```text
apps/
├── web/
│   ├── app/api/
│   │   ├── inngest/           # Inngest webhook (serve route)
│   │   └── discovery/
│   │       ├── trigger/
│   │       ├── status/
│   │       ├── confirm-sai/
│   │       └── results/
│   └── lib/inngest/
│       └── functions.ts
├── agent/
│   └── lib/
│       ├── graph.ts
│       ├── state.ts
│       ├── checkpointer.ts
│       ├── load-profile.ts      # Derives household_income_bracket from SAI (002)
│       ├── anonymize-financial.ts
│       ├── status.ts
│       └── nodes/
│           ├── advisor-search.ts
│           ├── advisor-verify.ts   # Assigns discovery_run_id to results
│           ├── coach-prioritization.ts
│           └── safe-recovery.ts
packages/
└── database/            # @repo/db (002)
```

**Graph Topology (FR-003)**: Advisor_Search and Advisor_Verify are separate nodes. Checkpoint occurs after search, before verification. Flow: START → Advisor_Search → Advisor_Verify → Coach_Prioritization → END. SafeRecovery reachable from any node on error.

**002/006 Alignment**:
- load-profile: Derive household_income_bracket from profiles.sai at read; no column in profiles.
- discovery_run_id: Generate uuid at run start; include in discovery_completions and discovery_results; expose via GET /api/discovery/results and status for 006 dismissals.

## Schema Alignment (2025-02-16)

| Item | Source | Notes |
|------|--------|-------|
| household_income_bracket | 002 FR-014a | Compute from SAI at read; not stored |
| discovery_run_id | FR-009a | discovery_completions, DiscoveryResult; 006 scoping |
| discovery_completions | 003 | Add migration in packages/database or 003 |

## Complexity Tracking

No Constitution violations requiring justification.
