# Redirect Allowlist Contract

**Branch**: 012-auth-bridge-protected-routing | **Date**: 2026-02-24  
**Spec**: [spec.md](../spec.md) FR-009

## Purpose

Validate `redirectTo` query parameter to prevent open redirect attacks. Used by:
- Middleware when redirecting unauthenticated users to login
- Auth callback and Server Actions when redirecting after successful login

## Allowed Paths

| Pattern | Example |
|---------|---------|
| `/dashboard` | `/dashboard` |
| `/dashboard/*` | `/dashboard/settings` |
| `/scout` | `/scout` |
| `/onboard` | `/onboard` |

## Validation Rules

1. `redirectTo` must be a relative path (start with `/`)
2. Must NOT contain `//` (protocol-relative or double slash)
3. Must NOT contain `javascript:`, `data:`, or other schemes
4. Must match one of the allowed prefixes
5. If invalid or missing, use default: `/onboard` (new users) or `/dashboard` (returning)

## Implementation

```typescript
// lib/auth/redirect-allowlist.ts
const ALLOWED_PREFIXES = ['/dashboard', '/scout', '/onboard'];

export function getSafeRedirectTo(
  redirectTo: string | null,
  defaultPath: string
): string {
  if (!redirectTo || typeof redirectTo !== 'string') return defaultPath;
  const decoded = decodeURIComponent(redirectTo.trim());
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return defaultPath;
  if (/javascript:|data:/i.test(decoded)) return defaultPath;
  const allowed = ALLOWED_PREFIXES.some(p => decoded === p || decoded.startsWith(p + '/'));
  return allowed ? decoded : defaultPath;
}
```
