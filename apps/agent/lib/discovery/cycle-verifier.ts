/**
 * CycleVerifier: verifies deadline aligns with current/upcoming academic year.
 * Per data-model §5, contracts §4, Constitution §8: past due = potentially_expired, active false.
 * No hardcoded years; compute from Date.
 */
export type VerificationStatus =
  | "verified"
  | "ambiguous_deadline"
  | "needs_manual_review"
  | "potentially_expired";

export interface CycleVerificationResult {
  verification_status: VerificationStatus;
  deadline: string | null;
  active: boolean;
}

/**
 * Academic year runs July 1 – June 30. E.g. 2025-07-01 to 2026-06-30 = FY2026.
 */
function getCurrentAcademicYear(): number {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return month >= 6 ? year + 1 : year;
}

/**
 * Parses ISO date string. Returns null if unparseable.
 */
function parseDeadline(raw: string | null | undefined): Date | null {
  if (!raw || typeof raw !== "string") return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * True if date is in current or next academic year (July 1 – June 30).
 */
function isInCurrentOrNextCycle(deadline: Date): boolean {
  const year = deadline.getFullYear();
  const month = deadline.getMonth();
  const current = getCurrentAcademicYear();
  const cycleStartYear = month >= 6 ? year : year - 1;
  return cycleStartYear === current || cycleStartYear === current - 1;
}

/**
 * Verifies deadline against current academic cycle.
 * - verified: deadline parseable, in cycle, after today
 * - potentially_expired: deadline before today
 * - ambiguous_deadline: no deadline found in input
 * - needs_manual_review: deadline parseable but outside normal cycle
 */
export function verify(
  input: { deadline?: string | null; url?: string }
): CycleVerificationResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = parseDeadline(input.deadline);
  if (!deadlineDate) {
    return {
      verification_status: "ambiguous_deadline",
      deadline: null,
      active: false,
    };
  }

  if (deadlineDate < today) {
    return {
      verification_status: "potentially_expired",
      deadline: input.deadline ?? deadlineDate.toISOString().slice(0, 10),
      active: false,
    };
  }

  if (!isInCurrentOrNextCycle(deadlineDate)) {
    return {
      verification_status: "needs_manual_review",
      deadline: input.deadline ?? deadlineDate.toISOString().slice(0, 10),
      active: false,
    };
  }

  return {
    verification_status: "verified",
    deadline: input.deadline ?? deadlineDate.toISOString().slice(0, 10),
    active: true,
  };
}
