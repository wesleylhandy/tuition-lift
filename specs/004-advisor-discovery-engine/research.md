# Research: Advisor Discovery Engine

**Branch**: `004-advisor-discovery-engine` | **Date**: 2025-02-13  
**Spec**: [spec.md](./spec.md)

## Resolved Technical Decisions

### 1. Deep Web Search: Tavily API

**Decision**: Use Tavily Search API (`POST https://api.tavily.com/search`) as the external search provider. Configure `search_depth: "advanced"` for scholarship discovery (highest relevance; 2 API credits per request). Use `topic: "general"`, `max_results: 10` per query. Set `include_answer: false` to reduce latency and cost; use `time_range` or `start_date`/`end_date` to bias toward 2026/2027 cycle content.

**Rationale**: Spec FR-004 requires "deep web searches focusing on current and upcoming scholarship cycles." Tavily is designed for AI agents and LLMs; supports REST API with Bearer auth; has search depth options; returns `title`, `url`, `content`, `score` per result. Widely adopted; LangChain integration exists. Constitution permits third-party search; spec leaves "exact search provider" to implementation.

**Alternatives considered**:
- Serper/Google Custom Search: Rate limits, quota costs.
- Bing Search API: Similar tradeoffs; Tavily optimized for AI agents.
- Direct crawling: Too slow; violates rate-limit expectations.

**Reference**: [Tavily Search API](https://docs.tavily.com/documentation/api-reference/endpoint/search), [Tavily Introduction](https://docs.tavily.com/api-reference/introduction)

---

### 2. Query Generation: LLM (3–5 distinct queries)

**Decision**: Use an LLM (via LangChain/LangGraph) to transform `user_profile` (GPA, major, SAI brackets) into 3–5 distinct search queries. Input: anonymized attributes only (no name, SSN). Output: array of query strings. Example prompts: "Generate 3–5 distinct search queries for scholarships matching: GPA {{gpa}}, major {{major}}, financial profile {{brackets}}. Focus on need-based, Last-Dollar, 2026/2027 cycle."

**Rationale**: FR-001 requires transforming profile into 3–5 distinct queries; LLM can produce varied, relevant queries from structured input. Use same LLM provider as rest of agent stack (e.g., OpenAI, Anthropic) for consistency.

**Alternatives considered**:
- Template-based: Less flexible; harder to cover diverse majors and aid profiles.
- Rule-based keyword expansion: Brittle; LLM handles nuance (e.g., "Pell Eligible" + "Engineering" → multiple query angles).

---

### 3. Site Longevity for Trust Scoring

**Decision**: Use domain registration age as a proxy for "site longevity." Query WHOIS via a lightweight API (e.g., `whois-json` npm package or a hosted WHOIS API) to get `creationDate`; map age in years to a 0–25 point contribution to trust score. Fallback: if WHOIS unavailable, assign midpoint (12 points) to avoid penalizing `.edu`/`.gov` with unknown age. Do not block discovery on WHOIS failures.

**Rationale**: FR-007 requires "site longevity" as a trust factor. Domain registration age is publicly available and correlates with legitimacy. Constitution §10 tiers: .edu/.gov = High Trust (80–100); longevity augments domain-tier score. Keeping it non-blocking avoids discovery failures.

**Alternatives considered**:
- First-seen in our system: Not available for newly discovered scholarships.
- Alexa/SimilarWeb rank: Requires third-party subscription; overkill for MVP.
- Skip longevity: Would weaken multi-factor model; spec explicitly requires it.

---

### 4. Checkpointing: PostgresSaver (Supabase)

**Decision**: Use `@langchain/langgraph-checkpoint-postgres` with `PostgresSaver` connected to Supabase via `DATABASE_URL`, per Orchestration spec (003). Checkpoint occurs after Advisor_Search (Scout) node; Advisor_Verify runs in a separate node so checkpoint is written between Scout and Verify.

**Rationale**: FR-013 requires checkpoint after Scout phase. 003 research already established PostgresSaver with Supabase; no custom `@skroyc/langgraph-supabase-checkpointer` needed (not on npm). Alignment with orchestration is mandatory.

**Reference**: [003 research.md](../003-langgraph-orchestration/research.md), [LangGraph Persistence](https://langchain-ai.github.io/langgraphjs/how-tos/persistence/)

---

### 5. Rate Limiting: Configurable Delay

**Decision**: Implement rate limiting as a configurable minimum delay (default 2 seconds) between search batches. Store in env: `DISCOVERY_SEARCH_BATCH_DELAY_MS` (default 2000). Between each Tavily API call in a batch (or between batches of parallel calls), await `delay(parseInt(process.env.DISCOVERY_SEARCH_BATCH_DELAY_MS ?? "2000"))`.

**Rationale**: FR-014 requires configurable delay; default 2 seconds per spec clarification. Tavily returns 429 on rate limit; config allows tuning for external limits.

---

### 6. Scholarships Schema: metadata JSONB, Multi-Category

**Decision**: Add `metadata` JSONB column to `scholarships` table (002 alignment). Store: `{ source_url, snippet, scoring_factors: { domain_tier, longevity_score, fee_check }, trust_report }`. Change `category` from single enum to `categories scholarship_category[]` (PostgreSQL array of enum) to support multiple categories per scholarship (FR-016a).

**Rationale**: FR-016 requires search metadata; FR-016a requires multiple categories. JSONB is queryable and flexible; array of enum preserves type safety. Migration must be additive per 002 backward-compatibility rules.

**Schema delta** (for 002 migration):
- `scholarships.metadata` JSONB nullable
- `scholarships.category` → `scholarships.categories scholarship_category[]` (add new column; deprecate old in separate step if needed, or rename in single migration with default)

**Simpler alternative**: Keep `category` as single enum; store additional categories in `metadata.categories: string[]`. Allows multi-category without schema change to enum column. Chosen for MVP: `metadata.categories` array, keep `category` as primary for indexing.

---

### 7. Manual Review Queue

**Decision**: Add `verification_status` to discovery result schema and scholarship metadata: `verified` | `ambiguous_deadline` | `needs_manual_review`. Results with `ambiguous_deadline` or `needs_manual_review` are written to scholarships with `metadata.verification_status` and included in a queryable set (e.g., `WHERE metadata->>'verification_status' = 'needs_manual_review'`). No reviewer UI or actions; "routing" = writing with status for future workflow.

**Rationale**: Spec clarification: "Flag and route only; no reviewer UI." Writing status to metadata enables filtering and future triage feature without building it now.

---

### 8. Upsert by URL

**Decision**: When persisting to `scholarships`, use `INSERT ... ON CONFLICT (url) DO UPDATE` (requires UNIQUE constraint on `url`). If `url` is nullable, use partial unique index on `WHERE url IS NOT NULL`. Update: `trust_score`, `metadata`, `categories` (or `metadata.categories`), `updated_at`. Preserve `id` on conflict.

**Rationale**: FR-015 requires upsert when same URL exists. PostgreSQL `ON CONFLICT` is standard; need migration to add UNIQUE(url) or equivalent.

**Note**: 002 scholarships has `url` nullable; add `UNIQUE(url)` only where `url IS NOT NULL` (multiple nulls allowed).

---

### 9. Deduplication Within Run

**Decision**: After collecting raw results from all queries, deduplicate by URL before verification. Use a `Map<url, result>`; when duplicate found, merge: keep highest `trust_score`, concatenate snippets, merge scoring factors. Single pass; O(n) by URL.

**Rationale**: FR-006a requires deduplication; merge metadata and use highest trust score when conflicting.
