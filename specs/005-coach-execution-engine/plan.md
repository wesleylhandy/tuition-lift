# Implementation Plan: Coach Execution Engine

**Branch**: `005-coach-execution-engine` | **Date**: 2025-02-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-coach-execution-engine/spec.md`

## Summary

Build an automation and state-management system for the Coach persona: daily Top 3 Game Plan (momentum_score), application lifecycle with HITL verification (Submitted, Won), deadline notifications (72h/24h), post-submission Check-in (21 days), and stale-progress Micro-Task (48h). Uses Inngest for cron and event-driven workflows; Resend + React Email for notifications; mapping layer (Coach states ↔ DB application_status); notification_log for 24h frequency limit. Persists momentum_score, submitted_at, last_progress_at, confirmed_at to applications (002 alignment). Coach_Prioritization consumes discovery_results from Advisor (004); may produce Coach's Take for 006.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js)  
**Primary Dependencies**: Inngest, Resend, React Email, LangGraph (Coach_Prioritization node), @repo/db, Supabase  
**Storage**: Supabase; applications (momentum_score, submitted_at, last_progress_at, confirmed_at); notification_log, check_in_tasks; profiles.preferences or application_snoozes for snooze  
**Testing**: Vitest; mock Resend and Inngest; Inngest dev server for integration  
**Target Platform**: Node.js (Vercel); Inngest runs cron/events  
**Project Type**: monorepo (Turborepo)  
**Performance Goals**: Top 3 within 1h of daily access (SC-001); deadline notifications within 2h of threshold (SC-004); Micro-Task within 4h of 48h threshold (SC-007)  
**Constraints**: Max one email + one dashboard nudge per student per 24h; snooze not past deadline  
**Scale/Scope**: Coach_Prioritization node; Inngest functions; API routes; state mapper; Momentum Score; ~10–15 modules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with `.specify/memory/constitution.md`:

- **Mission & scope:** Feature supports "Search → Verify → Apply"; Coach handles execution, prioritization, verification; core-loop work.
- **Technical standards:** LangGraph for Coach_Prioritization; Inngest for automation; agent logic in apps/agent; API routes in apps/web; shared data in packages/database; deps latest; no HIGH/CRITICAL CVEs.
- **Security & PII:** No raw PII to external APIs; HITL for Submitted/Won; confirmed_at before Total Debt Lifted.
- **Workflow:** Spec and plan exist; tasks atomic.
- **UX/UI:** Coach persona in notifications; Encouraging Coach tone; WCAG for UI surfaces.
- **Forbidden:** No floating promises; all async awaited; no mock data in production.
- **Data integrity:** momentum_score, trust_score from Reputation Engine; application lifecycle validated.
- **Documentation protocol:** LangGraph JS, Zod, Supabase, Inngest per official docs.

## Project Structure

### Documentation (this feature)

```text
specs/005-coach-execution-engine/
├── plan.md              # This file
├── research.md          # Phase 0 output (13 decisions)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── coach-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/agent/
├── lib/
│   └── coach/
│       ├── momentum-score.ts    # (Deadline Proximity × 0.6) + (Trust Score × 0.4)
│       ├── state-mapper.ts      # Coach states ↔ DB application_status
│       └── game-plan.ts         # Top 3 batch logic; persists momentum_score

apps/web/
├── lib/
│   └── inngest/
│       └── functions/
│           └── coach.ts         # Game plan, deadline, check-in, micro-task crons
├── lib/
│   └── email/
│       └── coach-templates/     # React Email (deadline, micro-task, top3)
├── app/
│   └── api/
│       └── coach/
│           ├── game-plan/       # GET Top 3
│           ├── application/
│           │   └── status/      # POST status transition
│           ├── confirm-outcome/  # POST HITL (Submitted, Won)
│           ├── check-in/
│           │   └── complete/     # POST
│           ├── micro-task/
│           │   └── snooze/      # POST
│           └── notifications/ # GET dashboard toasts

packages/database/
└── supabase/migrations/
    ├── XXXXX_notification_log.sql
    ├── XXXXX_check_in_tasks.sql
    └── XXXXX_applications_extend.sql   # momentum_score, submitted_at, last_progress_at, confirmed_at
```

**Structure Decision**: Option 4 (Turborepo). Coach logic in apps/agent and apps/web; APIs in apps/web; migrations in packages/database. Coach_Prioritization node in apps/agent (003 graph); Inngest functions in apps/web.

## Coach–Orchestration Integration (003 Alignment)

**Storage model for Top 3 Game Plan**: Applications table is the source of truth. GET /api/coach/game-plan computes Top 3 on demand by querying applications (with momentum_score) for the authenticated user, ordered by momentum_score desc. No write to LangGraph checkpoint state for game plan display—API routes cannot update checkpoint state directly.

**Precedence with 003 prioritization**:
- **003 `prioritization.scheduled`**: Uses discovery_results (scholarship-based ROI); populates active_milestones in checkpoint for users with discovery results but no tracked applications.
- **005 `coach.game-plan.daily`**: Uses applications (application-based momentum_score); persists momentum_score to applications; does not write active_milestones.
- **Precedence**: When user has tracked applications, 006 Coach's Game Plan and GET /api/coach/game-plan read from applications (momentum_score). When user has discovery results but no applications, orchestration's active_milestones (003) remains the source. Cron schedule: 003 at 06:00; 005 at 06:30 to avoid contention.

**Status change flow (FR-005)**: API routes persist to applications only (status, last_progress_at, submitted_at, confirmed_at). No checkpoint update on status change—active_milestones in checkpoint is for discovery flow; application state lives in applications table. Dashboard (006) and Coach Game Plan read from applications.

## Complexity Tracking

No violations. Coach Execution Engine integrates with existing orchestration (003), Advisor (004), and Dashboard (006) per alignment clarifications.
