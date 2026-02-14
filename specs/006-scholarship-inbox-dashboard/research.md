# Research: Scholarship Inbox & Dashboard

**Branch**: `006-scholarship-inbox-dashboard` | **Date**: 2025-02-13  
**Spec**: [spec.md](./spec.md)

## Resolved Technical Decisions

### 1. Supabase Realtime with Next.js App Router

**Decision**: Use Supabase Realtime client-side in React components via `useEffect` + `supabase.channel().on().subscribe()`. Prefer **Broadcast** for custom events (e.g., Active Scouting status, domain ticker) when orchestration needs to push non-DB updates; use **Postgres Changes** for tables (applications, scholarships, discovery_results) when schema supports it.

**Rationale**: Supabase docs recommend client-side subscription in Next.js; Server Components cannot hold WebSocket connections. Broadcast scales better than Postgres Changes for high-frequency updates; Postgres Changes simpler for CRUD-driven UI (applications status, new matches).

**Alternatives considered**:
- Server-Sent Events (SSE): Extra infra; Supabase Realtime already provides this.
- Polling: Violates "real time" and SC-002 (5s for Live Pulse).

**Reference**: [Supabase Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs), [Subscribing to Database Changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)

---

### 2. Framer Motion for New Match Entrance and Animations

**Decision**: Use `AnimatePresence` + `motion` with `initial`, `animate`, `exit` for list items. Use `layoutId` for smooth layout shifts when items are added/removed. Use `key={item.id}` for stable identity.

**Rationale**: Spec requires "noticeable indicator" for new matches; Framer Motion provides declarative, performant animations. AnimatePresence handles exit animations; layoutId prevents jarring reflows.

**Alternatives considered**:
- CSS-only: Less control for staggered/list entrance; no exit coordination.
- React Spring: Similar capability; Framer Motion has larger ecosystem and spec user input mentioned it.

**Reference**: [Framer Motion AnimatePresence](https://www.framer.com/motion/animate-presence/), [Layout Animations](https://frontend.fyi/course/motion/07-layout-animations/05-showing-new-elements)

---

### 3. Bento Grid via shadcn/ui + CSS Grid

**Decision**: Build Bento layout with Tailwind `grid` utilities and shadcn `Card` components. Use responsive `grid-cols-*` and `col-span-*` / `row-span-*` for modular blocks. No dedicated "Bento" component—composition of grid + Card.

**Rationale**: shadcn/ui provides Card, Skeleton, Toast (sonner); Constitution mandates Tailwind + shadcn. Bento is a layout pattern, not a component; CSS Grid is sufficient and keeps bundle small.

**Alternatives considered**:
- Third-party Bento library: Unnecessary; adds dependency.
- Flexbox-only: Grid better for asymmetric block layouts.

---

### 4. Server Actions for State Transitions

**Decision**: Use Next.js Server Actions (`'use server'`) for Track, Dismiss, Verify Submission. Return `{ success, error? }`; client handles toast on error with retry (re-invoke action). Use `useActionState` (React 19) where form-based flows apply; otherwise `startTransition` + imperative invoke.

**Rationale**: Constitution §9 "Server-First"; spec FR-023 "server-side actions". Server Actions avoid API route boilerplate; integrate with RLS via Supabase server client.

**Reference**: [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations), [useActionState](https://react.dev/reference/react/useActionState)

---

### 5. Toast and Skeleton Components

**Decision**: Use shadcn/ui Toast (via Sonner) for action failure + retry. Use shadcn Skeleton for loading states. Ensure skeletons mirror final layout (same grid structure with placeholder blocks).

**Rationale**: Spec FR-016 (skeletons), FR-017 (toast with retry). Sonner is lightweight and commonly paired with shadcn.

---

### 6. Discovery Run Scoping for Dismissals

**Decision**: Add optional `discovery_run_id` (or `run_ts` timestamptz) to dismissals table. When filtering Match Inbox, exclude scholarships where (user_id, scholarship_id) exists in dismissals for the **current** discovery run. "Current" = most recent discovery run for user. When a new discovery completes, previous run's dismissals no longer filter (soft dismiss semantics).

**Rationale**: Spec: "hidden for current discovery run only; may reappear when a new discovery run returns it." Run-scoping enables correct filtering without permanent hide.

**Alternatives considered**:
- No run scoping (always filter): Would make "reappear" impossible—wrong.
- Permanent dismiss: Spec explicitly chose soft dismiss.
