# Implementation Plan: System Orchestration & State Graph

**Branch**: `003-langgraph-orchestration` | **Date**: 2025-02-13 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/003-langgraph-orchestration/spec.md`

## Summary

Build a durable, stateful orchestration layer using LangGraph JS that coordinates the Advisor (Discovery Specialist) and Coach (Execution Specialist). TuitionLiftState is the single source of truth; checkpoints persist every transition in Supabase. **Graph topology**: Advisor_Search and Advisor_Verify are separate nodes (FR-003—checkpoint after search, before verification). Inngest serve route and functions run in apps/web; graph and node logic live in apps/agent. Inngest triggers long-running discovery to bypass Vercel timeouts. Advisor performs anonymized search, scores results, and hands off via Command to Coach for ROI-based prioritization. SafeRecovery handles node failures; LangSmith provides tracing.

## Technical Context

**Language/Version**: TypeScript 5.x (Node 18+)  
**Primary Dependencies**: LangGraph JS (@langchain/langgraph), @langchain/langgraph-checkpoint-postgres, Inngest, Supabase  
**Storage**: Supabase (PostgreSQL) — checkpoints table via PostgresSaver; profiles, scholarships from @repo/db  
**Testing**: Vitest or Jest for unit; Inngest test utilities for workflow  
**Target Platform**: Vercel (apps/web, apps/agent or shared functions)  
**Project Type**: Turborepo monorepo (web + agent)  
**Performance Goals**: Discovery-to-plan ≤ 5 min (single-user); 60s error notification; 95% handoff success  
**Constraints**: Vercel 10–30s timeout bypassed via Inngest; checkpoint after search, before verification  
**Scale/Scope**: Single-user sequential for v1; concurrent load deferred

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Mission & scope:** ✓ Feature supports "Search → Verify → Apply"; core loop (Discovery → Coach prioritization) is primary scope.
- **Technical standards:** ✓ Next.js App Router, React, Tailwind + Shadcn/ui, LangGraph for agentic flows, Supabase with RLS; agent logic in apps/agent or packages; secrets server-only.
- **Security & PII:** ✓ No raw PII to third-party APIs; financial data anonymized to brackets; Trust Filter for scholarships; no data brokering.
- **Workflow:** ✓ Spec and plan exist; tasks will be atomic.
- **UX/UI:** ✓ MVP scope; WCAG 2.1 AA; Loading/Empty states (discovery in progress, notification on complete).
- **Forbidden:** ✓ No inline styles; no floating promises in LangGraph (try/catch + Command to SafeRecovery); no mock data; Loading/Empty handled.
- **Data integrity:** ✓ .edu/.gov weighted 2×; dynamic cycle checks; no hardcoded academic years.
- **Documentation protocol:** ✓ References LangGraph JS, Supabase, Zod, Inngest official docs; App Router; Zod for schemas; Checkpoints for persistence.

## Project Structure

### Documentation (this feature)

```text
specs/003-langgraph-orchestration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-discovery.md
└── tasks.md             # Phase 2 (speckit.tasks)
```

### Source Code (repository root)

```text
apps/
├── web/                 # Next.js user-facing app (Vercel)
│   ├── app/
│   │   └── api/
│   │       ├── inngest/           # Inngest webhook (serve route)
│   │       └── discovery/
│   │           ├── trigger/
│   │           ├── status/
│   │           ├── confirm-sai/
│   │           └── results/
│   ├── app/discovery/            # Discovery UI (status poll, results, notification)
│   └── lib/
│       └── inngest/
│           └── functions.ts     # Inngest function definitions (import graph from apps/agent)
├── agent/               # LangGraph agent service (graph + nodes)
│   └── lib/
│       ├── graph.ts
│       ├── state.ts
│       ├── checkpointer.ts
│       ├── load-profile.ts
│       ├── anonymize-financial.ts
│       ├── status.ts
│       └── nodes/
│           ├── advisor-search.ts   # Search only; checkpoint after this (FR-003)
│           ├── advisor-verify.ts  # Score + Trust Filter; returns Command to Coach
│           ├── coach-prioritization.ts
│           └── safe-recovery.ts
packages/
├── database/            # @repo/db (from 002)
└── [shared packages]
```

**Graph Topology (FR-003)**: Advisor_Search and Advisor_Verify are **separate graph nodes**. LangGraph checkpoints after each node; thus checkpoint occurs after search, before verification. Flow: START → Advisor_Search → Advisor_Verify → Coach_Prioritization → END. SafeRecovery reachable from any node on error.

**Structure Decision**: Turborepo monorepo per Constitution. **Inngest**: serve route and function definitions in apps/web (Next.js API route /api/inngest; functions in lib/inngest). **Graph**: compiled graph and node logic in apps/agent. apps/web Inngest functions import the graph from apps/agent (workspace dependency). API routes in apps/web. Checkpoints use existing packages/database connection.

## Complexity Tracking

No Constitution violations requiring justification.
