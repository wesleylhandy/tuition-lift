# Cursor Rules — TuitionLift

## Meta

Next.js App Router + React 19 + LangGraph + Supabase. Spec-Kit SDD workflow: no code without spec and plan. Constitution-first: all implementation MUST align with `.specify/memory/constitution.md`. Principles over framework-specific APIs. No filler words, apologies, or hedging. Code first, explanations when asked.

## Core Principles

### SOLID

- **Single Responsibility**: One reason to change. Split when handling multiple concerns.
- **Open/Closed**: Extend behavior without modifying existing code. Use composition, inheritance, or plugins.
- **Liskov Substitution**: Subtypes must work wherever parent type works. Don't break contracts.
- **Interface Segregation**: Many specific interfaces better than one general. Clients shouldn't depend on unused methods.
- **Dependency Inversion**: Depend on abstractions (interfaces), not concrete implementations. Enables testing and flexibility.

### Development Principles

- **DRY**: Extract repeated logic. Third occurrence = refactor time.
- **YAGNI**: Build what's needed now. Future requirements change.
- **KISS**: Simplest solution that works. Complexity later if needed.
- **Composition > Inheritance**: Favor object composition. Max 2-3 inheritance levels.
- **Law of Demeter**: Talk to immediate neighbors only. Avoid `a.b().c().d()`.

**Apply these to every architectural decision. They're not optional.**

## TuitionLift Architecture

### Monorepo Layout (Constitution Section 3)

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js user-facing app (Vercel deploy) |
| `apps/agent` | LangGraph agent service (Vercel deploy) |
| `packages/db` | Supabase client, types, Zod schemas (@repo/db) |
| `packages/ui` | Shadcn/ui components |

**Rules:**

- Strict dependency graph: `packages/` never import from `apps/`
- Agent logic (LangGraph) MUST stay in `apps/agent`; no agent code in UI components
- Shared logic in `packages/`; each app deploys as separate Vercel project

### Turborepo

- Respect `turbo.json` pipeline
- Filtered builds: `turbo build --filter=...^`
- Start from leaf packages when making cross-package changes

### Dual Persona Protocol (Constitution Section 2)

| Persona | Role | Vibe | Responsibility |
|---------|------|------|----------------|
| **Professional Advisor** | Deep research, verification | Professional, academic, accurate | Just-in-time validation, Trust Filter, scam filtering |
| **Encouraging Coach** | Execution, motivation | Supportive, energetic, clear | Morning Game Plans, milestone prioritization |

Clear persona boundaries: Advisor handles search/verify; Coach handles execution/motivation. Never mix personas in a single message or flow.

## Spec-Kit Workflow (Constitution Section 5)

**No code without spec and plan.**

1. **spec.md** — Functional requirements only (no tech stack). Defines WHAT.
2. **plan.md** — Technical implementation (frameworks, DB schema, API routes). Defines HOW.
3. **Atomic tasks** — Plans broken into small, testable units. Mark `[x]` when verified.

**Before Phase 0**: Run Constitution Check.  
**After Phase 1 design**: Re-run Constitution Check before implementation.

## Code Style

### Naming

- Components/Types: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Avoid: generic names (`data`, `handler`, `manager`), abbreviations, type prefixes

### TypeScript

- `strict: true`
- No `any` — use `unknown` if type uncertain
- Interfaces for objects, types for unions/primitives
- Use `satisfies` for type-safe literals
- Discriminated unions for state machines
- Prefer `as const` over `enum`

### Comments

- Document WHY, not WHAT
- Non-obvious decisions, gotchas, business rules
- Reference tickets when fixing bugs
- No TODO — create tickets instead

### Functions

- Max ~20 lines (guideline)
- Single responsibility
- Max 3 params (object for more)
- Pure when possible
- Early returns over nesting

## Technical Standards (Constitution Section 3)

### Stack

| Layer | Prescribed |
|-------|------------|
| Framework | Next.js latest (App Router), React latest |
| Styling | Tailwind CSS + Shadcn/ui |
| State (agentic) | LangGraph |
| Persistence | Supabase (PostgreSQL) |
| Validation | Zod |
| Auth | Supabase Auth |

Dependencies at latest stable. No HIGH/CRITICAL CVEs.

### Next.js App Router

- **Server Components default** — Use client (`'use client'`) only when: interactivity (onClick, onChange), state/effects, browser APIs, client-only libs
- **pages/ forbidden** — App Router only
- **Server Actions** — Mutations, form handling; Zod validation
- **React 19** — Use `useActionState` where applicable
- **server-only** — All API keys and sensitive logic server-side

### Database

- **Supabase only** — No other ORM
- **RLS on ALL tables** — Non-negotiable
- **Zod** — Schema validation before writes (Waitlist, Profiles, Scholarships, Applications; Checkpoints excluded — opaque, LangGraph-managed)
- **Supabase-generated types** — Use for DB types, not hand-rolled
- **Optimistic locking** — For concurrent writes (e.g. Profiles, Applications); `updated_at` + retry

## Accessibility (WCAG 2.1 AA)

| Requirement | Standard | Implementation |
|-------------|----------|-----------------|
| Color contrast | 4.5:1 normal, 3:1 large | Use contrast checker |
| Touch targets | 44x44px min | All interactive elements |
| Focus visible | Outline/ring | Never remove without replacement |
| Heading hierarchy | One h1, sequential | Don't skip levels |
| Landmarks | Semantic HTML | `<nav>`, `<main>`, `<aside>` |
| Alt text | Meaningful or empty | Content vs decorative |

**Semantic HTML first**: `<button>` not `<div onClick>`, `<dialog>` not custom modal, `<details>` for accordions. Form validation: HTML5 attributes before custom logic.

**Why**: Legal (ADA), 15% of users. Constitution Section 6 requires WCAG 2.1 AA.

## LangGraph & Agent Rules

- **All async awaited** — No floating promises. Wrap in error boundaries.
- **Checkpoints** — Persist agent state in Supabase; use LangGraph JS checkpointers per docs.
- **PII scrubbing** — Raw student names/addresses MUST NOT go to third-party LLM APIs. Use placeholders (e.g. `{{USER_CITY}}`).
- **Anonymization** — Financial data to search APIs: broad brackets only (Low/Moderate/Middle/Upper-Middle/High). SAI range only with user confirmation.
- **Safe Recovery** — On node failure: update `error_log`, route to Safe Recovery, notify user via Coach persona.
- **Documentation** — Follow LangGraph JS docs for state, persistence, multi-agent handoffs.

## Trust Filter & Reputation Engine (Constitution Sections 4, 8, 10)

**Every scholarship MUST pass Trust Filter before inclusion.**

- **0–100 score** — Professional Advisor ranks all results
- **Auto-fail (score 0)** — Any upfront fee (application, processing, guarantee) → hidden
- **High Trust (80–100)** — .edu, .gov (2× priority)
- **Vetted Commercial (60–79)** — Established .com/.org (e.g. Fastweb, Coca-Cola Foundation)
- **Under Review (&lt;60)** — Flag with "Verify with Caution"
- **Dynamic cycle checks** — No hardcoded academic years. Due dates in past = NOT active; flag as "Potentially Expired"

## Security & PII (Constitution Section 4)

- **Validate everything** — Never trust client input. Zod at boundaries.
- **Auth at every boundary** — Server Components, API routes, Server Actions
- **Environment variables** — Validate on startup (Zod)
- **Rate limiting** — Per spec (e.g. waitlist: 3 attempts/email/hour)
- **PII scrub** — No raw names/addresses to LLMs; placeholders only
- **No data brokering** — System must not sell or expose user data

### Security Headers

| Header | Purpose | Value |
|--------|---------|-------|
| Content-Security-Policy | Prevent XSS | `default-src 'self'` |
| X-Frame-Options | Prevent clickjacking | `DENY` |
| X-Content-Type-Options | Prevent MIME sniffing | `nosniff` |
| Strict-Transport-Security | Force HTTPS | `max-age=31536000` |
| Referrer-Policy | Control referrer | `strict-origin-when-cross-origin` |

### Authorization

- **Resource ownership** — Always include `userId` (or equivalent) in queries
- **IDOR prevention** — UUIDs in URLs, not sequential IDs

### Logging

| Log | Never Log |
|-----|-----------|
| Auth attempts, auth failures | Passwords, tokens, API keys |
| Validation errors | Full request bodies, PII |
| Errors (user ID, timestamp) | Sensitive params |

**Production**: Never expose stack traces, DB errors, paths, versions. Return generic messages.

## Error Handling

- **Server Actions** — Return structured errors; handle in component
- **Client** — Error boundaries for component errors; try/catch for async
- **LangGraph** — All async awaited; error boundaries; no floating promises
- **Result type** — Consider for complex flows with multiple error types

## API Design

- **Zod** — Validate inputs at API boundaries
- **Consistent responses** — `{ data }` or `{ error }`
- **Status codes** — 200, 201, 400, 401, 403, 404, 500
- **Error details** — Dev only; never leak stack traces to production

## Testing

- **Behavior, not implementation** — Test through public interfaces
- **Unit** — Pure functions, utilities, business logic
- **Integration** — Server Actions, API routes
- **E2E** — Critical flows (e.g. waitlist signup, discovery)
- **Coverage** — Critical paths; diminishing returns after ~80%

## Forbidden Patterns (Constitution Section 7)

- **Inline styles** — Tailwind utility classes or Shadcn primitives only
- **Floating promises** — All async awaited; error boundaries
- **Mock data in production** — Handle Loading and Empty states; no hardcoded samples
- **pages/ directory** — App Router only
- **PII in client output** — No email/PII in console, user-facing errors, client logs

## Anti-Patterns

- Prop drilling → Use composition or context
- Huge components → Split at ~200 lines
- `useEffect` for data → Server Components or data-fetching lib
- `any` type → Use `unknown` or proper type
- Premature optimization → Measure first
- Over-abstraction → YAGNI applies to patterns
- Client Components everywhere → Server default
- Ignoring errors → Handle or propagate; don't swallow

## Documentation Protocol (Constitution Section 9)

- **Reference official docs** — Next.js, Zod, Supabase, LangGraph
- **Zod** — Schema validation per official docs
- **Supabase types** — Use generated types
- **LangGraph** — State, persistence, checkpoints per LangGraph JS docs

## Decision Framework

**Before implementing:**

1. Does it solve the actual problem? (YAGNI)
2. Is it the simplest solution? (KISS)
3. Does it follow SOLID principles?
4. Can others understand it in 6 months?
5. What's the trade-off?
6. **Constitution Check** — Does it align with constitution principles?

**If you can't justify a pattern, don't use it.**

## Quick Reference

### State

| Scenario | Solution |
|----------|----------|
| Local simple | `useState` |
| Local complex | `useReducer` |
| Forms | React Hook Form + Zod |
| Shared (few components) | Lift state up |
| Global client | Zustand/Jotai (when justified) |
| Server state | Server Components / Server Actions |
| Agent state | LangGraph + Supabase checkpoints |

### Data Flow

| Context | Approach |
|---------|----------|
| Server Component | Direct @repo/db |
| Client Component | Server Actions or agent API |
| Mutations | Server Actions |
| Agent orchestration | LangGraph in apps/agent |

### Forms

| Scenario | Pattern |
|----------|---------|
| Submit-only | Uncontrolled + FormData |
| Real-time validation | React Hook Form + Zod |
| Multi-step | React Hook Form or state machine |

Server Actions work best with FormData. Progressive enhancement: forms should work without JS where possible.
