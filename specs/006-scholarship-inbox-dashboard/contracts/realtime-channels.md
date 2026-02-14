# Realtime Channels Contract: Scholarship Inbox & Dashboard

**Branch**: `006-scholarship-inbox-dashboard` | **Date**: 2025-02-13

## Overview

The dashboard subscribes to Supabase Realtime for live updates. Use **Postgres Changes** for table-driven updates; use **Broadcast** for custom events (e.g., Active Scouting status) when orchestration pushes non-DB events.

---

## 1. Match Inbox – New Matches

**Source**: Discovery results written to a table or view (e.g., `discovery_results`, `scholarship_matches`, or orchestration-managed table).

**Channel**: Postgres Changes on the table storing discovery results for the user. If orchestration uses a different persistence model, use Broadcast on channel `user:{userId}:discovery` with payload `{ event: "new_matches", matches: [...] }`.

**Postgres Changes** (when discovery results live in DB):
```
table: discovery_results (or equivalent)
filter: user_id = auth.uid()
events: INSERT
```

**Client**: Subscribe to INSERT; append new matches to local state; trigger entrance animation (Framer Motion). If using Broadcast, listen for `new_matches` event.

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

**Note**: Requires orchestration/agent to publish to this channel. If orchestration does not yet support Broadcast, fallback: poll or infer from checkpoint/orchestration API.

---

## 4. Reconnection

**Behavior**: On disconnect, Supabase Realtime client will attempt reconnect. Show subtle "Reconnecting..." indicator. When reconnected, re-fetch critical data or rely on next Postgres Change to sync.

**Reference**: [Supabase Realtime with Next.js](https://supabase.com/docs/guides/realtime/realtime-with-nextjs)
