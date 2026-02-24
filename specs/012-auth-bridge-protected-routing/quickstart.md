# Quickstart: Auth Bridge and Protected Routing

**Branch**: 012-auth-bridge-protected-routing | **Date**: 2026-02-24

## Prerequisites

- Supabase project with Email auth enabled (Magic Link + Password)
- Site URL and Redirect URLs configured in Supabase Dashboard: `{origin}/auth/callback`
- Existing `@supabase/ssr`, `createServerSupabaseClient` in apps/web

## Verification Steps

### 1. Middleware

```bash
# Visit /dashboard or /scout while logged out → redirect to /login?redirectTo=...
curl -I http://localhost:3000/dashboard
# Expect 307 to /login?redirectTo=%2Fdashboard
```

### 2. Landing Hero → Check Email

1. Load landing page
2. Enter valid email, click Get Started
3. Verify redirect to `/auth/check-email?email=...`

### 3. Magic Link Flow

1. On Check Email, click "Send Magic Link"
2. Check email for Magic Link
3. Click link → lands on `/auth/callback` → redirect to onboarding or dashboard
4. Verify session persists (refresh page)

### 4. Password Setup Flow

1. On Check Email, click "Set password"
2. Enter password on `/auth/password-setup`
3. Submit → account created → redirect to `/onboard`
4. Complete onboarding → redirect to `/dashboard`

### 5. Login Flow (Returning User)

1. Visit `/login`
2. Enter email + password
3. Submit → redirect to `/dashboard` (or redirectTo if from protected route)

### 6. Navbar Session State

- Guest: Landing shows "Login" and "Get Started"
- Authenticated: Landing/dashboard show Avatar + Debt Lifted HUD

### 7. Supabase Dashboard Config

- **URL Configuration** → Redirect URLs: Add `http://localhost:3000/auth/callback` (dev), production URL for prod
- **Auth** → Email: Magic Link enabled, 1h expiry (default)
