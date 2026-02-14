# Implementation Plan: Coach Execution Engine

**Branch**: `005-coach-execution-engine` | **Date**: 2025-02-13 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/005-coach-execution-engine/spec.md`

## Summary

Implement the Coach Execution Engine—Inngest-powered automation for daily Top 3 Game Plan (Momentum Score with quadrant logic: urgency + source trustworthiness), application lifecycle (Tracked → Drafting → Review → Submitted → Outcome Pending) with HITL verification for Submitted/Won, deadline notifications (72h/24h), post-submission check-in (21 days), and stale-progress Micro-Task (48h, status-change only) with snooze. Uses Resend + React Email for Coach-persona notifications. State mapping layer reconciles Coach orchestration states with DB application_status enum. active_milestones sync immediately when status changes. Aligns with TuitionLiftState and Orchestration spec (003).

## Technical Context

**Language/Version**: TypeScript 5.x (Node 18+)  
**Primary Dependencies**: Inngest, Resend, React Email, LangGraph JS, Supabase (@supabase/supabase-js), Zod  
**Storage**: Supabase (PostgreSQL)—notification_log, check_in_tasks, applications (extended), profiles (preferences)  
**Testing**: Vitest for unit; integration tests for Inngest/Resend mocks  
**Target Platform**: Vercel (apps/web); Coach Inngest functions in apps/web; state mapping and Momentum logic in apps/agent or packages/database  
**Project Type**: Turborepo monorepo (web + agent)  
**Performance Goals**: Game plan within 1h of day start; deadline notifications within 2h of threshold; SC-001, SC-004  
**Constraints**: Max 1 email + 1 toast per student per 24h; snooze must not extend past due date; active_milestones sync in same flow as status change  
**Scale/Scope**: Per-user Coach workflows; batch game plan generation for all active users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Mission & scope:** ✓ Supports "Search → Verify → Apply"; Coach Execution is the execution specialist; no core work deferred.
- **Technical standards:** ✓ Inngest for cron/event workflows; Supabase with RLS; Resend for email; agent logic in apps/agent; secrets server-only.
- **Security & PII:** ✓ No raw PII in Coach emails; user-scoped data only; HITL before Total Debt Lifted update.
- **Workflow:** ✓ Spec and plan exist; tasks will be atomic.
- **UX/UI:** ✓ Coach persona (Encouraging Coach) in all communications; WCAG for dashboard toasts.
- **Forbidden:** ✓ No inline styles; no floating promises; no mock data in production.
- **Data integrity:** ✓ Lifecycle validation; mapping layer preserves DB enum; dynamic cycle checks from 002/003.
- **Documentation protocol:** ✓ References Inngest, Resend, React Email, LangGraph, Supabase, Zod; App Router only.

## Project Structure

### Documentation (this feature)

```text
specs/005-coach-execution-engine/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── coach-api.md     # API and Inngest event contract
└── tasks.md             # Phase 2 (speckit.tasks)
```

### Source Code (repository root)

```text
apps/
├── web/                 # Next.js
│   ├── app/api/coach/
│   │   ├── game-plan/route.ts
│   │   ├── application/status/route.ts
│   │   ├── confirm-outcome/route.ts
│   │   ├── check-in/complete/route.ts
│   │   ├── micro-task/snooze/route.ts
│   │   └── notifications/route.ts
│   └── lib/
│       ├── inngest/
│       │   └── functions/
│       │       └── coach.ts        # Game plan, deadline, check-in, micro-task
│       └── email/
│           └── coach-templates/    # React Email: deadline, micro-task, top3
├── agent/               # LangGraph agent
│   └── lib/
│       ├── momentum-score.ts       # Trust Score from scholarship; Deadline Proximity = time + stage
│       ├── state-mapper.ts         # Coach state ↔ DB enum
│       └── prioritization.ts      # FR-009a essay vs form
packages/
├── database/            # @repo/db
│   └── supabase/migrations/
│       ├── 005_notification_log.sql
│       └── 005_check_in_tasks.sql
```

**Structure Decision**: Coach Inngest functions and API routes in apps/web (Next.js). Momentum Score and state mapping in apps/agent (shared with Coach_Prioritization) or packages/database. React Email templates in apps/web/lib/email. Notification log and check-in tasks in Supabase.

## Phase 0: Research (Complete)

See [research.md](./research.md). Decisions: Inngest for all Coach workflows, Resend + React Email for notifications, mapping layer for Coach↔DB states, notification_log table (with template for SC-008 audit), check_in_tasks table, Momentum Score (Trust Score from scholarship + composite Deadline Proximity: time + stage), progress = status change only, active_milestones immediate sync, snooze storage.

## Phase 1: Design Artifacts

- [data-model.md](./data-model.md) — notification_log, check_in_tasks, mapping, extensions
- [contracts/coach-api.md](./contracts/coach-api.md) — API routes and Inngest events
- [quickstart.md](./quickstart.md) — Developer setup

## Complexity Tracking

No Constitution violations requiring justification.

## Prerequisites

**005 cannot begin Phase 2 until:**
- **002-db-core-infrastructure**: packages/database exists; applications, profiles, scholarships in place.
- **003-langgraph-orchestration**: apps/agent exists; Inngest configured; TuitionLiftState, active_milestones defined.
- **004-advisor-discovery-engine**: (optional) Discovery flow for "run discovery" suggestion when zero apps.

## Dependencies

| Dependency | Purpose |
|------------|---------|
| 002-db-core-infrastructure | applications, profiles, scholarships; migration for notification_log, check_in_tasks |
| 003-langgraph-orchestration | TuitionLiftState, active_milestones, Inngest, Coach_Prioritization |
| 001-waitlist-launch | Resend (optional; shared email infra) |

## Implementation Notes

- **Momentum Score**: Trust Score = scholarship.trust_score (Reputation Engine). Deadline Proximity = composite of (a) time-to-deadline and (b) application stage (Review > Drafting > Tracked). Quadrant logic: high trust + high urgency = best; low trust deprioritizes.
- **Application deadline**: Applications reference scholarships; deadline comes from scholarships.deadline (join on scholarship_id).
- **Lifecycle mapping**: Implement `coachStateToDb` and `dbToCoachState`; use on every application read/write from Coach flows.
- **active_milestones sync (FR-005)**: Update active_milestones in the same flow as the status change (e.g., within POST /api/coach/application/status and confirm-outcome handlers); do not defer to cron.
- **Progress (FR-013a)**: For 005 scope, progress = status change only; update last_progress_at on status change. Application content tracking out of scope.
- **Notification limit**: Before sending email, query notification_log for user_id + channel='email' + sent_at > now()-24h; skip if row exists. Store notification_type and template_name for SC-008 auditability.
- **Check-in scheduling**: On status→Submitted (after HITL confirm), send Inngest event with `dueAt = submitted_at + 21 days`; function creates check_in_tasks row or uses cron batch.
- **Snooze cap**: When user snoozes, validate snoozedUntil < min(scholarships.deadline) for user's tracked applications.
- **Consolidated deadline email**: When multiple apps in 72h/24h window, single email with prioritization plan (essays first, then forms, by due date).
- **Out of scope**: Application content tracking, external submission confirmation flow; future feature will own these.
