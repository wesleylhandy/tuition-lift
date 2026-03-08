"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

/** Step 0 = Award Year, 1 = Identity, 2 = Academic, 3 = Financial. */
export type Step = 0 | 1 | 2 | 3;

type OnboardContextValue = {
  initialStep: Step;
  isLoggedIn: boolean;
};

const OnboardStepContext = createContext<OnboardContextValue | null>(null);

/**
 * Provides initial step and isLoggedIn for OnboardWizard so users can resume mid-flow.
 * T028: Layout computes initialStep and passes via this provider.
 * T015: Step 0 resume when user has account but no award_year.
 */
export function OnboardStepProvider({
  initialStep,
  isLoggedIn = false,
  children,
}: {
  initialStep: Step;
  isLoggedIn?: boolean;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ initialStep, isLoggedIn }),
    [initialStep, isLoggedIn]
  );
  return (
    <OnboardStepContext.Provider value={value}>
      {children}
    </OnboardStepContext.Provider>
  );
}

export function useOnboardInitialStep(): Step {
  const ctx = useContext(OnboardStepContext);
  return ctx?.initialStep ?? 0;
}

export function useOnboardIsLoggedIn(): boolean {
  const ctx = useContext(OnboardStepContext);
  return ctx?.isLoggedIn ?? false;
}
