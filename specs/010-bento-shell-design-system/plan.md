# Implementation Plan: TuitionLift Bento Shell and Design System

**Branch**: 010-bento-shell-design-system | **Date**: 2025-02-24 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/010-bento-shell-design-system/spec.md`

## Summary

Implement a high-fidelity 'Premium Academic' dashboard shell based on wireframes: design system (Navy, Electric Mint, Slate, Clarity Off-White; Playfair Display + Inter), global header with branding/search/notifications/Debt Lifted ring, responsive 12-column bento grid, and placeholder sections (welcome, stats row, Today's Game Plan, Discovery Feed, Deadline Calendar) with loading skeletons and per-section error states. Protect /dashboard via middleware; redirect unauthenticated users to /onboard. Surgically precise updates to existing dashboard; prefer generic, reusable components.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 20+  
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS v4, lucide-react, @supabase/ssr  
**Storage**: N/A (no schema changes)  
**Testing**: Lighthouse (accessibility), manual/viewport checks; axe-core for a11y  
**Target Platform**: Web (Vercel)  
**Project Type**: Turborepo monorepo (apps/web)  
**Performance Goals**: Shell visible within 2s; Lighthouse 90+ Performance, Best Practices, Accessibility  
**Constraints**: WCAG 2.1 AA; 44×44px touch targets; 16px base font; no inline styles; no mock data in production  
**Scale/Scope**: Dashboard shell; design system tokens; 6 placeholder sections; auth gate

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Mission & scope:** Dashboard shell supports the "Search → Verify → Apply" loop by providing the Control Center layout. Core-loop enabler; no deviation.
- **Technical standards:** Next.js App Router, React 19, Tailwind + Shadcn/ui (existing). Lucide-react for icons. No agent logic in UI. Middleware for auth; Supabase server client.
- **Security & PII:** Auth at /dashboard boundary; redirect unauthenticated. No PII in error messages; no internals exposed.
- **Workflow:** Spec and plan exist; tasks to be created via /speckit.tasks.
- **UX/UI:** WCAG 2.1 AA; 44px touch targets; 16px base; Loading/Error states per section.
- **Forbidden:** No inline styles; no mock data; Loading and Error states handled.
- **Data integrity:** N/A (no DB changes).
- **Documentation protocol:** References Next.js fonts, Tailwind v4 @theme, Supabase middleware.

## Project Structure

### Documentation (this feature)

```text
specs/010-bento-shell-design-system/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── design-tokens.md
│   └── component-shell.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code

```text
apps/web/
├── app/
│   ├── globals.css           # Extend @theme (slate, fonts)
│   ├── layout.tsx            # Add next/font (Playfair, Inter)
│   └── (auth)/dashboard/
│       └── page.tsx          # Compose GlobalHeader, WelcomeAreaShell, BentoGrid, StatsRowShell
├── components/
│   └── dashboard/
│       ├── bento-grid.tsx    # Update to 12-col; BentoGridItem colSpan 1-12
│       ├── global-header.tsx # NEW: logo, search, notifications, DebtLiftedRing
│       ├── logo-placeholder.tsx # NEW: SVG "TL" replaceable
│       ├── section-shell.tsx # NEW: SectionShell (loading|error|content)
│       ├── welcome-area-shell.tsx # NEW
│       ├── stats-row-shell.tsx   # NEW
│       ├── game-plan/          # Existing; wrap with SectionShell
│       ├── match-inbox/         # Existing; wrap with SectionShell
│       ├── deadline-calendar-shell.tsx # NEW (placeholder + skeleton)
│       └── skeletons/          # Add: list-skeleton, card-skeleton, welcome-skeleton, stats-skeleton, deadline-calendar-skeleton
└── middleware.ts              # Extend: protect /dashboard, redirect to /onboard
```

**Structure Decision**: Turborepo monorepo. All changes in apps/web. No packages/db changes.

## Phase 0: Research

Complete. See [research.md](./research.md).

## Phase 1: Design & Contracts

- **Design tokens**: [contracts/design-tokens.md](./contracts/design-tokens.md)
- **Component shell**: [contracts/component-shell.md](./contracts/component-shell.md)
- **Data model**: [data-model.md](./data-model.md) (no DB; tokens and state model)
- **Quickstart**: [quickstart.md](./quickstart.md)

## Implementation Approach

### 1. Design System (globals.css + layout)

- Add `--color-slate: #64748b` to @theme and :root.
- Load Playfair Display and Inter via `next/font/google` in `app/layout.tsx`.
- Set `--font-heading` and `--font-body` to the loaded font variables.
- Ensure 16px base font on html/body.

### 2. Middleware (Auth)

- Extend `config.matcher` to include `/dashboard`, `/dashboard/*`.
- When path matches and `getUser()` returns no user, redirect to `/onboard`.
- Preserve existing /onboard logic (T029).

### 3. Global Header

- Create `GlobalHeader`: logo placeholder (left), search bar (center), notification center + Debt Lifted ring (right).
- Logo: inline SVG "TL" or similar; replaceable via prop/component swap.
- Search: placeholder input "Search scholarships, deadlines, or requirements...".
- Notifications: Bell icon (Lucide); badge when count > 0.
- Debt Lifted: use existing `DebtLiftedRing` with placeholder value ($47,250 or 0) until wired.

### 4. Bento Grid

- Update `BentoGrid` to `grid-cols-12` at lg.
- Update `BentoGridItem` colSpan to support 1–12; map existing usage (colSpan 2, 4) to equivalent 12-col spans (e.g., 2→6, 4→12).
- Responsive: 1/2/4/12 columns for default/sm/md/lg.

### 5. Section Shells

- Create `SectionShell` with `status`, `onRetry`, `skeletonVariant`, `title`.
- Create skeletons: welcome (text lines), stats (four cards), deadline-calendar (grid + list).
- Wrap or create: `WelcomeAreaShell`, `StatsRowShell`, `DeadlineCalendarShell`.
- Integrate existing `GamePlan` and `MatchInbox` (Discovery Feed) via SectionShell; they become children when status=content. For now, default status=loading.
- Add `deadline-calendar-shell.tsx` as a placeholder that renders SectionShell with skeletonVariant=calendar.

### 6. Error State

- SectionShell error UI: friendly message ("Something went wrong. Try again.") + retry button.
- 44×44px retry button; focus visible.
- No stack traces, paths, or technical details.

### 7. Dashboard Page Composition

- Compose: GlobalHeader, WelcomeAreaShell, BentoGrid (GamePlan, DiscoveryFeed, DeadlineCalendar), StatsRowShell. Do not include ReconnectionIndicator for now; it exists as a reusable component for future use.
- All sections use SectionShell with status=loading initially.
- Layout: full-width, off-white background; padding per wireframe.

## Complexity Tracking

No constitution violations requiring justification.

## Verification

- Unauthenticated → /dashboard redirects to /onboard.
- Authenticated → Shell renders with header, welcome, bento, stats; skeletons visible.
- Lighthouse: Accessibility ≥ 90; check Performance and Best Practices.
- Viewport 375px, 768px, 1280px: no horizontal scroll.
