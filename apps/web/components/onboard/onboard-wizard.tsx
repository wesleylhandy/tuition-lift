"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useOnboardInitialStep } from "./onboard-step-provider";
import { ProgressBar } from "./progress-bar";
import { Step1Form } from "./step1-form";
import { Step2Form } from "./step2-form";
import { Step3Form } from "./step3-form";

type Step = 1 | 2 | 3;

/**
 * OnboardWizard — 3-step onboarding shell (Identity → Academic Profile → Financial Pulse).
 * Per spec FR-010: 450px max-width, centered card, mobile-friendly (44px touch targets).
 * T024: ProgressBar shows current step; bar updates when step changes.
 * T028: Resumes at correct step via useOnboardInitialStep when user returns mid-flow.
 */
export function OnboardWizard() {
  const initialStep = useOnboardInitialStep();
  const [step, setStep] = useState<Step>(initialStep);
  const router = useRouter();

  function handleStep3Success(discoveryTriggered: boolean) {
    if (!discoveryTriggered) {
      toast.info("Profile saved. Start discovery from your dashboard when ready.");
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-0 w-full justify-center overflow-x-hidden px-4 py-6 sm:px-6">
      <div
        className="mx-auto w-full max-w-[450px] rounded-lg border bg-card p-6 shadow-lg"
        aria-label="Quick onboarder wizard"
        role="region"
      >
        <h2 className="sr-only">Get Started</h2>
        <ProgressBar currentStep={step} />

        {step === 1 && (
          <Step1Form onSuccess={() => setStep(2)} />
        )}
        {step === 2 && (
          <Step2Form onSuccess={() => setStep(3)} />
        )}
        {step === 3 && (
          <Step3Form onSuccess={handleStep3Success} />
        )}
      </div>
    </div>
  );
}
