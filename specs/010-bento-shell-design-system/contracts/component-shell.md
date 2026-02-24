# Component Shell Contract: Bento Shell

**Branch**: 010-bento-shell-design-system | **Date**: 2025-02-24

## Purpose

Define the interface and behavior of shell components that wrap dashboard sections. Ensures consistent loading, error, and content states per FR-015, FR-016, FR-018.

---

## SectionShell (Generic Wrapper)

Wraps any content section to provide loading skeleton, error state, and content rendering.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `status` | `'loading' \| 'error' \| 'content'` | Yes | Current state |
| `onRetry` | `() => void` | When status=error | Retry handler |
| `children` | `ReactNode` | When status=content | Rendered content |
| `skeletonVariant` | `'list' \| 'card' \| 'calendar' \| 'text' \| 'stats'` | Yes | Skeleton shape |
| `title` | `string` | No | Section title (for skeleton/error) |

### Behavior

- `loading`: Render skeleton matching `skeletonVariant`.
- `error`: Render user-friendly message (e.g., "Something went wrong. Try again.") and a retry button. No stack trace or technical details.
- `content`: Render `children`.

### Error Message

MUST use generic, actionable copy. Example: "Something went wrong. Try again." Implementation MUST NOT surface internals in production.

---

## BentoGrid / BentoGridItem

### BentoGrid

- 12-column base at `lg` breakpoint.
- Responsive: 1 col (default), 2 cols (sm), 4 cols (md), 12 cols (lg).
- `grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12`.

### BentoGridItem

| Prop | Type | Description |
|------|------|-------------|
| `colSpan` | 1–12 | Columns to span at lg |
| `rowSpan` | 1–4 | Rows to span |
| `className` | string | Additional classes |

`colSpan` maps to `col-span-{n}` for lg; responsive spans for smaller breakpoints.

**Wireframe-driven mapping (010)**: Game Plan ≈ 4 cols, Discovery Feed ≈ 5 cols, Deadline Calendar ≈ 3 cols. Migration from 4-col base: colSpan 2→6, colSpan 4→12.

---

## GlobalHeader

Contains, in order (left to right):

1. **Branding**: Logo placeholder + "Scholarship Command Center" tagline
2. **Search bar**: Placeholder input, non-functional
3. **Notification center**: Bell icon, optional badge (count or hidden when 0)
4. **Debt Lifted ring**: Progress ring with numeric value (placeholder: e.g., $47,250)
5. **User profile/account dropdown** (placeholder): For Parent Link (009) and account actions. Non-functional in this spec.

Logo MUST be replaceable (component or `src` prop) without layout changes.

DebtLiftedRing MUST be composable—exported as a standalone component so it can be rendered in the header and, if needed later, in other sections (e.g., within Game Plan).

---

## Section Identifiers

| Section | skeletonVariant | Skeleton Component | Title |
|---------|-----------------|-------------------|-------|
| Welcome area | text | welcome-skeleton | (none) |
| Stats row | stats | stats-skeleton | (none) |
| Today's Game Plan | list | list-skeleton (generic) | Today's Game Plan |
| Discovery Feed | card | card-skeleton (generic) | Discovery Feed |
| Deadline Calendar | calendar | deadline-calendar-skeleton | Deadline Calendar |

Use generic list-skeleton and card-skeleton; avoid section-specific skeletons for list and card variants to support reuse.
