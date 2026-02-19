import { OnboardWizard } from "@/components/onboard/onboard-wizard";

/**
 * Onboarding wizard page — 3-step flow (Identity → Academic Profile → Financial Pulse).
 * Per plan.md: /onboard route.
 */
export default function OnboardPage() {
  return (
    <main className="w-full" aria-label="Quick onboarder wizard">
      <h1 className="sr-only font-heading">Get Started</h1>
      <OnboardWizard />
    </main>
  );
}
