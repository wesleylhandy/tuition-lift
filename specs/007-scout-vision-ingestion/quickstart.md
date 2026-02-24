# Scout Vision Ingestion — Quickstart

**Branch**: `007-scout-vision-ingestion` | **Date**: 2025-02-18

## Prerequisites

- Node 18+, pnpm
- Supabase project (local or hosted)
- OpenAI API key (for Vision extraction)
- Env: `OPENAI_API_KEY`, `DATABASE_URL`, Supabase keys

## Setup

1. **Install deps**:
   ```bash
   pnpm install
   ```

2. **Add Scout deps** (per plan):
   ```bash
   pnpm add pdf-parse fuzzball --filter apps/agent
   ```

3. **Create Storage bucket** (Supabase Dashboard or SQL):
   - Bucket: `scout_uploads`, private
   - RLS policies per data-model.md §3

4. **Run migration** (if using scout_runs table):
   ```bash
   pnpm db:push --filter @repo/db
   ```

5. **Optional env**:
   - `SCOUT_MAX_FILE_SIZE_MB=10`
   - `SCOUT_DEDUP_SIMILARITY_THRESHOLD=0.85`
   - `SCOUT_VISION_MODEL=gpt-4o`

## Verification

### Manual: Add by URL

1. Open dashboard; click "Add Scholarship" (or equivalent CTA).
2. Enter a scholarship URL (e.g., `https://example.edu/scholarship`).
3. Submit; observe processing HUD (steps: Searching → Trust Score).
4. Verify form appears with extracted data.
5. Edit if needed; click Confirm.
6. Check Application Tracker for new entry.

### Manual: Add by File

1. Open Scout modal; drag a PDF or image with scholarship info.
2. Upload; observe "Reading Document" step.
3. Verify extraction; confirm.
4. Check applications table.

### Unit: Fuzzy Dedup

- Input: title "Coca-Cola Scholars Program"
- Existing: "Coca-Cola Scholars Program" (exact) → duplicate
- Existing: "Coca Cola Foundation Scholarship" (high similarity) → duplicate warning
- Existing: "Pepsi Scholarship" → no duplicate

## Key Paths

| Artifact       | Path |
|----------------|------|
| Scout API      | `apps/web/app/api/scout/process/route.ts`, `status/[runId]/route.ts` |
| Server Actions | `apps/web/lib/actions/scout.ts` (upload, confirm) |
| Scout UI       | `apps/web/components/dashboard/scout/*` |
| Agent node     | `apps/agent/lib/nodes/manual-research.ts` (or Scout subgraph) |
| Extraction     | `apps/agent/lib/scout/extract-vision.ts`, `extract-pdf.ts` |
