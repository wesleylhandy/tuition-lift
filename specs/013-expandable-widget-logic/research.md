# Research: Expandable Widget Logic and State

**Feature**: 013-expandable-widget-logic  
**Date**: 2025-03-06  
**Phase**: 0

## 1. URL State for Shareable Expanded Views

**Decision**: Use Next.js App Router `useSearchParams` + `router.replace` for `?view=<widgetId>`.

**Rationale**:
- Next.js 16 App Router supports `useSearchParams()` in Client Components for reading/writing query params.
- `router.replace()` updates the URL without adding a history entry when closing; `router.push()` adds an entry when expanding so back button works.
- No external state library needed; URL is the single source of truth for expanded view.
- Invalid/unknown `view` values fall back to dashboard (no `view` param or unrecognized ID).

**Alternatives considered**:
- **Nuqs** (type-safe search params): Adds dependency; overkill for single `view` param.
- **Zustand + URL sync**: Duplicates state; URL should be authoritative per FR-011.
- **Path-based** (e.g. `/dashboard/kanban`): Requires route changes; query param is simpler and keeps dashboard as single route.

**References**: [Next.js useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params), [Next.js useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router)

---

## 2. Hero-Style Expand/Collapse Transitions

**Decision**: Use Framer Motion `AnimatePresence` + `motion.div` with `layout` and `initial/animate/exit` for smooth expand/collapse.

**Rationale**:
- Project already uses Framer Motion 12 (match-card, etc.).
- `AnimatePresence` handles mount/unmount animations; `layout` enables shared-element-style transitions.
- Full-viewport overlay: animate `opacity` and `scale` or `height` for "hero" feel without abrupt jumps.
- Spec FR-007: "smooth and fluid (no abrupt jumps or flicker)".

**Alternatives considered**:
- **CSS-only (transition + transform)**: Adequate for simple fades; Framer Motion gives finer control for layout animations.
- **View Transitions API**: Browser support still evolving; Framer Motion is well-tested and consistent.

**References**: [Framer Motion AnimatePresence](https://www.framer.com/motion/animate-presence/), [Framer Motion layout animations](https://www.framer.com/motion/layout-animations/)

---

## 3. Kanban Drag-and-Drop Library

**Decision**: Use `@dnd-kit/core` + `@dnd-kit/sortable` for Kanban column reordering.

**Rationale**:
- Lightweight, accessible (keyboard support), and framework-agnostic.
- Supports sortable lists within droppable columns; fits To Do / In Progress / Done model.
- No HIGH/CRITICAL CVEs; actively maintained.
- Spec FR-002a: "drag-and-drop or keyboard (e.g., arrow keys, menu)".

**Alternatives considered**:
- **react-beautiful-dnd**: Deprecated; not recommended for new projects.
- **Pragmatic drag-and-drop (Atlassian)**: Newer; less ecosystem/docs than dnd-kit.
- **Custom pointer events**: High effort; accessibility and edge cases are complex.

**References**: [dnd-kit documentation](https://docs.dndkit.com/), [dnd-kit sortable](https://docs.dndkit.com/presets/sortable)

---

## 4. Widget ID Registry and Extensibility

**Decision**: Use a const registry object (e.g. `WIDGET_IDS`) mapping IDs to metadata; no runtime config layer initially.

**Rationale**:
- Spec FR-000: "design MUST allow for a future data-driven config layer" — const registry satisfies "allow for" without implementing it now.
- New widgets: add ID to registry, wrap content in `ExpandableWidget`; no URL schema changes (FR-011: "arbitrary widget IDs").
- YAGNI: data-driven config deferred until needed.

**Alternatives considered**:
- **CMS/config file**: Overkill for 3 widgets; adds fetch/parsing.
- **Enum**: Less flexible; const object allows metadata (label, route, etc.).

---

## 5. Match Strength Progress Bar

**Decision**: Add `MatchStrengthBar` component; accept `matchStrength?: number | null` (0–100) on `MatchCard`. Display as progress bar with percentage label.

**Rationale**:
- Spec FR-009: "Match Strength progress bar with a numeric percentage".
- Existing `MatchCard` has `TrustShield` and `CoachesTake`; `matchStrength` is additive.
- Placeholder when null: show "—" or hide bar per SC-004 ("placeholder treatment for missing elements").

**Alternatives considered**:
- **Reuse TrustShield**: Different semantics; Trust = verification, Match = fit score.
- **Single combined score**: Spec distinguishes Trust Shield and Match Strength.

---

## 6. Escape Key and Focus Management

**Decision**: `useEffect` with `keydown` listener for `Escape`; on expanded view, call close handler. Trap focus inside expanded overlay when open (optional for MVP; spec requires Escape).

**Rationale**:
- Spec FR-017: "Pressing Escape MUST close the expanded view".
- Constitution §6: "Escape to close overlays where applicable".
- Focus trap: improves a11y but adds complexity; can be Phase 2 if time-constrained. Minimum: Escape closes, focus returns to expand button or body.

**References**: [WCAG 2.1 Keyboard](https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html)

---

## 7. Severity Heatmap Color Mapping

**Decision**: Map urgency to Tailwind classes: Critical (<48h) = `bg-red-500`, Warning (<7d) = `bg-amber-500`, Safe (≥7d) = `bg-green-500`. Empty months: "No deadlines" placeholder.

**Rationale**:
- Spec FR-004, User Story 6: "red for critical <48hrs, orange for warning <7 days, green for safe >7 days".
- Align with design system (Navy, Electric Mint, Slate, Off-White) for legend text; severity uses semantic colors.
- Empty state: spec edge case "No deadlines" for months with no data.
