"use client";

/**
 * ProgressBar — Onboarding wizard progress indicator.
 * Per FR-009, FR-010: displays current step (e.g., Step 1 of 3), high-contrast bar with
 * Electric Mint (#00FFAB) brand accent, 3 segments.
 * WCAG 2.1 AA: semantic markup, aria-live for step changes.
 */

export interface ProgressBarProps {
  currentStep: 1 | 2 | 3;
  totalSteps?: number;
}

export function ProgressBar({ currentStep, totalSteps = 3 }: ProgressBarProps) {
  return (
    <div
      className="shrink-0"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Step ${currentStep} of ${totalSteps}`}
      aria-live="polite"
    >
      <p className="mb-3 text-sm font-medium text-foreground">
        Step {currentStep} of {totalSteps}
      </p>
      <div
        className="flex gap-1"
        aria-hidden
      >
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div
              key={stepNum}
              className={`h-2 flex-1 rounded-full transition-colors ${
                isCompleted || isCurrent
                  ? "bg-electric-mint"
                  : "bg-muted"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
