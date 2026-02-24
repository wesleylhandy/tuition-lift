# Lighthouse Scores: Bento Shell and Design System

**Date**: 2026-02-24  
**Lighthouse**: 13.0.3  
**Target**: `/dashboard` (redirects to `/` when unauthenticated)

## Note on Auth

The dashboard requires authentication. Unauthenticated requests to `/dashboard` redirect to `/` (landing). This audit captured the **landing page** after redirect. To audit the dashboard itself, run Lighthouse manually while authenticated (e.g., after signing in via `/onboard`).

## Category Scores

| Category        | Score | Display   | Target     | Status  |
|-----------------|-------|-----------|------------|---------|
| Accessibility   | 100   | 1.00      | ≥ 90       | ✓ PASS  |
| Performance     | 81    | 0.81      | Document   | —       |
| Best Practices  | 100   | 1.00      | Document   | ✓ PASS  |

## Summary

- **Accessibility ≥ 90**: ✓ Achieved (100)
- **Performance**: 81 (landing page; dashboard may differ)
- **Best Practices**: 100

## How to Re-run (Authenticated Dashboard)

```bash
# 1. Start dev server
pnpm --filter web dev

# 2. Sign in via browser at http://localhost:3000/onboard

# 3. Run Lighthouse on dashboard (with saved session/cookies)
npx lighthouse http://localhost:3000/dashboard --output=json --output-path=./lighthouse-report.json
```

Or use Chrome DevTools Lighthouse panel while on `/dashboard` (authenticated).
