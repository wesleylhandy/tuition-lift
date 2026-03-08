# Research: Manual Scout Flyer-to-Fact UI and Dashboard Integration

**Branch**: `016-manual-scout-ui` | **Date**: 2025-03-08  
**Spec**: [spec.md](./spec.md)

## Resolved Technical Decisions

### 1. Three-Card Input Selection

**Decision**: Replace the current ScoutEntryPoint (input field + drop zone with "or" divider) with three distinct **selectable cards**: Paste URL, Upload PDF, Snap Photo. Each card is a large, tappable region (min 44×44px per WCAG) with icon and micro-copy. Selecting a card reveals the corresponding sub-flow: (1) Paste URL → URL input field inline or in a follow-up step; (2) Upload PDF → file picker with `accept="application/pdf"`; (3) Snap Photo → camera capture (if `navigator.mediaDevices.getUserMedia` available) or image file picker (`accept="image/png,image/jpeg"`). Use a two-phase flow: cards first, then the selected input method.

**Rationale**: Spec FR-003 requires "three distinct options" with "clear icon and micro-copy in a premium academic aesthetic." The current 007 layout (input + drop zone) does not match the "three primary cards" requirement. Card-based selection improves discoverability and mobile usability; aligns with "premium academic aesthetic."

**Alternatives considered**:
- Single drop zone accepting all types: Simpler but less explicit; spec calls for three cards.
- Tab-based selection: Tabs are compact but less premium; cards feel more intentional.
- Stepper with three steps: Adds navigation overhead; cards are single-step selection.

---

### 2. Document Preview in Side-by-Side Verification

**Decision**: Store the **source file reference** (File object or Supabase Storage path) in ScoutModal state when the user uploads. For the verification view, render the left panel as:
- **URL**: Show an iframe or `<img>` with the URL (if same-origin or CORS permits), or a placeholder/link fallback.
- **PDF**: Use `URL.createObjectURL(file)` before upload for client-held file, or fetch from Storage and create blob URL. Render via `<iframe src={blobUrl}>` or `<object>`. Fallback: file name + "Preview unavailable."
- **Image**: Use `URL.createObjectURL(file)` or Storage signed URL. Render via `<img src={blobUrl}>`.
- **Fallback**: When preview cannot be rendered (CORS, unsupported format), show file name and type per spec: "The left panel shows a fallback (e.g., file name, placeholder)."

**Rationale**: Spec FR-005 requires "left panel shows the uploaded document or image preview (or fallback)." For file uploads, we hold the File in memory until extraction completes; we can create object URLs. For URL input, the source is the URL itself; iframe may fail for cross-origin; fallback is acceptable.

**Alternatives considered**:
- Server-side thumbnail generation: Adds latency and infra; overkill for MVP.
- No preview for URL-only: Spec says "document or image preview"; URL is the document; show link or fetched snapshot if feasible.
- PDF.js for inline render: More control but heavier; iframe/object is sufficient.

---

### 3. Processing Cancel (30s) and Timeout (60s)

**Decision**: Implement **client-side** cancel and timeout. The Scout backend (007) does not support abort; we add:
- **Cancel control**: Visible after ~30s of processing. When clicked, stop polling and return user to input selection. No server-side abort; the run continues in background but client ignores results.
- **Timeout**: After 60s of polling with no `step=complete`, show error state: "Extraction took too long" with retry and "Enter manually" options.
- **Implementation**: `useScoutStatus` (or equivalent) tracks elapsed time via `useEffect` + `setInterval` or `Date.now()`. At 30s, set `canCancel: true`; render cancel button. At 60s, set `timedOut: true`; stop polling; show error UI.

**Rationale**: Spec FR-010: "Cancel control after ~30 seconds"; "if extraction exceeds ~60 seconds or backend unresponsive, auto-fail and present retry option." Server-side abort would require changes to 007 API; client-side is sufficient and keeps 007 unchanged.

**Alternatives considered**:
- AbortController on fetch: Would cancel the polling request but not the backend job; acceptable; add `signal` to fetch when user cancels to stop polling immediately.
- Server-side timeout: Requires 007 changes; deferred.

---

### 4. Scout FAB Entry and Auth Gating

**Decision**: Add a **fixed-position FAB** (floating action button) in the bottom-right of the dashboard (`position: fixed; bottom: 1.5rem; right: 1.5rem; z-index` above content). FAB opens ScoutModal. **Auth gating**: Dashboard is under `(auth)` route group; assume layout requires auth. Additionally, render FAB only when `userId` is truthy (from `useEffect` + `/api/me` or session). When not authenticated, FAB is hidden. The FAB can replace or supplement the existing "Add Scholarship" button in ApplicationTracker; spec says "prominent Scout action in bottom-right"—FAB is the primary entry. Retain ApplicationTracker "Add Scholarship" as secondary if desired, or remove per product decision.

**Rationale**: Spec FR-001: "prominent Scout action (floating action button or equivalent) in the bottom-right area"; FR-001: "visible and operable only when authenticated." FAB is a common pattern for primary actions; fixed position ensures discoverability.

**Alternatives considered**:
- Inline button only: Spec explicitly requests FAB or equivalent in bottom-right.
- Dedicated route: Spec FR-011 says "no route change"; modal only.

---

### 5. Rate Limit Storage (10–20 Submissions per Cycle)

**Decision**: Add a **scout_submissions** table or **extend profiles** with a counter. Preferred: new table `scout_submissions(user_id, academic_year, count)` or `profiles.scout_submissions_count` + `profiles.scout_submissions_year`. Add **scout_config** table (single row) for global limit: `scout_submission_limit` (default 15). On each successful `confirmScoutScholarship`, increment count for current user and academic year. If count ≥ limit (from `getScoutSubmissionLimit()`), return `{ success: false, limitReached: true }` and block persistence. Expose limit via Server Action `checkScoutLimit()` called before opening Scout or before confirm. Reset logic: per academic year (e.g., `getCurrentAcademicYear()`); cycle resets when year changes.

**Rationale**: Spec FR-015: "per-user limit of 10–20 successful Scout submissions per scholarship cycle." A dedicated count is cleaner than scanning applications table. `profiles` could work but risks schema drift; new table keeps Scout concerns isolated. Limit in `scout_config` (DB) enables admin adjustment without redeploy; matches existing config pattern (sai_zone_config, merit_first_config).

**Alternatives considered**:
- Count from applications where source=scout: Accurate but slower; requires tagging applications.
- Env var SCOUT_SUBMISSION_LIMIT: Requires redeploy to change; DB config allows runtime adjustment.
- In-memory/cache: Not durable across serverless invocations; DB required.
- profiles JSONB: Flexible but less structured; table is clearer.

---

### 6. Responsive Full-Screen Modal (≤640px)

**Decision**: Use Tailwind breakpoint `sm:` (640px). For viewport width ≤640px, render the Scout modal as **full-screen** (`w-screen h-screen max-w-none max-h-none rounded-none`, or `fixed inset-0`). For larger viewports, keep the current max-width dialog (e.g., `max-w-lg` or `max-w-4xl` for side-by-side). Use `window.matchMedia('(max-width: 640px)')` or Tailwind responsive classes on the dialog container. The modal content (cards, form, side-by-side) stacks vertically on narrow screens; side-by-side becomes stacked (document on top, form below).

**Rationale**: Spec FR-011: "single responsive modal component that scales to a full-screen workspace on narrow viewports (e.g., ≤640px); no dedicated route." Tailwind `sm:` breakpoint is 640px; matches spec.

**Alternatives considered**:
- Separate mobile route: Spec forbids route change.
- Always full-screen: Works but less ideal on desktop.
- 768px breakpoint: Spec says ≤640px; use 640px.

---

## Dependencies on 007

| 007 Artifact | 016 Usage |
|--------------|-----------|
| POST /api/scout/process | Unchanged; invoked with url, name, or file_path |
| GET /api/scout/status/:runId | Unchanged; polled by useScoutStatus |
| uploadScoutFile | Unchanged; used for PDF and image upload |
| confirmScoutScholarship | Extended: add rate-limit check; return limitReached |
| ExtractedScholarshipData | Unchanged |
| ScoutProcessingHUD | Extended: cancel button, timeout handling |
