# Quick Start: Bento Shell and Design System

**Branch**: 010-bento-shell-design-system | **Date**: 2025-02-24

## Prerequisites

- Node 20+, pnpm
- Supabase project (local or hosted) with auth and profiles
- Authenticated user (via onboarding or sign-in)

## Setup

1. **Add lucide-react**:
   ```bash
   pnpm --filter web add lucide-react
   ```

2. **Environment variables** (in `apps/web/.env.local`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

3. **Design tokens** are in `apps/web/app/globals.css` (`@theme` block). Add `--color-slate`; update `--font-heading` and `--font-body` for Playfair Display and Inter.

## Run the Dashboard

1. Start the web app:
   ```bash
   pnpm --filter web dev
   ```

2. Authenticate via `/onboard` (sign up) or existing session.

3. Navigate to `/dashboard`. Unauthenticated users are redirected to `/` (landing) per middleware.

## Key Paths

| Path | Purpose |
|------|---------|
| `apps/web/app/(auth)/dashboard/page.tsx` | Dashboard route |
| `apps/web/app/globals.css` | Design tokens (@theme) |
| `apps/web/components/dashboard/bento-grid.tsx` | Bento grid container |
| `apps/web/components/dashboard/` | Shell components (header, sections, skeletons) |
| `apps/web/middleware.ts` | Auth protection for /dashboard |

## Verification

- **Unauthenticated** → Navigate to `/dashboard` → redirect to `/` (landing).
- **Authenticated** → See global header, welcome area, bento grid (Game Plan, Discovery Feed, Deadline Calendar), stats row. All sections show loading skeletons until wired to data.
- **Accessibility** → Run axe-core or Lighthouse; zero critical/serious violations.
- **Responsive** → Resize to 375px, 768px, 1280px; no horizontal scroll.

## Design Tokens

See [contracts/design-tokens.md](./contracts/design-tokens.md) for the full palette and typography. Use `text-navy`, `bg-off-white`, `font-heading`, `font-body`, etc. Never hardcode hex values in components.

## Contracts

- [design-tokens.md](./contracts/design-tokens.md) — Colors, typography, spacing
- [component-shell.md](./contracts/component-shell.md) — SectionShell, BentoGrid, GlobalHeader interfaces
