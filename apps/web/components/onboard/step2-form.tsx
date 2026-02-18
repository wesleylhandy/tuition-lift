"use client";

/**
 * Step2Form — Academic Profile Intake.
 * intended_major (required), state (required), full_name (optional),
 * gpa_weighted and gpa_unweighted (optional; validate only when provided).
 * Per FR-005 (Coach tip), FR-008 (validation), FR-014 (skeleton, block duplicate submit).
 */

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { saveAcademicProfile } from "@/lib/actions/onboarding";
import { US_STATES } from "@/lib/constants/us-states";

const COACH_TIP =
  "Tell us about your academic goals. This helps us find scholarships that fit your profile.";

export interface Step2FormProps {
  onSuccess: () => void;
}

const INPUT_CLASS =
  "min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

function FormFieldsWithStatus({ error }: { error: string | null }) {
  const { pending } = useFormStatus();

  return (
    <>
      <div>
        <label htmlFor="step2-intended-major" className="mb-1 block text-sm font-medium">
          Intended major
        </label>
        <input
          id="step2-intended-major"
          name="intended_major"
          type="text"
          required
          autoComplete="organization"
          disabled={pending}
          className={INPUT_CLASS}
          placeholder="e.g. Computer Science"
          maxLength={200}
          aria-describedby={error ? "step2-error" : undefined}
          aria-invalid={!!error}
        />
      </div>
      <div>
        <label htmlFor="step2-state" className="mb-1 block text-sm font-medium">
          State
        </label>
        <select
          id="step2-state"
          name="state"
          required
          disabled={pending}
          className={INPUT_CLASS}
          aria-describedby={error ? "step2-error" : undefined}
          aria-invalid={!!error}
        >
          <option value="">Select your state</option>
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="step2-full-name" className="mb-1 block text-sm font-medium">
          Full name <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          id="step2-full-name"
          name="full_name"
          type="text"
          autoComplete="name"
          disabled={pending}
          className={INPUT_CLASS}
          placeholder="Your name"
          aria-describedby={error ? "step2-error" : undefined}
          aria-invalid={!!error}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="step2-gpa-weighted" className="mb-1 block text-sm font-medium">
            Weighted GPA <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            id="step2-gpa-weighted"
            name="gpa_weighted"
            type="number"
            min={0}
            max={6}
            step={0.01}
            disabled={pending}
            className={INPUT_CLASS}
            placeholder="0–6"
            aria-describedby="step2-gpa-weighted-hint"
          />
          <p id="step2-gpa-weighted-hint" className="mt-1 text-xs text-muted-foreground">
            On a 0–6 scale
          </p>
        </div>
        <div>
          <label htmlFor="step2-gpa-unweighted" className="mb-1 block text-sm font-medium">
            Unweighted GPA <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            id="step2-gpa-unweighted"
            name="gpa_unweighted"
            type="number"
            min={0}
            max={4}
            step={0.01}
            disabled={pending}
            className={INPUT_CLASS}
            placeholder="0–4"
            aria-describedby="step2-gpa-unweighted-hint"
          />
          <p id="step2-gpa-unweighted-hint" className="mt-1 text-xs text-muted-foreground">
            On a 0–4 scale
          </p>
        </div>
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
          Saving…
        </span>
      ) : (
        "Continue"
      )}
    </button>
  );
}

export function Step2Form({ onSuccess }: Step2FormProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await saveAcademicProfile(formData);
    if (result.success) {
      onSuccess();
    } else {
      setError(result.error ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <div data-step={2}>
      <p className="mb-4 text-sm text-muted-foreground" role="status">
        {COACH_TIP}
      </p>
      <form action={handleSubmit} className="space-y-4">
        <FormFieldsWithStatus error={error} />
        {error && (
          <p id="step2-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <SubmitButton />
      </form>
    </div>
  );
}
