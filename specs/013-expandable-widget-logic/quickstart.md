# Quick Start: Expandable Widget Logic and State

**Branch**: 013-expandable-widget-logic | **Date**: 2025-03-06

## Prerequisites

- Node 20+, pnpm
- Spec 010 (bento shell) implemented
- Authenticated user on `/dashboard`

## Setup

1. **Add @dnd-kit** (Kanban drag-and-drop):
   ```bash
   pnpm --filter web add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
   ```

2. **Framer Motion** already present (match-card, etc.).

3. **Environment**: Same as 010; no new env vars.

## Run the Dashboard

1. Start the web app:
   ```bash
   pnpm --filter web dev
   ```

2. Navigate to `/dashboard`.

3. **Expand**: Click expand control on any bento widget → full-viewport overlay.

4. **URL**: Expanded view adds `?view=kanban` (or `repository`, `calendar`). Open URL in new tab → lands in expanded view.

5. **Close**: Click close control or press Escape → return to dashboard.

6. **Back button**: Navigate expand → close → back → returns to expanded view.

## Key Paths

| Path | Purpose |
|------|---------|
| `apps/web/components/dashboard/expandable-widget/` | Reusable wrapper |
| `apps/web/lib/hooks/use-view-param.ts` | URL view param sync |
| `apps/web/components/dashboard/game-plan/kanban-board.tsx` | Kanban expanded view |
| `apps/web/components/dashboard/match-inbox/scholarship-repository.tsx` | Repository expanded view |
| `apps/web/components/dashboard/match-inbox/match-strength-bar.tsx` | Match Strength bar |
| `apps/web/components/dashboard/deadline-calendar/severity-heatmap.tsx` | 12-month heatmap |

## Verification

- **Expand/collapse**: Each widget expands and closes smoothly; no flicker.
- **URL sync**: `?view=kanban` loads Kanban directly; back button works.
- **Escape**: Press Escape in expanded view → closes.
- **Accessibility**: Expand/close controls 44×44px; keyboard operable; visible focus.
- **Kanban DnD**: Drag task between columns; state persists (when wired to Server Action).

## Contracts

- [expandable-widget.md](./contracts/expandable-widget.md) — Wrapper, useViewParam, WIDGET_IDS
- [match-card-extended.md](./contracts/match-card-extended.md) — MatchCard + MatchStrengthBar
- [kanban-repository-heatmap.md](./contracts/kanban-repository-heatmap.md) — Expanded view interfaces
