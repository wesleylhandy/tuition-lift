# Implementation Plan: Scholarship Inbox & Dashboard

**Branch**: `006-scholarship-inbox-dashboard` | **Date**: 2025-02-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-scholarship-inbox-dashboard/spec.md`

## Summary

Build a real-time, Bento-box Control Center in `apps/web` that transitions students from Discovery to Action. Three core views: (1) Match Inbox with prioritized feed, Live Pulse, Trust Shield, and Coach's Take; (2) Coach's Game Plan with Top 3 Tasks, Debt Lifted ring, Next Win countdown; (3) Application Tracker with full lifecycle. Uses Next.js App Router, Server Actions for state transitions, Supabase Realtime for live updates, shadcn/ui for layout/components, Framer Motion for animations. Consumes data from `packages/database` and GET /api/discovery/results (003); adds `dismissals` table for soft-dismiss behavior.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js project)  
**Primary Dependencies**: Next.js (App Router), React 19, Tailwind CSS, shadcn/ui, Framer Motion, Supabase JS  
**Storage**: Supabase (PostgreSQL); `packages/database` schema + new `dismissals` table  
**Testing**: Vitest / Playwright (per project setup); manual verification per quickstart  
**Target Platform**: Web (Vercel deployment)  
**Project Type**: monorepo (Turborepo)  
**Performance Goals**: Match Inbox load <2s (SC-001); Live Pulse within 5s (SC-002); action feedback within 2s (SC-004)  
**Constraints**: WCAG 2.1 AA; Lighthouse 90+ Performance and Best Practices  
**Scale/Scope**: Dashboard home page; Match Inbox, Coach's Game Plan, Application Tracker; ~15–20 components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with `.specify/memory/constitution.md`:

- **Mission & scope:** Feature supports "Search → Verify → Apply" and does not defer core-loop work without justification. Dashboard surfaces discovery results and application progress; enables Track, Dismiss, Verify Submission.
- **Technical standards:** Plan uses Next.js latest (App Router), React latest, Tailwind + Shadcn/ui; agent logic in apps/agent (orchestration 003); Supabase with RLS; all deps latest; no HIGH/CRITICAL CVEs; secrets in Server Components/Actions with `server-only`. Monorepo layout: code in `apps/web`, `packages/database`; dashboard deployed via Vercel.
- **Security & PII:** No raw PII to third-party; Trust Filter / trust_score from shared layer; RLS on dismissals (user_id = auth.uid()); data consumed from shared layer.
- **Workflow:** Spec and plan exist; spec is what, plan is how; tasks are atomic and marked done when verified.
- **UX/UI:** MVP scope only; WCAG 2.1 AA; Lighthouse 90+ Performance and Best Practices.
- **Forbidden:** No inline styles; no mock data in production; Loading/Empty states (skeletons, Coach's Prep Checklist) handled.
- **Data integrity:** trust_score, momentum_score from shared layer; dynamic cycle per Constitution §8.
- **Documentation protocol:** Plan references official docs for Next.js, Zod, Supabase; App Router only; Zod for schemas; Supabase types for DB.

## Project Structure

### Documentation (this feature)

```text
specs/006-scholarship-inbox-dashboard/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (dismissals + consumed entities)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── server-actions.md
│   └── realtime-channels.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
apps/web/
├── app/
│   └── (auth)/
│       └── dashboard/
│           └── page.tsx           # Main Control Center
├── components/
│   └── dashboard/
│       ├── match-inbox/            # Trust Shield, Coach's Take, Match Card, Live Pulse, Match Inbox
│       ├── game-plan/             # Top Three Tasks, Debt Lifted ring, Next Win countdown
│       └── application-tracker/   # Tracker Column, Application Card, Application Tracker
├── lib/
│   ├── actions/
│   │   ├── track.ts               # Server Action: add to tracked
│   │   ├── dismiss.ts             # Server Action: soft dismiss
│   │   └── verify-submission.ts   # Server Action: confirm submitted
│   └── hooks/
│       ├── use-realtime-matches.ts
│       └── use-realtime-applications.ts
└── lib/utils/
    └── trust-shield.ts            # Badge color mapping (trust_score → Green/Amber/Yellow/Red)

packages/database/
└── supabase/migrations/
    └── XXXXX_add_dismissals.sql   # New table for soft dismiss
```

**Structure Decision**: Option 4 (Turborepo) per Constitution. Dashboard lives in `apps/web`; DB migration for dismissals in `packages/database`. Server Actions in `lib/actions/`; Realtime hooks in `lib/hooks/`.

## Complexity Tracking

No violations. Complexity Tracking section left empty per Constitution alignment.
