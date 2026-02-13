<!--
  Sync Impact Report (v1.2.0)
  Version change: 1.1.0 → 1.2.0
  Modified principles: Added Section 9 (Documentation Protocol)
  Change type: New principle—doc references, App Router only, Zod/Supabase/LangGraph conventions
  Templates: plan-template.md ✅ (Documentation Protocol gates added to Constitution Check)
  Follow-up TODOs: None
-->

# TuitionLift Constitution

## 1. Core Mission

To empower students to fund their higher education debt-free by providing a high-standard, safe, and verified scholarship discovery and management system.

**Rationale:** The product MUST be judged by its impact on debt-free outcomes and the safety/verification bar; all features and technical choices serve this mission.

## 2. The Dual-Persona Protocol

Every user-facing AI interaction that influences search, verification, or application guidance MUST adhere to one of two personas:

- **The Professional Advisor (The Brain):**
  - **Role:** Deep research, financial analysis, and source verification.
  - **Vibe:** Professional, academic, and highly accurate.
  - **Task:** Uses "Just-in-Time" validation to verify scholarship deadlines and filters out scam/data-harvesting sites.
- **The Encouraging Coach (The Heart):**
  - **Role:** Execution, prioritization, and motivational accountability.
  - **Vibe:** Supportive, energetic, and clear.
  - **Task:** Sends daily/weekly "Morning Game Plans" via email (default) or choice of SMS, breaking long applications into small, actionable milestones.

**Rationale:** Clear persona boundaries prevent mixed signals and keep search/verification rigorous while execution support remains motivating.

## 3. Technical Standards (The "High Standards")

- **Framework:** Next.js latest (App Router) with React latest. All dependencies MUST be kept at latest stable versions and MUST NOT introduce HIGH or CRITICAL CVEs.
- **Styling:** Tailwind CSS + Shadcn/ui. Minimalist, professional "Edu-tech" aesthetic.
- **State Management:** LangGraph for agentic loops (search/verify).
- **Persistence:** Supabase (PostgreSQL). Use Row Level Security (RLS) for ALL tables.
- **Architecture:**
  - **Separation of Concerns:** Agent logic (LangGraph) MUST be kept separate from UI components.
  - **Server-First:** All API keys and sensitive logic MUST reside in Server Components or Server Actions. Use `server-only`.

**Rationale:** Consistency in stack and boundaries ensures maintainability, security, and a single "Edu-tech" identity.

## 4. Security & Safety (PII Guardrails)

- **PII Scrubbing:** Raw student names or addresses MUST NOT be sent to third-party LLM APIs. Use placeholders (e.g., `{{USER_CITY}}`) during the Professional Advisor search.
- **Verification Rule:** Every scholarship found MUST pass a Trust Filter before inclusion. The Trust Filter consists of: (a) domain check (.edu/.gov preferred; .org allowed but deprioritized per Section 8), and (b) dynamic date verification based on current date and academic year. Scholarships with due dates in the past MUST NOT appear as "Active"; scholarships with due dates after today MAY appear as "Active" if they align with the current or upcoming academic term. Scholarships failing either check MUST NOT appear as "Active."
- **No Data Brokering:** The system MUST NOT be designed to sell or expose user data.

**Rationale:** Student trust and regulatory safety require strict PII handling and source verification; data is never a product.

## 5. Development Workflow (Spec-Kit SDD)

- **Documentation First:** Code MUST NOT be written without a spec (`/specify`) and a plan (`/plan`) produced via the Spec-Kit workflow.
- **Separation of WHAT and HOW:**
  - `spec.md` = Functional requirements (no tech stack mentioned).
  - `plan.md` = Technical implementation (frameworks, DB schema, API routes).
- **Atomic Tasks:** Plans MUST be broken into small, testable units. Tasks MUST be marked as `[x] done` once verified.

**Rationale:** Spec-first and what/how separation reduce rework and keep requirements traceable.

## 6. UX/UI Principles

- **Simplicity over Complexity:** If a feature is not essential for the "Search → Verify → Apply" loop, it MUST be deferred post-MVP.
- **Accessibility:** All components MUST meet WCAG 2.1 AA standards.
- **Performance:** Critical user paths (search, verify, apply) MUST achieve Lighthouse Performance and Best Practices scores of 90+ each, verified in pre-release checks.

**Rationale:** Focus on the core loop and inclusive, fast UX ensures the product stays usable and trustworthy.

## 7. Forbidden Patterns (Anti-Goals)

- **Zero Inline Styles:** All styling MUST use Tailwind utility classes or Shadcn primitives.
- **No Floating Promises:** All async calls in LangGraph MUST be awaited and wrapped in error boundaries.
- **No Mock Data in Production:** All components MUST handle "Loading" and "Empty" states gracefully without hardcoded mock or sample data.

**Rationale:** These rules prevent style drift, silent failures, and misleading production UX.

## 8. Data Integrity & Verification

*These rules define ranking and cycle logic within the Trust Filter (Section 4).*

- **The .edu/.gov Priority:** The Professional Advisor MUST weight institutional (.edu) and federal/state (.gov) sources at 2× the priority of .org sources.
- **Dynamic Cycle Checks:** The system MUST NOT hardcode academic years. Cycle and due-date logic MUST be computed dynamically from the current date and the current/upcoming academic year. A scholarship MUST be considered "Active" only if its due date is after today and aligns with the current or upcoming academic term. Example: for the 2026/2027 academic year, due dates in 2025 are already past and thus NOT active; due dates after today ARE active. Scholarships with past due dates MUST be flagged as "Potentially Expired."

**Rationale:** Prioritizing authoritative sources and dynamic cycle checks protects students from outdated or low-trust listings without requiring yearly constitution updates.

## 9. Documentation Protocol

- **Strict Adherence:** All implementation plans (`/speckit.plan`) MUST reference the official documentation for technologies prescribed in this constitution.
- **Next.js App Router Standard:** Strictly use App Router conventions. The `pages/` directory MUST NOT be used. React 19 features (e.g., `useActionState`) MUST be used where applicable.
- **Type Safety:** Schema validation MUST use **Zod** per its official documentation. Database interactions MUST use **Supabase**-generated types.
- **Agent Orchestration:** LangGraph usage MUST follow **LangGraph JS** documentation for state and persistence. Checkpoints MUST be used to save agent progress in Supabase.

**Rationale:** Consistent reference to authoritative documentation reduces drift, enables correct feature usage, and ensures agent state is durable across sessions.

## Governance

- This constitution supersedes ad-hoc practices for the TuitionLift project. All feature specs and implementation plans MUST pass a Constitution Check before Phase 0 research and again upon completion of Phase 1 design (before Phase 2 implementation).
- **Amendments:** Changes require documentation of the change, rationale, and impact on existing specs/plans. Version MUST be incremented per semantic versioning (MAJOR: backward-incompatible principle removals/redefinitions; MINOR: new principle or material expansion; PATCH: clarifications, typos, non-semantic refinements).
- **Compliance:** PRs and reviews MUST verify alignment with the principles above. Exceptions (e.g., complexity or new patterns) MUST be justified in the plan's Complexity Tracking table.

**Version**: 1.2.0 | **Ratified**: 2025-02-13 | **Last Amended**: 2025-02-13
