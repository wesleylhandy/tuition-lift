# Quickstart: TuitionLift Waitlist

**Feature**: 001-waitlist-launch

## Prerequisites

- Node 18+
- pnpm 9+
- Supabase project
- Resend API key

## Environment Variables

```env
# Supabase (apps/web)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Server-only; for Server Actions

# Resend
RESEND_API_KEY=re_...

# Waitlist config
WAITLIST_JUMP_PER_REFERRAL=10
WAITLIST_RATE_LIMIT_PER_IP=10
WAITLIST_RATE_LIMIT_PER_EMAIL=3
```

## Database Setup

1. Run migration for `waitlist` table (see `data-model.md`).
2. Enable RLS; create policies (service role only for INSERT/SELECT/UPDATE).
3. Create index on `email`, `created_at`, `referrer_id`.

## Run Locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key Paths

| Path | Purpose |
|------|---------|
| `apps/web/app/page.tsx` | Landing page |
| `apps/web/app/actions/waitlist.ts` | Server Actions |
| `apps/web/app/components/waitlist-form.tsx` | Form + useActionState |

## Verification

1. Submit valid email → success state with position.
2. Submit duplicate email → "already on list" + share incentive, no position.
3. Submit with honeypot filled → reject (no log).
4. Hit rate limit → friendly error.
5. Share link → unlock email within 5 min.
6. Invalid email → validation error before submit (fail-fast); server error → "Please try again", form usable for retry.
7. Pre-release: Run Lighthouse; verify Performance and Best Practices scores ≥ 90 each (SC-008).
