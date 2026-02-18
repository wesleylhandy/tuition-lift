"use client";

/**
 * Step3Form — Financial Pulse Intake.
 * SAI (optional), Pell eligibility (optional); "Finish & Start Discovery" CTA.
 * Per FR-005 (Coach tip), FR-006 (CTA), T020: SAI tooltip explains Student Aid Index.
 */

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { finishOnboarding } from "@/lib/actions/onboarding";

const COACH_TIP =
  "Share your financial profile to help us find need-based scholarships. Both fields are optional—you can add them later.";

const SAI_TOOLTIP =
  "The Student Aid Index (SAI) is a number colleges use to determine your eligibility for federal financial aid. It comes from your FAFSA and ranges from -1500 to 999999.";

const INPUT_CLASS =
  "min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export interface Step3FormProps {
  onSuccess: (discoveryTriggered: boolean) => void;
}

function FormFieldsWithStatus({ error }: { error: string | null }) {
  const { pending } = useFormStatus();

  return (
    <>
      <div>
        <label
          htmlFor="step3-sai"
          className="mb-1 flex items-center gap-2 text-sm font-medium"
        >
          Student Aid Index (SAI){" "}
          <span className="text-muted-foreground">(optional)</span>
          <span
            className="cursor-help text-xs text-muted-foreground underline decoration-dotted hover:no-underline"
            title={SAI_TOOLTIP}
            aria-label="What is SAI? Opens tooltip with explanation"
          >
            What is this?
          </span>
        </label>
        <input
          id="step3-sai"
          name="sai"
          type="number"
          min={-1500}
          max={999999}
          step={1}
          disabled={pending}
          className={INPUT_CLASS}
          placeholder="-1500 to 999999"
          aria-describedby={error ? "step3-error" : "step3-sai-hint"}
          aria-invalid={!!error}
        />
        <p id="step3-sai-hint" className="mt-1 text-xs text-muted-foreground">
          From your FAFSA; leave blank if unknown
        </p>
      </div>
      <div>
        <label
          htmlFor="step3-pell"
          className="mb-1 block text-sm font-medium"
        >
          Pell Grant eligibility{" "}
          <span className="text-muted-foreground">(optional)</span>
        </label>
        <select
          id="step3-pell"
          name="pell_eligibility"
          disabled={pending}
          className={INPUT_CLASS}
          aria-describedby={error ? "step3-error" : undefined}
          aria-invalid={!!error}
        >
          <option value="">Select if known</option>
          <option value="eligible">Eligible</option>
          <option value="ineligible">Ineligible</option>
          <option value="unknown">Unknown</option>
        </select>
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
          Finishing…
        </span>
      ) : (
        "Finish & Start Discovery"
      )}
    </button>
  );
}

export function Step3Form({ onSuccess }: Step3FormProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await finishOnboarding(formData);
    if (result.success) {
      onSuccess(result.discoveryTriggered ?? true);
    } else {
      setError(result.error ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <div data-step={3}>
      <p className="mb-4 text-sm text-muted-foreground" role="status">
        {COACH_TIP}
      </p>
      <form action={handleSubmit} className="space-y-4">
        <FormFieldsWithStatus error={error} />
        {error && (
          <p id="step3-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <SubmitButton />
      </form>
    </div>
  );
}
