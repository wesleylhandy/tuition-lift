# Quickstart: Scholarship Inbox & Dashboard

**Branch**: `006-scholarship-inbox-dashboard` | **Date**: 2025-02-13

## Prerequisites

- Node 18+
- pnpm 9
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local DB)
- `packages/database` set up with migrations (002-db-core-infrastructure)
- `apps/web` with Next.js, Tailwind, shadcn/ui

## Setup

### 1. Install Dependencies

```bash
cd apps/web
pnpm add framer-motion
# shadcn: pnpm dlx shadcn@latest add skeleton toast sonner
```

### 2. Apply Dismissals Migration

```bash
cd packages/database
pnpm db:push   # or: supabase db push
```

Ensure migration `*_add_dismissals.sql` exists and creates the `dismissals` table.

### 3. Environment

Ensure `.env.local` (or equivalent) has:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...  # server-only, for RLS bypass if needed
```

### 4. Run Development Server

```bash
cd apps/web
pnpm dev
```

Open `http://localhost:3000/dashboard`.

## Key Paths

| Path | Description |
|------|-------------|
| `app/(auth)/dashboard/page.tsx` | Main Control Center page |
| `components/dashboard/match-inbox/` | Match Inbox components |
| `components/dashboard/game-plan/` | Coach's Game Plan components |
| `components/dashboard/application-tracker/` | Application Tracker components |
| `lib/actions/track.ts` | Track Server Action |
| `lib/actions/dismiss.ts` | Dismiss Server Action |
| `lib/actions/verify-submission.ts` | Verify Submission Server Action |
| `lib/hooks/use-realtime-matches.ts` | Realtime subscription hook |

## Verification

1. **Match Inbox**: Load dashboard with mock or real discovery results; verify Trust Shield colors (Green/Amber/Yellow/Red) by trust_score.
2. **Coach's Prep Checklist**: View dashboard with empty matches; verify dynamic checklist (profile completeness, discovery state).
3. **Quick Actions**: Click Track, Dismiss, Verify Submission; verify toast on error with retry.
4. **Loading**: Verify skeletons during initial load.
5. **Accessibility**: Run Lighthouse; verify WCAG AA.

## References

- [Server Actions Contract](./contracts/server-actions.md)
- [Realtime Channels Contract](./contracts/realtime-channels.md)
- [Data Model](./data-model.md)
- [002 DB Quickstart](../002-db-core-infrastructure/quickstart.md)
