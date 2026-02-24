# Data Model: TuitionLift Bento Shell and Design System

**Branch**: 010-bento-shell-design-system | **Date**: 2025-02-24  
**Spec**: [spec.md](./spec.md)

## Overview

This feature introduces no database schema changes. The shell is a presentation-layer concern. Data displayed in the welcome area, stats row, and content sections is sourced from existing entities (Profiles, Applications, Scholarships) per the spec's Data Dependencies table.

Below: design tokens (conceptual) and component state models.

---

## Design Tokens (Conceptual)

Defined in `globals.css` `@theme` and applied via Tailwind utilities.

| Token | CSS Variable | Value | Usage |
|-------|--------------|-------|-------|
| Navy | `--color-navy` | #1A1A40 | Primary text, headers, brand |
| Electric Mint | `--color-electric-mint` | #00FFAB | Accents, progress, amounts |
| Slate | `--color-slate` | #64748B | Secondary text, subtitles |
| Clarity Off-White | `--color-off-white` | #fafaf9 | Backgrounds |
| Font Heading | `--font-heading` | Playfair Display | Headers |
| Font Body | `--font-body` | Inter | Body, utility text |

---

## Section State Model

Each content section (welcome, stats row, Game Plan, Discovery Feed, Deadline Calendar) has a discrete state:

| State | Description | UI |
|-------|--------------|-----|
| `loading` | Data fetch in progress | Skeleton |
| `error` | Fetch failed | User-friendly message + retry button |
| `content` | Data available | Rendered content |
| `empty` | (Optional, for future) No data but successful | Empty state UI |

Error state MUST NOT expose: stack traces, API codes, paths, internal error messages.

---

## Component Hierarchy (Structural)

```
DashboardLayout
├── GlobalHeader
│   ├── LogoPlaceholder + Tagline
│   ├── SearchBar (placeholder)
│   ├── NotificationCenter (placeholder)
│   └── DebtLiftedRing (placeholder value)
├── WelcomeAreaShell [loading | error | content]
├── BentoGrid
│   ├── GamePlanShell [loading | error | content]
│   ├── DiscoveryFeedShell [loading | error | content]
│   └── DeadlineCalendarShell [loading | error | content]
└── StatsRowShell [loading | error | content]
```

Shell components accept `status`, `onRetry`, and `children`; render skeleton, error, or children per state.

---

## External Data Dependencies (Read-Only)

When sections are populated (future specs), they consume:

| Shell | Data Source | Key Fields |
|-------|-------------|------------|
| Welcome | profiles | display_name, first_name |
| Welcome | (aggregate) | debt_lifted_cents |
| Stats APPLICATIONS | applications | count where status in progress |
| Stats MATCH SCORE | (computed) | user match score |
| Stats ACTIVE DEADLINES | applications | count with due_date in range |
| Stats TOTAL POTENTIAL | (computed) | sum of matched amounts |
| Game Plan | applications, coach API | tasks, deadlines |
| Discovery Feed | discovery results | scholarships |
| Deadline Calendar | applications, scholarships | due dates |

No new tables or columns. See spec Data Dependencies table for linked specs.
