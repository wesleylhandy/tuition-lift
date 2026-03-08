"use client";

/**
 * Step0Form — Target Award Year selector (first required step).
 * Range: currentYear..currentYear+4. WCAG 2.1 AA: 44px touch targets, semantic markup.
 * Per 014 US6: Block advancement until selected; award year drives all discovery and applications.
 */

import { useState } from "react";
import { useFormStatus } from "react-dom";

const COACH_TIP =
  "When do you plan to start college? This helps us find scholarships for your timeline.";

const currentYear = new Date().getFullYear();
const AWARD_YEARS = Array.from({ length: 5 }, (_, i) => currentYear + i);

const INPUT_CLASS =
  "min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export interface Step0FormProps {
  onSuccess: (awardYear: number) => void;
  /** When true, form submits to server action to persist award_year (logged-in resume). */
  isLoggedIn?: boolean;
  onSaveAwardYear?: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

function FormFieldsWithStatus({ error }: { error: string | null }) {
  const { pending } = useFormStatus();

  return (
    <>
      <div className="flex flex-col gap-3">
        <label
          htmlFor="step0-award-year"
          className="block text-sm font-medium"
        >
          Target award year <span className="text-destructive">*</span>
        </label>
        <select
          id="step0-award-year"
          name="award_year"
          required
          disabled={pending}
          className={INPUT_CLASS}
          aria-required
          aria-describedby={error ? "step0-error" : "step0-award-year-hint"}
          aria-invalid={!!error}
        >
          <option value="">Select your target year</option>
          {AWARD_YEARS.map((y) => (
            <option key={y} value={y}>
              {y}–{y + 1}
            </option>
          ))}
        </select>
        <p id="step0-award-year-hint" className="text-xs text-muted-foreground">
          Academic year for scholarship applications ({currentYear}–{currentYear + 4})
        </p>
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

export function Step0Form({
  onSuccess,
  isLoggedIn = false,
  onSaveAwardYear,
}: Step0FormProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const raw = formData.get("award_year");
    const year =
      typeof raw === "string" ? parseInt(raw, 10) : typeof raw === "number" ? raw : NaN;

    if (Number.isNaN(year) || year < currentYear || year > currentYear + 4) {
      setError("Please select a valid award year.");
      return;
    }

    if (isLoggedIn && onSaveAwardYear) {
      const result = await onSaveAwardYear(formData);
      if (result.success) {
        onSuccess(year);
      } else {
        setError(result.error ?? "Failed to save. Please try again.");
      }
    } else {
      onSuccess(year);
    }
  }

  return (
    <div data-step={0} className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground" role="status">
        {COACH_TIP}
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <FormFieldsWithStatus error={error} />
        {error && (
          <p id="step0-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <SubmitButton />
      </form>
    </div>
  );
}
