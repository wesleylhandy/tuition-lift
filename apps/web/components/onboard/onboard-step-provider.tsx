"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

type Step = 1 | 2 | 3;

const OnboardStepContext = createContext<Step | null>(null);

/**
 * Provides initial step for OnboardWizard so users can resume mid-flow.
 * T028: Layout computes initialStep and passes via this provider.
 */
export function OnboardStepProvider({
  initialStep,
  children,
}: {
  initialStep: Step;
  children: ReactNode;
}) {
  const value = useMemo(() => initialStep, [initialStep]);
  return (
    <OnboardStepContext.Provider value={value}>
      {children}
    </OnboardStepContext.Provider>
  );
}

export function useOnboardInitialStep(): Step {
  const step = useContext(OnboardStepContext);
  return step ?? 1;
}
