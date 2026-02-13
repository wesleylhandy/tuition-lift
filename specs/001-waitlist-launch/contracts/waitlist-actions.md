# Waitlist Server Actions Contract

**Feature**: 001-waitlist-launch  
**Type**: Next.js Server Actions (no REST API)

## 1. `submitWaitlist(prevState, formData)`

Signs up a user to the waitlist. Used via `useActionState`.

**Input (FormData)**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | string | Yes | Validated format; disposable domains rejected |
| `segment` | string | No | `high_school` \| `undergraduate` \| `masters` \| `doctoral` |
| `referrer_token` | string | No | From URL `?ref=...`; used to attribute referral |
| `website` | string | No | Honeypot; must be empty; server rejects if set |

**Returns** (for `useActionState`):

```ts
type SubmitResult =
  | { success: true; position: number; referralToken: string }
  | { success: false; kind: 'duplicate'; message: string }
  | { success: false; kind: 'validation'; message: string; field?: string }
  | { success: false; kind: 'rate_limited'; message: string }
  | { success: false; kind: 'error'; message: string }
```

**Rate limit**: Per IP and per email (configurable). Returns `rate_limited` when exceeded.

---

## 2. `recordShare(waitlistId)`

Records that a user shared their referral link and triggers unlock-asset email.

**Input**:

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `waitlistId` | uuid | Yes | From session or success state |

**Returns**:

```ts
type ShareResult =
  | { success: true }
  | { success: false; message: string }
```

**Side effect**: Sends unlock-asset email via Resend; sets `unlock_sent_at` on waitlist row. Idempotent (only first share sends email).
