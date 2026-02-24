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

# 4. Seed landing_stats (initial values)
# Run seed script or manual INSERT - see packages/database/scripts/ or migrations
# Example: INSERT INTO landing_stats (stat_key, total_debt_lifted_cents, student_count, match_rate_percent)
#          VALUES ('default', 240000000, 15000, 94);

# 5. Seed testimonials (optional; can start empty)
# INSERT testimonials as needed for social proof section

# 6. Start dev server
pnpm --filter web dev

# 7. Open http://localhost:3000 - full landing page
```

## Data Setup

### landing_stats

After migration, seed at least one row:

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

- [ ] Landing loads without errors
- [ ] Stats bar shows values or empty state
- [ ] Testimonials render or empty state
- [ ] Hero form validates email and redirects to /onboard?email=... (SC-001: flow completable in under 30s)
- [ ] Footer links navigate to /privacy, /terms, /contact
- [ ] Contact page: static "Email us at support@tuitionlift.com" (form deferred post-MVP)
- [ ] Lighthouse Performance and Best Practices ≥ 90
- [ ] Responsive at 375px, 768px, 1440px
- [ ] Reduced motion disables/simplifies animations
