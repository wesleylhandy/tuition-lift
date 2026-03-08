# Closed Widget Implementation Plan

**Goal**: Align the dashboard closed (collapsed) widget design with the wireframe (`specs/wireframes/TuitionLift__dashboard.png`) while keeping the pattern generic and reusable.

---

## Wireframe Requirements (per widget)

Each closed widget has:

1. **Card container**: Rounded corners, white/light background, subtle border, shadow
2. **Header row**: `[icon] [title] [status pill] [expand icon]`
3. **Subtitle**: Below title (e.g., "The Coach's Top Priorities")
4. **Content area**: Widget-specific compact summary (scrollable when needed)
5. **Optional CTA**: e.g., "View Full Kanban Board >"

---

## Current vs Wireframe Gaps

| Element         | Wireframe                    | Current Implementation                          |
|-----------------|------------------------------|-------------------------------------------------|
| Card container  | Rounded white card, shadow   | Plain section, no card styling                  |
| Header icon     | Circular icon per widget     | None                                            |
| Status pill     | "3 active", "5 matches", "Urgent" | None                                    |
| Subtitle        | "The Coach's Top Priorities", etc. | None                                    |
| Title placement | Single source in header      | Duplicated in inner components (GamePlan has "Coach's Game Plan") |
| Expand control  | Top-right, visible           | Present ✓                                       |

---

## Implementation Approach

### 1. Extend ExpandableWidget (generic, reusable)

Add optional props to support the wireframe pattern without breaking existing usage:

```ts
interface ExpandableWidgetProps {
  widgetId: string;
  title: string;
  dashboardContent: ReactNode;
  expandedContent: ReactNode;
  headerActions?: ReactNode;

  // NEW — wireframe alignment
  icon?: ReactNode;           // Left-side icon (e.g., target, graduation cap, calendar)
  subtitle?: string;          // "The Coach's Top Priorities"
  statusPill?: ReactNode;     // "3 active", "5 matches", "Urgent" (green/red pill)
  expandCta?: ReactNode;      // "View Full Kanban Board >" (optional footer CTA)
}
```

Apply card styling to the closed state container:

- `rounded-lg border border-border bg-card shadow-sm`
- Header layout: `[icon] [title + subtitle] [statusPill] [headerActions] [expand]`

### 2. Create `WidgetStatusPill` (reusable)

A small pill for status indicators:

```tsx
// variant: "active" | "matches" | "urgent" | "neutral"
// or custom className
<WidgetStatusPill variant="active">3 active</WidgetStatusPill>
```

Styling: green for active/matches, red for urgent, neutral gray for optional states.

### 3. Wire each widget with wireframe-specific data

| Widget          | Icon           | Subtitle                       | Status source        | Expand CTA                  |
|-----------------|----------------|--------------------------------|-----------------------|-----------------------------|
| Game Plan       | Target/circles | "The Coach's Top Priorities"   | `top3.length` "3 active" | "View Full Kanban Board >" |
| Discovery Feed  | Graduation cap | "AI-matched scholarships for you" | `matches.length` "5 matches" | (optional)              |
| Deadline Calendar | Calendar     | "Your submission timeline"     | Urgent if &lt;7d deadlines | (optional)              |

### 4. Remove duplicate titles from inner content

- **GamePlan**: Remove internal `h2` "Coach's Game Plan"; ExpandableWidget owns "Today's Game Plan"
- **MatchInbox**: Remove "Match Inbox" h2; ExpandableWidget owns "Discovery Feed"
- **DeadlineCalendar**: Ensure no duplicate "Deadline Calendar" heading

Inner components become **content-only**; the ExpandableWidget wrapper owns the header (title, subtitle, status, expand).

### 5. Content area styling

- Constrain height for closed view (`max-h-[…] overflow-y-auto` for scrollable feeds)
- Ensure Game Plan list, Discovery Feed cards, and Calendar mini-view fit the wireframe density

---

## File Changes Summary

| File | Changes |
|------|---------|
| `expandable-widget.tsx` | Add `icon`, `subtitle`, `statusPill`, `expandCta`; apply card container; adjust header layout |
| `widget-status-pill.tsx` | **New** — generic status pill component |
| `dashboard-bento.tsx` | Pass icon, subtitle, statusPill, expandCta per widget; source status from data |
| `game-plan.tsx` | Remove h2; derive status "N active" from top3.length; keep "View Full Kanban Board" or lift to ExpandableWidget |
| `match-inbox.tsx` | Remove h2; expose match count for status pill; optionally constrain list height |
| `deadline-calendar-*.tsx` | Ensure calendar content has subtitle context; expose "Urgent" when deadlines &lt;7d |
| `contracts/expandable-widget.md` | Document new props |

---

## Data Flow for Status Pills

- **Game Plan**: `top3.length` → "3 active" (or "0 active" / hide when 0)
- **Discovery Feed**: `matches.length` → "5 matches" (or "0 matches")
- **Deadline Calendar**: Derive from nearest deadlines → "Urgent" (red) if any &lt;7d, else "On track" (green) or similar

Status is computed in the parent (GamePlan, MatchInbox, calendar logic) and passed up to ExpandableWidget via `statusPill` prop. To keep ExpandableWidget presentational, `dashboardContent` can be a render prop or the parent (DashboardBento) can compose ExpandableWidget with a thin wrapper that injects status. **Recommendation**: Have each widget component accept an optional `renderHeaderExtras` or `statusPill` callback, or pass status as a prop from DashboardBento (which would need to lift state or use context to get counts). Simpler: pass `statusPill` as ReactNode from DashboardBento; the bento would need access to top3.length, matches.length, etc. That requires either:
- Lifting that data to DashboardBento (complex, creates prop drilling), or
- Having each inner component (GamePlan, MatchInbox) render a wrapper that provides status to a shared parent.

**Simpler approach**: Keep ExpandableWidget props flat. DashboardBento receives `sectionStatus` but not the actual data (top3, matches). The cleanest is to have **each widget component** (GamePlan, MatchInbox, DeadlineCalendar content) expose its status via a **callback or slot**. For example:

```tsx
<GamePlan
  renderStatusPill={(count) => <WidgetStatusPill variant="active">{count} active</WidgetStatusPill>}
  onStatusReady={(pill) => setGamePlanStatusPill(pill)}
/>
```

Or: **compose** the closed view so the widget owns its full card, and ExpandableWidget wraps it. That would mean:

- `ExpandableWidget` receives `dashboardContent` which is the **entire card** including header.
- The card structure (icon, title, subtitle, status, content) is implemented in a shared `WidgetCard` component.
- GamePlan, MatchInbox, etc. use WidgetCard and supply their content.

That reverses the structure: instead of ExpandableWidget owning the header, each widget composes WidgetCard + its content. ExpandableWidget would then just handle expand/close behavior and wrap the card. The card (WidgetCard) would have: icon, title, subtitle, statusPill, children (content), expandButton (from ExpandableWidget or passed in).

**Recommended architecture**:

1. **WidgetCard** — Presentational. Props: `icon`, `title`, `subtitle`, `statusPill`, `children`, `headerActions`, `expandButton`, `expandCta`. Renders the closed card layout.
2. **ExpandableWidget** — Owns expand state, overlay, URL sync. Renders WidgetCard for closed state, with expand button. `dashboardContent` becomes the **body** of the card (not the whole card).
3. **DashboardBento** — Composes ExpandableWidget with WidgetCard-like structure, passing icon, subtitle, statusPill from each widget. The challenge: statusPill needs data (top3.length, etc.). So either:
   - Widget components render the pill themselves and we use a **slot** pattern: `dashboardContent={<><GamePlanWithStatus /><StatusPillSlot /></>}` — messy,
   - Or we have a **WidgetCardWithStatus** that takes a `useStatus()` hook — too coupled,
   - Or **each widget** returns/renders the full closed card (including header with status), and ExpandableWidget just wraps that with expand logic. So GamePlan would render a card with its own header (icon, title, subtitle, status) + content + "View Full Kanban Board". ExpandableWidget provides the expand button and the overlay. That way GamePlan owns "3 active", MatchInbox owns "5 matches", etc. ExpandableWidget needs to:
     - Accept a `closedView: ReactNode` that includes the full card (with a slot for the expand button)
     - Inject the expand button into the header area

---

## Recommended Architecture (Final)

**Option A — Extend ExpandableWidget (simpler, fewer files)**

- Add optional props to `ExpandableWidget`: `icon`, `subtitle`, `statusPill`, `expandCta`.
- Add card container styling to the closed state.
- **Status pill sourcing**: Use a **render prop** or **slot** so widgets can supply status without lifting data to DashboardBento. For example, `dashboardContent` could be a function `(slot: { statusPill?: ReactNode }) => ReactNode`, or we use a **WidgetClosedContent** wrapper that provides context: `GamePlan` sets context with `statusPill`; a wrapper reads it and passes to ExpandableWidget. Simpler: pass `dashboardContent` as `ReactNode` and add a separate `headerExtras?: ReactNode` that goes between title and expand. But `headerExtras` needs to come from the widget. Use **React context**: `WidgetHeaderContext` with `{ statusPill, setStatusPill }`. GamePlan calls `setStatusPill(<WidgetStatusPill>3 active</WidgetStatusPill>)` in a useEffect. ExpandableWidget consumes `WidgetHeaderContext` and renders the pill. This works: widget renders first, sets context, ExpandableWidget (parent) re-renders with the pill. Actually context flows down; the parent renders the child. So when ExpandableWidget renders, it renders `dashboardContent` which is GamePlan. GamePlan mounts, fetches data, calls setStatusPill. That updates context. But ExpandableWidget needs to *consume* that context. ExpandableWidget would wrap its children in a provider... No. The flow is: ExpandableWidget renders a header (its own) + dashboardContent. The status pill needs to be *in* the header. So the header is rendered by ExpandableWidget. The status pill comes from... the child (GamePlan). So we need the child to "send" data to the parent. That's either: (1) callback prop `onStatusReady`, (2) context where the child provides and a shared ancestor consumes. For (2): we'd need a layout where both ExpandableWidget's header and GamePlan share an ancestor that provides the context. The structure would be: `DashboardBento` > `StatusProvider` > `ExpandableWidget` (consumes StatusContext for pill) and `dashboardContent` includes `GamePlan` (which provides StatusContext). So `StatusProvider` wraps ExpandableWidget. GamePlan is inside dashboardContent. So the tree is `StatusProvider` > ExpandableWidget > div > dashboardContent > GamePlan. If GamePlan provides StatusContext... GamePlan would need to be wrapped in a provider. So `dashboardContent` = `<StatusProvider><GamePlan /></StatusProvider>`. And ExpandableWidget would need to be a child of StatusProvider to consume it. So: `StatusProvider` > ExpandableWidget. And `dashboardContent` = `<StatusProvider><GamePlan /></StatusProvider>`. So GamePlan and ExpandableWidget are siblings under StatusProvider. ExpandableWidget renders `dashboardContent` as a child. So the tree is: ExpandableWidget > (header div, content div). Content div has dashboardContent. So we have ExpandableWidget > div > StatusProvider > GamePlan. So StatusProvider is a child of ExpandableWidget. ExpandableWidget cannot consume context provided by its descendant. So that doesn't work.
- **Alternative**: Use a **ref callback** or **imperative handle**. GamePlan exposes `setStatusPill` via ref. ExpandableWidget passes a ref to dashboardContent... But dashboardContent is ReactNode, we can't easily pass ref to it without knowing its type.
- **Simplest**: **Lift status to DashboardBento** via a small data-fetching layer. Create `useDashboardWidgetStats()` that returns `{ gamePlanActiveCount, matchCount, calendarUrgent }`. DashboardBento uses it and passes statusPill to each ExpandableWidget. The hook would need to call the same APIs that GamePlan, MatchInbox use. That creates some duplication but is straightforward.

**Option B — Widget-owned cards**

- Each widget renders the full closed card (WidgetCard) including header with icon, title, subtitle, status.
- `dashboardContent` = the full card. ExpandableWidget only injects the expand button. To inject: we use a **slot** — WidgetCard accepts `expandButtonSlot: ReactNode` and the parent (ExpandableWidget) passes it. So the composition is: `dashboardContent` = `<WidgetCard expandButtonSlot={???}>`. But ExpandableWidget renders dashboardContent, so it can't pass the slot from outside unless dashboardContent is a render prop: `dashboardContent={(expandButton) => <WidgetCard expandButtonSlot={expandButton}>...</WidgetCard>}`. So we need the **creator** of the card (who has the expand button) to compose it. That creator is... ExpandableWidget. So ExpandableWidget would need to call a render prop: `dashboardContent(expandButton)`. So we change `dashboardContent` from `ReactNode` to `(expandButton: ReactNode) => ReactNode`. Then the "closed view" is created by the caller of ExpandableWidget. So DashboardBento would do:
  ```tsx
  <ExpandableWidget
    dashboardContent={(expandButton) => (
      <GamePlanCard expandButton={expandButton} />
    )}
    expandedContent={<KanbanBoard />}
  />
  ```
  And `GamePlanCard` fetches data, renders WidgetCard with icon, title, subtitle, status, content, expandButton. This works. GamePlanCard is a new component that wraps GamePlan (the body) with WidgetCard.

**Chosen approach: Option B** with render prop for `dashboardContent`. Clean separation: each `*Card` component owns its full closed presentation and receives the expand button from ExpandableWidget.

---

## Implementation Tasks

1. **Create `WidgetCard`** — `components/dashboard/widget-card.tsx`
   - Props: `icon`, `title`, `subtitle`, `statusPill`, `expandButton`, `children`, `expandCta?`, `onExpandCtaClick?`
   - Layout: card container (`rounded-lg border bg-card shadow-sm`), header row, subtitle, scrollable content area, optional CTA footer

2. **Create `WidgetStatusPill`** — `components/dashboard/widget-status-pill.tsx`
   - Props: `variant: "active" | "matches" | "urgent" | "neutral"`, `children`
   - Green for active/matches, red for urgent

3. **Change `ExpandableWidget.dashboardContent`** to render prop: `(expandButton: ReactNode) => ReactNode`
   - Update contract and all call sites

4. **Create `GamePlanCard`** — wraps `WidgetCard` + `GamePlan` body
   - Icon: Target, subtitle: "The Coach's Top Priorities", status: `{top3.length} active`
   - CTA: "View Full Kanban Board >" → `expand(WIDGET_IDS.kanban.id)`
   - Remove duplicate h2 from GamePlan when used inside card

5. **Create `DiscoveryFeedCard`** — wraps `WidgetCard` + `MatchInbox` body
   - Icon: GraduationCap, subtitle: "AI-matched scholarships for you", status: `{matches.length} matches`
   - Constrain MatchInbox height in closed view (`max-h-[...] overflow-y-auto`)

6. **Create `DeadlineCalendarCard`** — wraps `WidgetCard` + calendar content
   - Icon: Calendar, subtitle: "Your submission timeline"
   - Status: "Urgent" (red) if any deadline &lt;7d, else "On track" (green)
   - Requires calendar component to expose deadline summary or compute in card

7. **Update `DashboardBento`** — use new card components with render prop
</think>

<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
StrReplace