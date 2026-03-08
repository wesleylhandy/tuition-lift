"use client";

/**
 * ProgressBar — Onboarding wizard progress indicator.
 * Per FR-009, FR-010: displays current step (e.g., Step 1 of 3), high-contrast bar with
 * Electric Mint (#00FFAB) brand accent, 3 segments.
 * WCAG 2.1 AA: semantic markup, aria-live for step changes.
 */

export interface ProgressBarProps {
  /** 0-based step index (0=Award Year, 1=Identity, 2=Academic, 3=Financial). */
  currentStep: 0 | 1 | 2 | 3;
  totalSteps?: number;
}

export function ProgressBar({ currentStep, totalSteps = 4 }: ProgressBarProps) {
  return (
    <div
      className="shrink-0"
      role="progressbar"
      aria-valuenow={currentStep + 1}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
      aria-live="polite"
    >
      <p className="mb-3 text-sm font-medium text-foreground">
        Step {currentStep + 1} of {totalSteps}
      </p>
      <div
        className="flex gap-1"
        aria-hidden
      >
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1;
          const isCompleted = i < currentStep;
          const isCurrent = i === currentStep;
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
