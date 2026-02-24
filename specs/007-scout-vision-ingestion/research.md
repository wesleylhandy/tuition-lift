# Research: Unified Manual Scout & Vision Ingestion

**Branch**: `007-scout-vision-ingestion` | **Date**: 2025-02-18  
**Spec**: [spec.md](./spec.md)

## Resolved Technical Decisions

### 1. Vision-Capable LLM for Image/Scanned PDF Extraction

**Decision**: Use GPT-4o (OpenAI) as the primary Vision LLM for extracting scholarship data from images and scanned PDFs. Input: base64-encoded image or page render. Output: structured JSON (Name, Reward, Deadline, Eligibility, URL) with optional `research_required` flag per field. Use LangChain's `ChatOpenAI` with `model: "gpt-4o"` and message content type `image_url` per OpenAI API docs.

**Rationale**: Spec FR-002 requires extraction from flyers/screenshots. GPT-4o supports vision natively; strong at structured extraction from documents. Constitution permits LLM usage; existing agent stack (004) uses LangChain. Gemini 1.5 Pro is a viable fallback if cost/latency favors it; both support multimodal input. For consistency with 004 (LLM for query generation), use OpenAI unless env overrides.

**Alternatives considered**:
- Gemini 1.5 Pro: Comparable vision quality; different API surface; add as optional via `SCOUT_VISION_MODEL` env.
- Claude 3: Vision support; similar tradeoffs.
- Specialized OCR + LLM: Overkill; Vision LLM handles extraction end-to-end.

**Reference**: [OpenAI Vision API](https://platform.openai.com/docs/guides/vision), [LangChain ChatOpenAI](https://js.langchain.com/docs/integrations/chat/openai/)

---

### 2. Digital PDF Text Extraction (Reduce LLM Tokens)

**Decision**: Use `pdf-parse` (npm) for native PDFs with selectable text. Detect text density (chars per page); if above threshold (e.g., 100+ chars/page), use `pdf-parse` for text extraction and pass text to LLM (no vision). If below threshold (scanned/image PDF), route to Vision LLM with rendered pages as images.

**Rationale**: Spec mentions "Digital Extraction: Use pdf-parse for native text extraction from digital PDFs to reduce LLM tokens." Reduces cost and latency for text-heavy PDFs; Vision remains fallback for scanned docs.

**Alternatives considered**:
- pdfjs-dist (Mozilla): Lower-level; more control but more setup.
- Always Vision: Higher cost; unnecessary for digital PDFs.
- pdf-parse: Simple API, single dependency; widely used; returns text buffer.

**Reference**: [pdf-parse npm](https://www.npmjs.com/package/pdf-parse)

---

### 3. Fuzzy Title Matching for Deduplication

**Decision**: Use `fuzzball` (npm) for fuzzy string similarity. Call `ratio(titleA, titleB)`; threshold ≥ 0.85 (85% similarity) triggers "may already be in your list" warning. Compare against existing scholarship titles in user's applications and in global scholarships table (by URL if available, else by title). Store threshold in env: `SCOUT_DEDUP_SIMILARITY_THRESHOLD` (default 0.85).

**Rationale**: FR-009 requires fuzzy-match check. Fuzzball is a maintained fork of fuzzywuzzy; provides `ratio()` returning 0–100; TypeScript-compatible. 0.85 balances false positives (different scholarships with similar names) vs duplicates.

**Alternatives considered**:
- string-similarity: Deprecated; avoid.
- CmpStr: Newer; less adoption; viable alternative.
- Levenshtein only: Less accurate for reordered words; fuzzball uses token sort.

**Reference**: [fuzzball npm](https://www.npmjs.com/package/fuzzball)

---

### 4. File Upload: Supabase Storage

**Decision**: Create a private bucket `scout_uploads` in Supabase Storage. Policy: authenticated users can `INSERT` and `SELECT` only their own objects (path: `{user_id}/{uuid}.{ext}`). Files are temporary; optionally delete after extraction completes or after 24h via cron. Max file size: 10 MB (configurable via `SCOUT_MAX_FILE_SIZE_MB`). Accepted MIME types: `application/pdf`, `image/png`, `image/jpeg`.

**Rationale**: Spec and Constitution require Supabase; no other storage. Private bucket with user-scoped paths ensures RLS. Temporary retention aligns with "temp data until user confirms"; cleanup optional for MVP.

**Alternatives considered**:
- Presign URLs for client upload: Reduces server load; adds complexity; Server Action upload is simpler for MVP.
- S3: Constitution mandates Supabase; out of scope.

**Reference**: [Supabase Storage](https://supabase.com/docs/guides/storage)

---

### 5. Scout Flow Architecture: Separate Entry Point vs Graph Integration

**Decision**: Scout runs as a **separate LangGraph subgraph** or **invokable flow** from the main orchestration. Entry: `manual_research_node` (or `Scout_Extract` + `Scout_Verify`). Not part of the existing discovery START → Advisor_Search flow. The main graph stays unchanged; Scout is triggered by a dedicated API (`POST /api/scout/process`) when user submits URL, name, or file. State: `temp_extracted_data` held in Scout-specific state or in a short-lived checkpoint; not added to `TuitionLiftState` discovery_results (those come from automated discovery). On user confirm: Server Action creates scholarship + application via `@repo/db`.

**Rationale**: Spec distinguishes "manual" from discovery; Scout is user-initiated. Mixing Scout into Advisor_Search would complicate triggers and state. Separate flow keeps concerns isolated; UI calls Scout API directly.

---

### 6. Processing HUD and Real-Time Feedback

**Decision**: Use **Server-Sent Events (SSE)** or **polling** for processing steps. Scout API returns a `run_id`; client polls `GET /api/scout/status/{run_id}` or subscribes via SSE. Response includes `step` (`reading_document` | `searching_sources` | `calculating_trust`) and optional `message` (Coach/Advisor persona text). Store step in Scout state or a lightweight `scout_runs` table (run_id, user_id, step, created_at). Poll interval: 1–2s; max wait 90s before timeout.

**Rationale**: FR-006 requires real-time processing overlay. LangGraph streams messages but Scout may run in background (Inngest or serverless); polling is simpler and works with serverless. SSE preferred if Web API supports it; polling is fallback.

---

### 7. UI Composition and Extensibility (Per User Request)

**Decision**: Design Scout UI using **composition over configuration** and **compound components**. Create:

- `ScoutModal` — Root shell (Dialog); composes `ScoutEntryPoint`, `ScoutProcessingHUD`, `ScoutVerificationForm`.
- `ScoutEntryPoint` — Composable: `ScoutInputField` (name/URL) + `ScoutDropZone` (files). Each is a self-contained, reusable component.
- `ScoutProcessingHUD` — Props: `step`, `message`, `persona`. Extensible: add steps via prop or context without changing layout.
- `ScoutVerificationForm` — Form with editable fields; uses shared `ScoutField` component that supports `researchRequired` state. Fields driven by schema (Name, Reward, Deadline, Eligibility, URL) so new fields can be added via config.
- Use **render props** or **slot composition** for future steps (e.g., add "Add to Game Plan" CTA, bulk import step). Avoid hardcoding flow; use a `ScoutFlowContext` or step enum that UI consumes.
- All components in `components/dashboard/scout/`; no logic in page—page only composes.

**Rationale**: User requested "design utilizes best coding practices for future enhancement." Composition enables adding new entry types (e.g., paste from email), new processing steps, or new verification fields without refactoring. Compound components (Radix/shadcn style) allow parent to control layout while children remain flexible.

---

### 8. Verification Form and "Research Required" Flagging

**Decision**: Each extracted field has optional `research_required: boolean`. When true, render field with `aria-describedby` linking to helper text "Research Required—please verify"; use `Input` with `className` variant (e.g., `border-amber-500`) and optional icon. Form uses React Hook Form + Zod; schema includes `research_required` per field for validation messaging.

---

### 9. Deduplication UX

**Decision**: When fuzzy match is found (threshold met), show inline banner above verification form: "This scholarship may already be in your list: [Existing Title]." Buttons: "Add Anyway" | "Cancel." "Add Anyway" proceeds to save; "Cancel" closes modal and discards temp data.

---

### 10. Academic Year for Applications

**Decision**: Use `getCurrentAcademicYear()` from `@/lib/utils/academic-year` (006) when creating application. Format "YYYY-YYYY" (e.g., "2026-2027"). Dynamic per Constitution §8; no hardcoded years.

---

### 11. Tavily Usage for Scout URL/Name Search

**Decision**: Reuse `TavilyClient.search()` from 004. For Scout:
- **URL input**: Use the URL as the search query (e.g., `query: url`) so Tavily returns the page and related content; or use `include_domains` if Tavily supports it to bias results toward that domain.
- **Name input**: Use the scholarship name as the search query (e.g., `query: "Coca-Cola Scholars Program 2026"`). Tavily returns matching pages; take top result(s) for verification.
- No `AnonymizedProfile` or query generation—Scout is direct lookup by URL or name.
- Store TrustScorer output (scoring_factors, trust_report) in ExtractedScholarshipData so confirmScoutScholarship can build full ScholarshipMetadata.

**Rationale**: Same Tavily API; different query strategy. Scout bypasses profile-based query generation; uses user-provided URL or name directly.

---

### 12. Scout Run Orchestration (POST /api/scout/process)

**Decision**: Use **direct invocation** of `manual_research_node` from the API route for MVP. Flow: (1) API creates scout_run row with step=searching_sources; (2) API awaits `manual_research_node(scoutInput)`; (3) Node updates scout_runs step/result; (4) API returns run_id. Client polls status. No Inngest or background job for MVP—keeps latency predictable and simplifies debugging.

**Rationale**: Scout runs are user-initiated and typically 10–60 seconds. Direct call fits Vercel serverless timeout (10s default, 60s pro). If timeout becomes an issue, add Inngest function as Phase 2.
