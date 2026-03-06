# Contract: Kanban, Repository, Severity Heatmap

**Branch**: 013-expandable-widget-logic | **Date**: 2025-03-06

## Purpose

Define interfaces for the three expanded views: Kanban (Priority Hub), Scholarship Repository, Severity Heatmap.

---

## Kanban Board (Expanded Today's Game Plan)

### Columns

| Column ID | Label |
|-----------|-------|
| `todo` | To Do |
| `in_progress` | In Progress |
| `done` | Done |

### Task Card

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Task ID |
| `title` | string | Task title |
| `description` | string \| null | Optional |
| `status` | `todo` \| `in_progress` \| `done` | Column |
| `deadline` | string \| null | ISO date |
| `urgency` | `critical` \| `warning` \| `safe` | <48h, <7d, ≥7d |

### Behavior

- **Drag-and-drop**: @dnd-kit for moving tasks between columns (FR-002a).
- **Keyboard**: Arrow keys or menu to move tasks.
- **Persistence**: Server Action on move; optimistic update; revert on failure.
- **Coach's Huddle**: Sidebar with tips, reminders, encouragement (Coach persona).
- **Empty column**: "No tasks" or "Drag tasks here" placeholder.

---

## Scholarship Repository (Expanded Discovery Feed)

### Controls

- **Search bar**: Free-text search.
- **Filters**: Major, SAI, State (FR-003).
- **Active filters**: Displayed as removable tags.

### Behavior

- Filter change → update Match Card list.
- Scrollable list; Match Cards per [match-card-extended.md](./match-card-extended.md).
- Empty results → "No matches" with option to clear/adjust filters.

---

## Severity Heatmap (Expanded Deadline Calendar)

### Layout

- 12-month grid (e.g. 4×3).
- Each month shows deadlines color-coded by urgency.

### Severity Mapping

| Urgency | Condition | Color (Tailwind) |
|---------|-----------|------------------|
| Critical | <48 hours | `bg-red-500` |
| Warning | <7 days | `bg-amber-500` |
| Safe | ≥7 days | `bg-green-500` |

### Legend

Visible legend explaining Critical, Warning, Safe.

### Empty State

Month with no deadlines → "No deadlines" placeholder.
