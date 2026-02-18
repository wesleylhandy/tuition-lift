"use client";

import { useState } from "react";
import { Step1Form } from "./step1-form";
import { Step2Form } from "./step2-form";

type Step = 1 | 2 | 3;

/**
 * OnboardWizard — 3-step onboarding shell (Identity → Academic Profile → Financial Pulse).
 * Per spec FR-010: 450px max-width, centered card, mobile-friendly.
 * T012, T016, T020 add Step1Form, Step2Form, Step3Form; T024 adds ProgressBar.
 * Step advancement via form success in T013, T017, T021.
 */
export function OnboardWizard() {
  const [step, setStep] = useState<Step>(1);

  return (
    <div
      className="mx-auto w-full max-w-[450px] rounded-lg border bg-card p-6 shadow-md"
      aria-label="Quick onboarder wizard"
      role="region"
    >
      <h2 className="sr-only">Get Started</h2>

      {step === 1 && (
        <Step1Form onSuccess={() => setStep(2)} />
      )}
      {step === 2 && (
        <Step2Form onSuccess={() => setStep(3)} />
      )}
      {step === 3 && (
        <div data-step={3}>
          <p className="text-muted-foreground">Step 3 — Financial Pulse (placeholder)</p>
        </div>
      )}
    </div>
  );
}
