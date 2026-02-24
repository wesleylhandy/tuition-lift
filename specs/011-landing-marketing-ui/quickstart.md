# Quickstart: Landing Page and Marketing UI

**Branch**: 011-landing-marketing-ui | **Date**: 2026-02-24

## Prerequisites

- Node 20+
- pnpm 9+
- Supabase (local or linked project)
- 010-bento-shell-design-system complete (design tokens, fonts)

## Full Workflow (End-to-End)

```bash
# 1. Install dependencies
cd /path/to/tuition-lift
pnpm install

# 2. Apply migrations (landing_stats, testimonials)
pnpm --filter @repo/db db:push

# 3. Generate types
pnpm --filter @repo/db db:generate

# 4. Seed landing_stats (automatic via migration)
# Migration 00000000000034_landing_stats_seed.sql seeds default row on db:push.
# Values: $2.4M lifted, 15K students, 94% match rate.

# 5. Seed testimonials (optional; can start empty)
# INSERT testimonials as needed for social proof section

# 6. Start dev server
pnpm --filter web dev

# 7. Open http://localhost:3000 - full landing page
```

## Data Setup

### landing_stats

Seeding is automatic via migration `00000000000034_landing_stats_seed.sql` (runs on `pnpm --filter @repo/db db:push`). Default row: `stat_key='default'`, `total_debt_lifted_cents=240000000` ($2.4M), `student_count=15000`, `match_rate_percent=94`.

To seed manually (e.g. if skipping migrations):

```sql
INSERT INTO public.landing_stats (stat_key, total_debt_lifted_cents, student_count, match_rate_percent)
VALUES ('default', 240000000, 15000, 94)
ON CONFLICT (stat_key) DO NOTHING;
```

Update periodically via cron or manual run of aggregation query (see data-model.md §5).

### testimonials

```sql
INSERT INTO public.testimonials (quote, star_rating, student_name, class_year, display_order)
VALUES
  ('TuitionLift helped me find scholarships I never would have discovered on my own.', 5, 'Sarah M.', '2027', 0),
  ('The AI Coach kept me on track. I won three scholarships in one semester!', 5, 'James K.', '2026', 1);
```

## Usage Examples

### Server Component: Fetch stats

```typescript
// apps/web/app/page.tsx or a landing layout
import { createDbClient } from '@repo/db';

const db = createDbClient();
const { data: stats } = await db
  .from('landing_stats')
  .select('*')
  .eq('stat_key', 'default')
  .single();
```

### Server Component: Fetch testimonials

```typescript
const { data: testimonials } = await db
  .from('testimonials')
  .select('id, quote, star_rating, avatar_url, student_name, class_year')
  .order('display_order', { ascending: true });
```

### Hero Form (Client or Server Action)

```typescript
// Form uses action={redirectToSignUp}
// redirectToSignUp validates email, redirects to /onboard?email=...
```

## Static Pages

- `/privacy` — Privacy policy (placeholder content)
- `/terms` — Terms of service (placeholder content)
- `/contact` — MVP: static "Email us at support@tuitionlift.com"; contact form deferred post-MVP

## Verification Checklist

- [ ] Landing loads without errors — `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → 200
- [ ] Stats bar shows values or empty state — requires landing_stats seed (migration 00000000000034)
- [ ] Testimonials render or empty state — seed testimonials per Data Setup above
- [ ] Hero form validates email and redirects to /onboard?email=... (SC-001: flow completable in under 30s)
- [ ] Footer links navigate to /privacy, /terms, /contact
- [ ] Contact page: static "Email us at support@tuitionlift.com" (form deferred post-MVP)
- [ ] Lighthouse Performance and Best Practices ≥ 90 — `npx lighthouse http://localhost:3000 --view`
- [ ] Responsive at 375px, 768px, 1440px — Chrome DevTools device toolbar
- [ ] Reduced motion disables/simplifies animations — DevTools → Rendering → Emulate CSS media feature prefers-reduced-motion
