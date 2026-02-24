"use client";

/**
 * Step1Form — Identity (Account Creation).
 * Email and password inputs; form action→signUp; Coach tip; validation errors.
 * Per FR-005 (Coach tip), FR-008 (validation errors), FR-014 (skeleton loading, block duplicate submit).
 */

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { signUp } from "@/lib/actions/onboarding";

const COACH_TIP =
  "Create your account to get started! We'll help you find scholarships that match your profile.";

export interface Step1FormProps {
  onSuccess: () => void;
}

function FormFieldsWithStatus({ error }: { error: string | null }) {
  const { pending } = useFormStatus();
  return (
    <>
      <div className="flex flex-col gap-3">
        <label htmlFor="step1-email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="step1-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={pending}
          className="min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="you@example.com"
          aria-describedby={error ? "step1-error" : undefined}
          aria-invalid={!!error}
        />
      </div>
      <div className="flex flex-col gap-3">
        <label htmlFor="step1-password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="step1-password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          disabled={pending}
          className="min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="At least 8 characters"
          aria-describedby={error ? "step1-error" : undefined}
          aria-invalid={!!error}
        />
      </div>
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[44px] w-full rounded-md bg-electric-mint px-4 py-2 font-medium text-navy transition-colors hover:bg-electric-mint/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span
            className="size-4 animate-spin rounded-full border-2 border-navy border-t-transparent"
            aria-hidden
          />
          Creating account…
        </span>
      ) : (
        "Create account"
      )}
    </button>
  );
}

export function Step1Form({ onSuccess }: Step1FormProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await signUp(formData);
    if (result.success) {
      onSuccess();
    } else {
      setError(result.error ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <div data-step={1} className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground" role="status">
        {COACH_TIP}
      </p>
      <form action={handleSubmit} className="flex flex-col gap-6">
        <FormFieldsWithStatus error={error} />
        {error && (
          <p id="step1-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <SubmitButton />
      </form>
    </div>
  );
}
