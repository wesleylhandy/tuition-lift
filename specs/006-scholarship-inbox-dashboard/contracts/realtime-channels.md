# Realtime Channels Contract: Scholarship Inbox & Dashboard

**Branch**: `006-scholarship-inbox-dashboard` | **Date**: 2025-02-13

## Overview

The dashboard subscribes to Supabase Realtime for live updates. Use **Postgres Changes** for table-driven updates; use **Broadcast** for custom events (e.g., Active Scouting status) when orchestration pushes non-DB events.

---

## 1. Match Inbox – New Matches

**Source**: Discovery results live in LangGraph checkpoint state (003), not a Supabase table. GET /api/discovery/results reads from checkpoint. New matches arrive when orchestration completes discovery and checkpoints.

**Channel**: Broadcast on `user:{userId}:discovery` with payload `{ event: "new_matches", matches: [...] }`. Orchestration (or discovery completion handler) must publish to this channel when discovery finishes. **No Postgres Changes**—there is no discovery_results table.

**Fallback**: When Broadcast is not yet implemented by orchestration, poll GET /api/discovery/results (e.g., after user triggers discovery or on interval while status=completed) and compare with previous results to detect new matches.

**Client**: Subscribe to Broadcast for `new_matches`; append to local state; trigger entrance animation (Framer Motion).

---

## 2. Application Tracker – Status Changes

**Source**: `applications` table.

**Channel**: Postgres Changes on `applications`.

**Example**:
```
table: applications
filter: user_id = auth.uid()
events: INSERT, UPDATE
```

**Client**: On UPDATE, refresh affected application in UI; on INSERT, add to tracker. Reflect server state.

---

## 3. Live Pulse – Active Scouting

**Source**: Orchestration (Advisor) broadcasts when Scout phase is running. Not a DB table; use Broadcast.

**Channel**: Broadcast channel, e.g. `user:{userId}:discovery`.

**Payload** (example):
```json
{ "event": "scouting", "domains": ["example.edu", "scholarships.gov"], "status": "active" }
```

**Client**: Subscribe to broadcast; show Live Pulse + domain ticker when status is active; hide when discovery completes or status is "idle".

**Orchestration responsibility**: 003/004 should publish to this channel during Scout (Advisor_Search). When Scout starts: `{ event: "scouting", domains: [...], status: "active" }`; when done: `{ event: "scouting", status: "idle" }`.

**Fallback**: When Broadcast is not yet implemented, poll GET /api/discovery/status. When `status === "running"` and `lastActiveNode === "Advisor_Search"`, show Live Pulse with "Active Scouting" (domain ticker unavailable without Broadcast).

---

## 4. Reconnection

**Behavior**: On disconnect, Supabase Realtime client will attempt reconnect. Show subtle "Reconnecting..." indicator. When reconnected, re-fetch critical data or rely on next Postgres Change to sync.

**Reference**: [Supabase Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs)
