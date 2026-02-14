# Implementation Plan: Scholarship Inbox & Dashboard

**Branch**: `006-scholarship-inbox-dashboard` | **Date**: 2025-02-13 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/006-scholarship-inbox-dashboard/spec.md`

## Summary

Build a real-time, Bento-box Control Center in `apps/web` that transitions students from Discovery to Action. Three core views: (1) Match Inbox with prioritized feed, Live Pulse, Trust Shield, and Coach's Take; (2) Coach's Game Plan with Top 3 Tasks, Debt Lifted ring, Next Win countdown; (3) Application Tracker with full lifecycle. Uses Next.js 16 App Router, Server Actions for state transitions, Supabase Realtime for live updates, shadcn/ui for layout/components, Framer Motion for animations. Consumes data from `packages/database`; adds `dismissals` table for soft-dismiss behavior.

## Technical Context

**Language/Version**: TypeScript 5.9  
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS, shadcn/ui, Framer Motion, @supabase/supabase-js, @supabase/realtime  
**Storage**: Supabase (PostgreSQL); `packages/database` schema + new `dismissals` table  
**Testing**: Vitest for Server Actions; Playwright or Cypress for E2E dashboard flows  
**Target Platform**: Web (Next.js, Vercel)  
**Project Type**: Turborepo monorepo (UI in `apps/web`)  
**Performance Goals**: Match Inbox load <2s (SC-001); Live Pulse within 5s (SC-002); action feedback within 2s (SC-004)  
**Constraints**: WCAG 2.1 AA; Lighthouse 90+ Performance; 320px minimum viewport  
**Scale/Scope**: Dashboard home page; Match Inbox, Coach's Game Plan, Application Tracker; ~15–20 components

## Constitution Check

*GATE: Passed before Phase 0. Re-checked after Phase 1.*

- **Mission & scope:** Feature supports "Search → Verify → Apply" by providing the Control Center UI; core loop transition from Discovery to Action.
- **Technical standards:** Next.js App Router, React 19, Tailwind + shadcn/ui per Constitution §3. No LangGraph in UI; agent logic separate. Server Actions for state transitions; secrets in server-only.
- **Security & PII:** No PII to third-party; RLS on dismissals (user_id = auth.uid()). Data consumed from shared layer.
- **Workflow:** Spec and plan exist; tasks will be atomic.
- **UX/UI:** MVP scope; WCAG 2.1 AA; Loading/Empty states (skeletons, Coach's Prep Checklist); no mock data in production.
- **Forbidden:** No inline styles; Loading and Empty states handled; Tailwind/shadcn only.
- **Data integrity:** trust_score, momentum_score from shared layer; dynamic cycle per Constitution §8.
- **Documentation protocol:** Plan references Next.js, Supabase Realtime, Framer Motion, shadcn/ui official docs.

## Project Structure

### Documentation (this feature)

```text
specs/006-scholarship-inbox-dashboard/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 (dismissals + UI entities)
├── quickstart.md        # Phase 1 developer guide
├── contracts/           # Server Actions + Realtime contracts
│   ├── server-actions.md
│   └── realtime-channels.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/web/
├── app/
│   ├── (auth)/              # or (dashboard) route group
│   │   └── dashboard/
│   │       └── page.tsx      # Main Control Center page
│   └── layout.tsx
├── components/
│   ├── dashboard/
│   │   ├── match-inbox/
│   │   │   ├── match-inbox.tsx
│   │   │   ├── match-card.tsx
│   │   │   ├── live-pulse.tsx
│   │   │   ├── trust-shield.tsx
│   │   │   └── coaches-take.tsx
│   │   ├── game-plan/
│   │   │   ├── game-plan.tsx
│   │   │   ├── top-three-tasks.tsx
│   │   │   ├── debt-lifted-ring.tsx
│   │   │   └── next-win-countdown.tsx
│   │   ├── application-tracker/
│   │   │   ├── application-tracker.tsx
│   │   │   ├── tracker-column.tsx
│   │   │   └── application-card.tsx
│   │   ├── coaches-prep-checklist.tsx
│   │   └── bento-grid.tsx
│   └── ui/                   # shadcn components
│       ├── skeleton.tsx
│       ├── toast.tsx (sonner)
│       └── ...
├── lib/
│   ├── actions/
│   │   ├── track.ts          # Server Action: add to tracked
│   │   ├── dismiss.ts        # Server Action: soft dismiss
│   │   └── verify-submission.ts
│   ├── hooks/
│   │   └── use-realtime-matches.ts
│   └── utils/
│       └── trust-shield.ts   # score → color mapping
└── package.json              # + framer-motion, @supabase/realtime if needed

packages/database/
└── supabase/migrations/
    └── XXXXX_add_dismissals.sql   # New table for soft dismiss
```

**Structure Decision**: Option 4 (Turborepo) per Constitution. Dashboard lives in `apps/web`; DB migration for dismissals in `packages/database`. Server Actions in `lib/actions/`; Realtime hooks in `lib/hooks/`.

## Complexity Tracking

No Constitution violations requiring justification.
