# Contract: Expandable Widget

**Branch**: 013-expandable-widget-logic | **Date**: 2025-03-06

## Purpose

Define the reusable expandable widget abstraction per FR-000. Provides expand control, close control, URL sync, and transitions. New bento sections supply only Dashboard and Expanded content.

---

## ExpandableWidget

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `widgetId` | `string` | Yes | ID for URL param (e.g. `kanban`, `repository`, `calendar`) |
| `title` | `string` | Yes | Section title (for expanded overlay header, aria) |
| `dashboardContent` | `(expandButton: ReactNode) => ReactNode` | Yes | Render prop: compact view receives expand button to inject into card |
| `expandedContent` | `ReactNode` | Yes | Full-viewport overlay content |

### Behavior

- **Expand control**: Visible in header; min 44×44px; keyboard operable; `aria-label` e.g. "Expand Today's Game Plan".
- **Close control**: Visible in expanded overlay; min 44×44px; keyboard operable; `aria-label` e.g. "Close and return to dashboard".
- **URL sync**: On expand → `router.push` with `?view=<widgetId>`. On close → `router.replace` to remove `view` param.
- **Escape**: `keydown` listener for `Escape` closes expanded view (FR-017).
- **Transitions**: Framer Motion `AnimatePresence` + `motion.div`; smooth opacity/scale; no abrupt jumps (FR-007).

### Layout

- **Dashboard**: Renders `dashboardContent` inside `SectionShell` (or equivalent) within bento grid.
- **Expanded**: Full-viewport overlay (`fixed inset-0 z-50`); content adapts (stacked, scrollable) per FR-015.

---

## useViewParam Hook

| Return | Type | Description |
|--------|------|-------------|
| `expandedWidgetId` | `string \| null` | Current `view` param value; null if absent or invalid |
| `isExpanded` | `(id: string) => boolean` | Whether given widget is expanded |
| `expand` | `(id: string) => void` | Set `view` param (router.push) |
| `close` | `() => void` | Remove `view` param (router.replace) |

**Invalid handling**: Unknown `view` value → treat as null (dashboard).

---

## Widget ID Registry

```ts
const WIDGET_IDS = {
  kanban: { id: 'kanban', label: "Today's Game Plan" },
  repository: { id: 'repository', label: 'Discovery Feed' },
  calendar: { id: 'calendar', label: 'Deadline Calendar' },
} as const;

type WidgetId = keyof typeof WIDGET_IDS;
```

New widgets: add entry to `WIDGET_IDS`; no URL schema changes.
