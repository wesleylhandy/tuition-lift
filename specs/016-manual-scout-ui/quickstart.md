# Manual Scout Flyer-to-Fact UI — Quickstart

**Branch**: `016-manual-scout-ui` | **Date**: 2025-03-08

## Prerequisites

- 007 Scout backend operational (POST /api/scout/process, GET /api/scout/status, confirmScoutScholarship, uploadScoutFile)
- Authenticated dashboard access

## Setup

1. **Run migrations** (scout_submissions, scout_config, scholarships.source):
   ```bash
   pnpm db:push --filter @repo/db
   ```
   Migrations: contracts/scout-rate-limit-api.md §3, §4; data-model.md §1a, §2.

2. **Limit config**: Stored in `scout_config` table (default 15). Update via SQL or admin UI; no env var.

## Verification

### Manual: FAB and Modal

1. Log in; open dashboard.
2. **Verify FAB**: Floating action button visible in bottom-right; opens Manual Scout modal.
3. **Verify title**: Modal shows "Manual Scout" and "Flyer-to-Fact Workspace".
4. **Verify auth gate**: When not logged in, FAB is hidden.

### Manual: Three-Card Input

1. Open Scout modal.
2. **Verify three cards**: Paste URL, Upload PDF, Snap Photo — each with icon and label.
3. **Paste URL**: Select card → URL input appears → enter URL → submit → processing → verification.
4. **Upload PDF**: Select card → file picker (PDF only) → select file → processing → verification.
5. **Snap Photo**: Select card → camera or image picker → capture/select → processing → verification.

### Manual: Side-by-Side Verification

1. Complete extraction (URL, PDF, or image).
2. **Verify layout**: Left panel shows document preview (or fallback); right panel shows verification form.
3. **Verify form**: Name, Amount, Deadline, URL, Eligibility; AI-extracted values visually distinguished.
4. Edit a field; click Confirm → scholarship and application created.
5. Cancel without confirm → no records persisted.

### Manual: Processing Cancel and Timeout

1. Submit a slow or failing extraction.
2. **After ~30s**: Cancel button appears; click → return to input selection.
3. **After ~60s** (if no complete): "Extraction took too long" with Retry and Enter manually.

### Manual: Responsive Modal

1. Resize viewport to ≤640px (or use DevTools device mode).
2. **Verify**: Modal scales to full-screen; no horizontal scroll; content stacks vertically in verification view.

### Manual: Rate Limit

1. Complete 15 (or limit from scout_config) Scout submissions in the same academic year.
2. **Verify**: Next confirm returns limit-reached; friendly message with "Request more" option; no persistence.
3. (Optional) Verify "Request more" flow if implemented.

### Performance (SC-002)

1. Complete full flow (select → extract → verify → confirm) for a typical document; verify it completes in <90s under normal conditions (optional).

### Accessibility

1. **Keyboard**: Tab through cards, form fields, buttons; Enter/Space to activate; Escape closes modal.
2. **Touch**: All targets ≥44×44px.
3. **Screen reader**: Labels, aria-describedby, focus management.

## Key Paths

| Artifact      | Path |
|---------------|------|
| Scout FAB     | `apps/web/components/dashboard/scout/scout-fab.tsx` |
| Scout Modal   | `apps/web/components/dashboard/scout/scout-modal.tsx` |
| Input Cards   | `apps/web/components/dashboard/scout/scout-input-card.tsx` (etc.) |
| Verification  | `apps/web/components/dashboard/scout/scout-verification-view.tsx` |
| Rate limit    | `apps/web/lib/actions/scout.ts` (checkScoutLimit, confirmScoutScholarship) |
| Migrations    | `*_scout_submissions.sql`, `*_scout_config.sql`, `*_scholarships_source.sql` |
