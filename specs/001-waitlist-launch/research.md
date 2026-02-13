# Research: TuitionLift Waitlist & Launch

**Feature**: 001-waitlist-launch  
**Date**: 2026-02-13

## 1. Server Actions + Form Handling (Next.js)

**Decision**: Use `useActionState` (React 19) with Server Actions for waitlist form submission.

**Rationale**: Next.js Server Actions provide built-in CSRF protection via `Next-Action` header. `useActionState` gives pending state and structured error/success return for form UX. Matches constitution's "useActionState where applicable."

**Alternatives**: REST API + fetch (more boilerplate; no built-in CSRF). React Hook Form + Server Action (adds dependency; useActionState sufficient for single form).

**References**: [Next.js Forms](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) | [useActionState](https://react.dev/reference/react/useActionState)

---

## 2. Honeypot + Bot Protection

**Decision**: Invisible form field (`website` or `url`), hidden via CSS; server rejects if populated. No captcha for MVP.

**Rationale**: Honeypot is zero-friction for users, blocks naive bots. Rate limiting (per IP + per email) handles bulk abuse. reCAPTCHA/hCaptcha deferred to reduce friction.

**Alternatives**: reCAPTCHA v3 (adds script, privacy concerns). hCaptcha (similar). Turnstile (lighter; consider if honeypot insufficient post-launch).

**References**: [OWASP Form Security](https://cheatsheetseries.owasp.org/cheatsheets/Form_Validation_Cheat_Sheet.html)

---

## 3. Rate Limiting Strategy

**Decision**: In-memory or Redis-backed rate limit keyed by IP and email. Configurable via env (e.g. `WAITLIST_RATE_LIMIT_PER_IP`, `WAITLIST_RATE_LIMIT_PER_EMAIL`). Use `@upstash/ratelimit` or simple in-memory Map for MVP.

**Rationale**: Spec requires per-IP and per-email limits. In-memory works for single-instance; Redis/Upstash for multi-instance. Env config satisfies "configurable" requirement.

**Alternatives**: Vercel KV + Upstash (if on Vercel). Supabase edge function (adds complexity). Middleware-based (Next.js middleware + headers).

**References**: [Upstash Ratelimit](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) | [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

---

## 4. Email Validation Strictness

**Decision**: Zod schema with regex + optional disposable-domain list (e.g. mailinator, guerrillamail). Validate format and MX if feasible via Resend/DNS; avoid over-blocking .edu typo domains.

**Rationale**: Spec requires "as strictly as safely possible." Format + disposable list balances safety vs. false rejections. MX check optional (can add later).

**Alternatives**: validator.js `isEmail` + isDisposableEmail. Full DNS MX lookup (slower; may block temp domains used legitimately).

**References**: [Zod](https://zod.dev) | [RFC 5322](https://tools.ietf.org/html/rfc5322)

---

## 5. Resend for Transactional Email

**Decision**: Resend API for welcome email and unlock-asset email. Single `from` domain; templated HTML (Coach persona).

**Rationale**: Spec names Resend. Simple API, good deliverability, React email templates supported. Fits "within 5 minutes" SLA.

**Alternatives**: SendGrid, Postmark, AWS SES. Resend chosen per spec.

**References**: [Resend Docs](https://resend.com/docs) | [Resend Node SDK](https://github.com/resend/resend-node)

---

## 6. Referral Link + Position Calculation

**Decision**: Referral token = base64 or nanoid in URL query (`?ref=abc123`). On signup with `ref`, lookup referrer, increment their "referral_count", recompute all positions (rank by `created_at` ASC, then apply configurable jump per referral). Position = row_number in ordered list.

**Rationale**: Spec: configurable jump via env; position shown to new signups; duplicates don't get position. Need deterministic ordering (created_at) + referral boost.

**Alternatives**: Pre-computed positions (complex invalidation). Separate referral table (cleaner; can add if needed).

**References**: [Supabase RPC](https://supabase.com/docs/guides/database/functions) for position calc

---

## 7. Share Trigger for Unlock Asset

**Decision**: "Share" = user clicks copy/repost button (tracked client-side). On click, call Server Action that: (1) records share event, (2) sends unlock email via Resend.

**Rationale**: Spec: "when they share" → interpret as explicit share action (not passive referral). Copy-link or share-dialog button triggers Server Action.

**Alternatives**: Send on referral signup (spec says "when they share", not on conversion). Native Web Share API (fallback to copy).

**References**: [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) | [clipboard.writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)
