/**
 * DeadlineCalendarShell — deadline calendar wrapped in SectionShell with deadline-calendar-skeleton.
 * @see contracts/component-shell.md
 */
import {
  SectionShell,
  type SectionShellProps,
  type SectionStatus,
} from "./section-shell";

export interface DeadlineCalendarShellProps
  extends Omit<SectionShellProps, "skeletonVariant" | "title"> {
  status: SectionStatus;
}

export function DeadlineCalendarShell({
  status,
  onRetry,
  children,
}: DeadlineCalendarShellProps) {
  return (
    <SectionShell
      status={status}
      onRetry={onRetry}
      skeletonVariant="calendar"
      title="Deadline Calendar"
    >
      {children}
    </SectionShell>
  );
}
