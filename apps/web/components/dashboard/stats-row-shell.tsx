/**
 * StatsRowShell — stats row wrapped in SectionShell with stats-skeleton.
 * @see contracts/component-shell.md
 */
import {
  SectionShell,
  type SectionShellProps,
  type SectionStatus,
} from "./section-shell";

export interface StatsRowShellProps
  extends Omit<SectionShellProps, "skeletonVariant"> {
  status: SectionStatus;
}

export function StatsRowShell({
  status,
  onRetry,
  children,
}: StatsRowShellProps) {
  return (
    <SectionShell
      status={status}
      onRetry={onRetry}
      skeletonVariant="stats"
      title={undefined}
    >
      {children}
    </SectionShell>
  );
}
