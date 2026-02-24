/**
 * WelcomeAreaShell — welcome area wrapped in SectionShell with welcome-skeleton.
 * @see contracts/component-shell.md
 */
import {
  SectionShell,
  type SectionShellProps,
  type SectionStatus,
} from "./section-shell";

export interface WelcomeAreaShellProps
  extends Omit<SectionShellProps, "skeletonVariant"> {
  status: SectionStatus;
}

export function WelcomeAreaShell({
  status,
  onRetry,
  children,
}: WelcomeAreaShellProps) {
  return (
    <SectionShell
      status={status}
      onRetry={onRetry}
      skeletonVariant="text"
      title={undefined}
    >
      {children}
    </SectionShell>
  );
}
