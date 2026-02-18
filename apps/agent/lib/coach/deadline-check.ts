/**
 * Coach Deadline Check — 72h/24h urgency notifications (US4).
 * T027–T030: Query applications with approaching deadlines, respect 24h notification limit,
 * return consolidated payload for email + dashboard toast.
 *
 * Per data-model.md: notification_log enforces FR-010 (max one email + one dashboard per 24h).
 * FR-009a: Single consolidated email per user with prioritization (essays before forms, by due date).
 *
 * @see specs/005-coach-execution-engine/contracts/coach-api.md §6, §7
 */

import { createDbClient } from "@repo/db";

/** Active statuses for deadline check (draft = Tracked/Drafting/Review). */
const ACTIVE_STATUSES = ["draft", "submitted"] as const;

/** Application type for prioritization (FR-009a): essays need more time than forms. */
type ApplicationType = "essay" | "form" | "mixed" | null;

export interface DeadlineItem {
  applicationId: string;
  scholarshipTitle: string;
  deadline: string;
  /** '72h' or '24h' — which urgency window. */
  urgency: "72h" | "24h";
  /** From scholarships.metadata.application_type for prioritization. */
  applicationType: ApplicationType;
}

export interface UserDeadlineNotification {
  userId: string;
  /** deadline_72h or deadline_24h — primary type when consolidated (prefer 24h if any in 24h). */
  notificationType: "deadline_72h" | "deadline_24h";
  /** Prioritized list: essays first, then mixed, then form; within group by due date asc. */
  deadlines: DeadlineItem[];
  /** FR-010: Send email only if not sent in last 24h. */
  sendEmail: boolean;
  /** FR-010: Send dashboard toast only if not sent in last 24h. */
  sendToast: boolean;
}

export interface RunDeadlineCheckResult {
  notified: number;
  skipped: number;
  /** Users to notify (caller sends email + inserts notification_log). */
  usersToNotify: UserDeadlineNotification[];
}

/**
 * Extract application_type from scholarships.metadata.
 * data-model.md §6: metadata.application_type as 'essay' | 'form' | 'mixed'.
 */
function getApplicationType(metadata: unknown): ApplicationType {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  const t = m.application_type;
  if (t === "essay" || t === "form" || t === "mixed") return t;
  return null;
}

/**
 * T027: Query applications with deadlines in 72h or 24h window.
 * T028: Prioritize: essays before forms, by due date (FR-009a).
 * T030: Check notification_log for 24h limit — skip if recent email or dashboard_toast.
 */
export async function runDeadlineCheck(): Promise<RunDeadlineCheckResult> {
  const db = createDbClient();

  const now = new Date();

  const { data: apps, error: fetchError } = await db
    .from("applications")
    .select(
      `
      id,
      user_id,
      scholarships (
        title,
        deadline,
        metadata
      )
    `
    )
    .in("status", ACTIVE_STATUSES);

  if (fetchError) {
    throw new Error(`Deadline check fetch failed: ${fetchError.message}`);
  }

  const rows = (apps ?? []) as Array<{
    id: string;
    user_id: string;
    scholarships: {
      title: string;
      deadline: string | null;
      metadata: unknown;
    } | null;
  }>;

  const candidates: Array<DeadlineItem & { userId: string }> = [];
  for (const row of rows) {
    const deadline = row.scholarships?.deadline;
    if (!deadline) continue;

    const deadlineDate = new Date(deadline + "T23:59:59Z");
    if (deadlineDate < now) continue;

    const hoursUntil = (deadlineDate.getTime() - now.getTime()) / (60 * 60 * 1000);
    let urgency: "72h" | "24h";
    if (hoursUntil <= 24) urgency = "24h";
    else if (hoursUntil <= 72) urgency = "72h";
    else continue;

    const appType = getApplicationType(row.scholarships?.metadata ?? null);
    candidates.push({
      userId: row.user_id,
      applicationId: row.id,
      scholarshipTitle: row.scholarships?.title ?? "Scholarship",
      deadline,
      urgency,
      applicationType: appType,
    });
  }

  const byUser = new Map<string, DeadlineItem[]>();
  for (const c of candidates) {
    const userId = c.userId;
    if (!byUser.has(userId)) byUser.set(userId, []);
    const list = byUser.get(userId)!;
    if (!list.some((x) => x.applicationId === c.applicationId)) {
      list.push({
        applicationId: c.applicationId,
        scholarshipTitle: c.scholarshipTitle,
        deadline: c.deadline,
        urgency: c.urgency,
        applicationType: c.applicationType,
      });
    }
  }

  const usersToNotify: UserDeadlineNotification[] = [];
  let skipped = 0;

  for (const [userId, items] of byUser) {
    if (items.length === 0) continue;

    /** FR-010: max 1 email + 1 toast per 24h. Skip only if BOTH sent in last 24h. */
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentEmail } = await db
      .from("notification_log")
      .select("id")
      .eq("user_id", userId)
      .eq("channel", "email")
      .gte("sent_at", since)
      .limit(1)
      .maybeSingle();

    const { data: recentToast } = await db
      .from("notification_log")
      .select("id")
      .eq("user_id", userId)
      .eq("channel", "dashboard_toast")
      .gte("sent_at", since)
      .limit(1)
      .maybeSingle();

    if (recentEmail && recentToast) {
      skipped++;
      continue;
    }

    const sendEmail = !recentEmail;
    const sendToast = !recentToast;

    const has24h = items.some((x) => x.urgency === "24h");
    const notificationType: "deadline_72h" | "deadline_24h" = has24h
      ? "deadline_24h"
      : "deadline_72h";

    const typeOrder = { essay: 0, mixed: 1, form: 2 } as const;
    const sorted = [...items].sort((a, b) => {
      const aOrder = a.applicationType ? typeOrder[a.applicationType] ?? 3 : 3;
      const bOrder = b.applicationType ? typeOrder[b.applicationType] ?? 3 : 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.deadline.localeCompare(b.deadline);
    });

    usersToNotify.push({
      userId,
      notificationType,
      deadlines: sorted,
      sendEmail,
      sendToast,
    });
  }

  return {
    notified: usersToNotify.length,
    skipped,
    usersToNotify,
  };
}
