# Landing Page Server Actions Contract

**Branch**: 011-landing-marketing-ui | **Date**: 2026-02-24  
**Spec**: [spec.md](../spec.md)

## Purpose

Define Server Actions used by the landing page. All mutations and validations go through Server Actions per Next.js best practices.

---

## 1. Hero Form Submit: `redirectToSignUp`

**File**: `apps/web/lib/actions/landing.ts`

**Behavior**:
1. Accept `FormData` with `email` field.
2. Validate email format via Zod (`emailSchema`).
3. On valid: redirect to `/onboard?email=${encodeURIComponent(email)}` using `redirect()`.
4. On invalid: return `{ error: string }` (user-friendly message; no stack trace).
5. Rate limiting: Enforce 3 attempts per email per hour (same as onboarding); return user-friendly error when limit exceeded.

**Signature**:
```typescript
export async function redirectToSignUp(formData: FormData): Promise<{ error?: string }>
```

**Validation**:
```typescript
const heroEmailSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});
```

**Edge cases**:
- Duplicate email (already registered): Redirect anyway—/onboard will show "Email already registered" or similar on signUp attempt.
- Auth unreachable: Redirect to /onboard; onboard handles error display.
- Rate limit exceeded (3/email/hour): Return `{ error: "Too many attempts. Please try again later." }`.
- Empty/invalid: Return `{ error: "Please enter a valid email address." }`.

---

## 2. Contact Form Submit (Optional / Future)

**File**: `apps/web/lib/actions/landing.ts` or `contact.ts`

**Behavior**: If `/contact` has a form: validate email + message, insert into `contact_submissions` or send via email service. Out of scope for MVP if contact is static "Email us at..." only.

**Decision**: Defer to tasks; document in quickstart if implemented.
