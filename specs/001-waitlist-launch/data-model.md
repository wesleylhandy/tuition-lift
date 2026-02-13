# Data Model: TuitionLift Waitlist

**Feature**: 001-waitlist-launch  
**Date**: 2026-02-13

## Entity: `waitlist`

Signup record for the TuitionLift waitlist.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `email` | `text` | NO | — | Validated email; unique |
| `segment` | `text` | YES | NULL | Self-categorization: `high_school`, `undergraduate`, `masters`, `doctoral` |
| `referrer_id` | `uuid` | YES | NULL | FK to `waitlist.id`; set when signup comes via referral link |
| `referral_count` | `int` | NO | 0 | Number of successful referrals (used for position jump) |
| `unlock_sent_at` | `timestamptz` | YES | NULL | When unlock-asset email was sent (share action) |
| `created_at` | `timestamptz` | NO | `now()` | Signup timestamp |

### Constraints

- `UNIQUE (email)`
- `CHECK (segment IN ('high_school', 'undergraduate', 'masters', 'doctoral') OR segment IS NULL)`
- `FOREIGN KEY (referrer_id) REFERENCES waitlist(id)`

### Position Calculation

Position = row number when ordering by:
1. `created_at` ASC (earlier = lower number)
2. Then apply configurable jump per `referral_count`: `effective_rank = base_rank - (referral_count * JUMP_AMOUNT)`

Computed at read time (or via DB function). Not stored.

### RLS Policies

- **INSERT**: Service role only (Server Actions use service key). No anon INSERT.
- **SELECT**: Service role only. No public read.
- **UPDATE**: Service role only (for `referral_count`, `unlock_sent_at`).

## Entity: `share_events` (optional, for audit)

Tracks when a user triggered "share" (copy link / share dialog).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `waitlist_id` | `uuid` | NO | — | FK to waitlist |
| `created_at` | `timestamptz` | NO | `now()` | When share occurred |

Used to: (1) trigger unlock email, (2) optionally cap unlock sends per user. Can be merged into `waitlist.unlock_sent_at` if single unlock per user suffices.

## State Transitions

- **New signup**: `INSERT waitlist` with `referral_count=0`, `unlock_sent_at=NULL`.
- **Duplicate email**: No INSERT; return friendly message (no position).
- **Referral signup**: `INSERT waitlist` with `referrer_id` set; `UPDATE referrer SET referral_count = referral_count + 1`.
- **Share action**: `UPDATE waitlist SET unlock_sent_at = now()` (or INSERT share_events); send email.

## Referral Token (Link Identifier)

Per spec: the referral link MUST contain a unique identifier for the referrer. **Implementation**: use base64url encoding of `waitlist.id` (UUID) for the URL query param `?ref=...`. No additional column required; decode server-side to resolve token → `id`. Alternative: add `referral_token` (nanoid, unique) column if non-enumerable tokens are preferred.

## Indexes

- `waitlist_email_idx` ON `waitlist(email)` — uniqueness + duplicate check
- `waitlist_created_at_idx` ON `waitlist(created_at)` — position ordering
- `waitlist_referrer_id_idx` ON `waitlist(referrer_id)` — referral lookup
