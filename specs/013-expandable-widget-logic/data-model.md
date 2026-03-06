# Data Model: Expandable Widget Logic and State

**Feature**: 013-expandable-widget-logic  
**Date**: 2025-03-06  
**Phase**: 1

## Overview

No new database schema. View state is URL-only (`?view=<widgetId>`). Match Card, Kanban task, and calendar deadline data come from existing specs (004, 005, 006).

---

## 1. View State (URL)

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `view` | `string` | Query param | Widget ID when expanded; absent = dashboard |
| Valid IDs | `kanban` \| `repository` \| `calendar` | WIDGET_IDS registry | Arbitrary; new widgets add ID without schema change |

**Validation**: Unknown/invalid `view` → fall back to dashboard (no error page).

---

## 2. Match Card (Extended)

Existing `MatchCard` props; add `matchStrength` per FR-009.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | Yes | Match ID |
| `scholarshipId` | string | Yes | For Track/Dismiss |
| `title` | string | Yes | Scholarship title |
| `url` | string | Yes | External link |
| `trustScore` | number \| null | No | 0–100; Trust Shield badge |
| `matchStrength` | number \| null | No | 0–100; progress bar (NEW) |
| `coachTakeText` | string \| null | No | Coach's Take message |
| `amount` | number \| null | No | USD |
| `deadline` | string \| null | No | ISO date |
| `discoveryRunId` | string \| null | No | For dismiss |
| `isTracked` | boolean | No | Track button state |

**Placeholder behavior** (SC-004): When `trustScore`, `matchStrength`, or `coachTakeText` is null, show placeholder or hide element gracefully.

---

## 3. Kanban Task

From Coach/Application specs (005, 006). This spec defines presentation only.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Task/application ID |
| `title` | string | Task title |
| `description` | string \| null | Optional |
| `status` | `todo` \| `in_progress` \| `done` | Maps to columns |
| `deadline` | string \| null | ISO date; urgency color |
| `urgency` | `critical` \| `warning` \| `safe` | Derived: <48h, <7d, ≥7d |

**Persistence**: Task move (column change) → Server Action → Supabase. Optimistic update with revert on failure.

---

## 4. Severity Heatmap (Calendar)

| Field | Type | Notes |
|-------|------|-------|
| `month` | 1–12 | Month index |
| `year` | number | Academic year |
| `deadlines` | `{ date: string; urgency: Severity }[]` | Per month |
| `Severity` | `critical` \| `warning` \| `safe` | <48h, <7d, ≥7d |

**Empty state**: Month with no deadlines → "No deadlines" placeholder.

---

## 5. Widget Registry (In-Memory)

```ts
const WIDGET_IDS = {
  kanban: { id: 'kanban', label: "Today's Game Plan" },
  repository: { id: 'repository', label: 'Discovery Feed' },
  calendar: { id: 'calendar', label: 'Deadline Calendar' },
} as const;
```

New widgets: add entry; no URL schema change.
