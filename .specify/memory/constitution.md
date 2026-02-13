<!--
  Sync Impact Report
  Version change: (none) → 1.0.0
  Modified principles: N/A (initial constitution)
  Added sections: 1–8 (Core Mission, Dual-Persona, Technical Standards, Security, Development Workflow, UX/UI, Forbidden Patterns, Data Integrity), Governance
  Removed sections: Template placeholders [PRINCIPLE_1–5], [SECTION_2_NAME], [SECTION_3_NAME]
  Templates: plan-template.md ✅ (Constitution Check gate updated); spec-template.md ✅ (no mandatory section changes); tasks-template.md ✅ (principle-driven task types compatible)
  Commands: .specify/templates/commands/*.md not present in repo — N/A
  Follow-up TODOs: None
-->

# TuitionLift Constitution

## 1. Core Mission

To empower students to fund their higher education debt-free by providing a high-standard, safe, and verified scholarship discovery and management system.

**Rationale:** The product MUST be judged by its impact on debt-free outcomes and the safety/verification bar; all features and technical choices serve this mission.

## 2. The Dual-Persona Protocol

Every AI interaction MUST adhere to one of two personas:

- **The Professional Advisor:** Data-driven, analytical, and formal. Focused on "The Search" and "Verification." Accuracy is non-negotiable.
- **The Encouraging Coach:** Motivational, action-oriented, and clear. Focused on "The Execution" and "Prioritization."

**Rationale:** Clear persona boundaries prevent mixed signals and keep search/verification rigorous while execution support remains motivating.

## 3. Technical Standards (The "High Standards")

- **Framework:** Next.js 16+ (App Router) with React 19.
- **Styling:** Tailwind CSS + Shadcn/ui. Minimalist, professional "Edu-tech" aesthetic.
- **State Management:** LangGraph for agentic loops (search/verify).
- **Persistence:** Supabase (PostgreSQL). Use Row Level Security (RLS) for ALL tables.
- **Architecture:**
  - **Separation of Concerns:** Agent logic (LangGraph) MUST be kept separate from UI components.
  - **Server-First:** All API keys and sensitive logic MUST reside in Server Components or Server Actions. Use `server-only`.

**Rationale:** Consistency in stack and boundaries ensures maintainability, security, and a single "Edu-tech" identity.

## 4. Security & Safety (PII Guardrails)

- **PII Scrubbing:** No raw student names or addresses MAY be sent to third-party LLM APIs. Use placeholders (e.g., `{{USER_CITY}}`) during the "Advisor" search.
- **Verification Rule:** Every scholarship found MUST pass a "Trust Filter" (domain check for .edu/.gov, date verification for 2026/2027 cycle).
- **No Data Brokering:** The system MUST NOT be designed to sell or expose user data.

**Rationale:** Student trust and regulatory safety require strict PII handling and source verification; data is never a product.

## 5. Development Workflow (Spec-Kit SDD)

- **Documentation First:** Code MUST NOT be written without a spec (`/specify`) and a plan (`/plan`).
- **Separation of WHAT and HOW:**
  - `spec.md` = Functional requirements (no tech stack mentioned).
  - `plan.md` = Technical implementation (frameworks, DB schema, API routes).
- **Atomic Tasks:** Plans MUST be broken into small, testable units. Tasks MUST be marked as `[x] done` once verified.

**Rationale:** Spec-first and what/how separation reduce rework and keep requirements traceable.

## 6. UX/UI Principles

- **Simplicity over Complexity:** If a feature is not essential for the "Search → Verify → Apply" loop, it MUST be deferred post-MVP.
- **Accessibility:** All components MUST meet WCAG 2.1 AA standards.
- **Performance:** Maintain a Lighthouse score of 90+ for Performance and Best Practices.

**Rationale:** Focus on the core loop and inclusive, fast UX ensures the product stays usable and trustworthy.

## 7. Forbidden Patterns (Anti-Goals)

- **Zero Inline Styles:** All styling MUST use Tailwind utility classes or Shadcn primitives.
- **No Floating Promises:** All async calls in LangGraph MUST be awaited and wrapped in error boundaries.
- **No Mock Data in Production:** All components MUST handle "Loading" and "Empty" states gracefully without hardcoded strings.

**Rationale:** These rules prevent style drift, silent failures, and misleading production UX.

## 8. Data Integrity & Verification

- **The .edu/.gov Priority:** The Advisor MUST weight institutional (.edu) and federal/state (.gov) sources at 2× the priority of .org sources.
- **Strict Cycle Checks:** If a scholarship page references a year earlier than 2026, it MUST be flagged as "Potentially Expired" rather than "Active."

**Rationale:** Prioritizing authoritative sources and strict cycle checks protects students from outdated or low-trust listings.

## Governance

- This constitution supersedes ad-hoc practices for the TuitionLift project. All feature specs and implementation plans MUST pass a Constitution Check before Phase 0 research and again after Phase 1 design.
- **Amendments:** Changes require documentation of the change, rationale, and impact on existing specs/plans. Version MUST be incremented per semantic versioning (MAJOR: backward-incompatible principle removals/redefinitions; MINOR: new principle or material expansion; PATCH: clarifications, typos, non-semantic refinements).
- **Compliance:** PRs and reviews MUST verify alignment with the principles above. Exceptions (e.g., complexity or new patterns) MUST be justified in the plan's Complexity Tracking table.

**Version**: 1.0.0 | **Ratified**: 2025-02-13 | **Last Amended**: 2025-02-13
