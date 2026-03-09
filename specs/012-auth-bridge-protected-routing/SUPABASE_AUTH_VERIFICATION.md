# Supabase Auth Configuration Verification

**Feature**: 012-auth-bridge-protected-routing  
**Task**: T002 — Verify Supabase Auth config before implementing auth flow

## Required Settings

Configure in [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → **Authentication**.

### 1. Auth Providers → Email

| Setting | Required | Notes |
|---------|----------|-------|
| **Email** | Enabled | Default for email/password and Magic Link |
| **Confirm email** | Optional | If enabled, users must confirm before sign-in |
| **Magic Link** | Enabled | Required for `signInWithOtp`; Magic Link flow uses this |

**Path**: Authentication → Providers → Email

### 2. URL Configuration

| Setting | Required | Example |
|---------|----------|---------|
| **Site URL** | Yes | Must match app origin. Dev: `http://localhost:3000`; Prod: `https://your-domain.com` |
| **Redirect URLs** | Yes | Add `{origin}/auth/callback` for each environment |

**Path**: Authentication → URL Configuration

**Redirect URLs to add**:

- Development: `http://localhost:3000/auth/callback`
- Preview (Vercel): `https://*-your-project.vercel.app/auth/callback` (or explicit preview URLs)
- Production: `https://your-domain.com/auth/callback`

Supabase allows wildcards for preview deploys. Do **not** use `*` for production.

### 3. Security Notes

- Magic Link expiry: 1 hour (Supabase default); acceptable per spec
- Rate limits are enforced in-app: Magic Link 3/email/hour; failed login 5/email/15min

## Verification Steps

1. **Run the verification script** (validates env vars and outputs expected URLs):

   ```bash
   pnpm --filter web verify:supabase-auth
   ```

2. **In Supabase Dashboard**:
   - Authentication → Providers → Email: verify Email + Magic Link enabled
   - Authentication → URL Configuration: verify Site URL matches your app origin
   - Authentication → URL Configuration → Redirect URLs: add the callback URL(s) printed by the script

3. **Optional smoke test** (after T005–T011): Request a Magic Link; click it; confirm redirect to `/auth/callback` completes without Supabase "Invalid redirect URL" error.

## Checklist

- [ ] Email provider enabled
- [ ] Magic Link enabled (under Email provider)
- [ ] Site URL set to app origin (e.g. `http://localhost:3000` for dev)
- [ ] `{origin}/auth/callback` added to Redirect URLs (dev + prod)

## Troubleshooting: "Invalid or expired code" when entering 6-digit OTP

If users receive a 6-digit code but verification fails with "Invalid or expired code":

### 1. Email template (most common cause)

The Magic Link email template may include both a clickable link (`{{ .ConfirmationURL }}`) and the 6-digit code (`{{ .Token }}`). **Both consume the same underlying token.** Email clients, security scanners, and link-prefetching tools often auto-click links in emails, which consumes the token before the user can enter the code.

**Fix**: In Supabase Dashboard → **Authentication → Email Templates → Magic Link**, ensure the template includes `{{ .Token }}` for the 6-digit code. For OTP-only flows (login/check-email with code entry), use a template that shows only the code and does **not** include a clickable confirmation link. Or ensure users enter the code quickly before any prefetch can occur.

### 2. Token expiry

OTPs expire (default ~1h; configurable under Auth → Providers → Email). Request a fresh code and enter it within a few minutes.

### 3. Debug logging

In development, failed `verifyOtp` calls log the actual Supabase error to the server console. Check logs for `[verifyOtp] Supabase error:` to see the underlying message.
