"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useOnboardInitialStep,
  useOnboardIsLoggedIn,
  type Step,
} from "./onboard-step-provider";
import { ProgressBar } from "./progress-bar";
import { Step0Form } from "./step0-form";
import { Step1Form } from "./step1-form";
import { Step2Form } from "./step2-form";
import { Step3Form } from "./step3-form";
import { saveAwardYear } from "@/lib/actions/onboarding";

/**
 * OnboardWizard — 4-step onboarding shell (Award Year → Identity → Academic → Financial).
 * Per spec FR-010: 450px max-width, centered card, mobile-friendly (44px touch targets).
 * T024: ProgressBar shows current step; bar updates when step changes.
 * T028: Resumes at correct step via useOnboardInitialStep when user returns mid-flow.
 * T011: Step 0 (Award Year) → Step 1 (Identity) → Step 2 (Academic) → Step 3 (Financial).
 */
export function OnboardWizard() {
  const initialStep = useOnboardInitialStep();
  const isLoggedIn = useOnboardIsLoggedIn();
  const [step, setStep] = useState<Step>(initialStep);
  const [awardYear, setAwardYear] = useState<number | null>(null);
  const router = useRouter();

  function handleStep0Success(year: number) {
    if (isLoggedIn) {
      setStep(2);
    } else {
      setAwardYear(year);
      setStep(1);
    }
  }

  function handleStep3Success(discoveryTriggered: boolean) {
    if (!discoveryTriggered) {
      toast.info("Profile saved. Start discovery from your dashboard when ready.");
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-0 w-full justify-center overflow-x-hidden">
      <div
        className="flex w-full max-w-[450px] flex-col gap-6 rounded-lg border bg-card p-8 shadow-lg sm:p-10"
        aria-label="Quick onboarder wizard"
        role="region"
      >
        <h2 className="sr-only">Get Started</h2>
        <ProgressBar currentStep={step} />

        {step === 0 && (
          <Step0Form
            onSuccess={handleStep0Success}
            isLoggedIn={isLoggedIn}
            onSaveAwardYear={saveAwardYear}
          />
        )}
        {step === 1 && (
          <Step1Form
            awardYear={awardYear ?? undefined}
            onSuccess={() => setStep(2)}
          />
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
