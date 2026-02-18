/**
 * Coach Micro-Task Staleness Check — 48h no progress suggestions (US6).
 * T038–T040: Query applications where last_progress_at < now()-48h,
 * exclude snoozed (profiles.preferences.micro_task_snoozed_until),
 * respect notification_log 24h limit.
 *
 * Per data-model.md: preferences.micro_task_snoozed_until; snooze must not exceed nearest deadline.
 * FR-013: After 48h no progress, Coach suggests Micro-Task. FR-013b: User may snooze; snooze < deadline.
 *
 * @see specs/005-coach-execution-engine/contracts/coach-api.md §5, §6, §7
 */

import { createDbClient } from "@repo/db";

/** Active statuses for Micro-Task (draft = Tracked/Drafting/Review). */
const ACTIVE_STATUSES = ["draft"] as const;

/** 48 hours in milliseconds. */
const STALENESS_MS = 48 * 60 * 60 * 1000;

export interface MicroTaskItem {
  applicationId: string;
  scholarshipTitle: string;
  deadline: string | null;
  /** Suggestion text; Coach persona (FR-014). */
  suggestion: string;
}

export interface UserMicroTaskNotification {
  userId: string;
  /** Prioritized stale applications (by momentum/deadline). */
  items: MicroTaskItem[];
  /** FR-010: Send email only if not sent in last 24h. */
  sendEmail: boolean;
  /** FR-010: Send dashboard toast only if not sent in last 24h. */
  sendToast: boolean;
}

export interface RunMicroTaskCheckResult {
  notified: number;
  skipped: number;
  /** Users to notify (caller sends email + inserts notification_log). */
  usersToNotify: UserMicroTaskNotification[];
}

/**
 * Generate Coach-persona suggestion for a stale application (FR-013, FR-014).
 * Action-oriented, small-scope Micro-Task.
 */
function suggestionForItem(scholarshipTitle: string): string {
  return `Just 5 minutes on "${scholarshipTitle}" today — a small win unlocks momentum.`;
}

/**
 * T038: Query applications where last_progress_at < now()-48h (or last_progress_at IS NULL).
 * Exclude users with profiles.preferences.micro_task_snoozed_until > now().
 * T040: Check notification_log 24h limit before including in usersToNotify.
 */
export async function runMicroTaskCheck(): Promise<RunMicroTaskCheckResult> {
  const db = createDbClient();
  const now = new Date();
  const stalenessCutoff = new Date(now.getTime() - STALENESS_MS);

  const { data: apps, error: fetchError } = await db
    .from("applications")
    .select(
      `
      id,
      user_id,
      last_progress_at,
      momentum_score,
      scholarships (
        title,
        deadline
      )
    `
    )
    .in("status", ACTIVE_STATUSES);

  if (fetchError) {
    throw new Error(`Micro-task check fetch failed: ${fetchError.message}`);
  }

  const rows = (apps ?? []) as Array<{
    id: string;
    user_id: string;
    last_progress_at: string | null;
    momentum_score: number | null;
    scholarships: {
      title: string;
      deadline: string | null;
    } | null;
  }>;

  /** Stale = last_progress_at is null or < 48h ago. */
  const staleCandidates = rows.filter((row) => {
    const last = row.last_progress_at;
    if (!last) return true;
    const lastDate = new Date(last);
    return lastDate < stalenessCutoff;
  });

  if (staleCandidates.length === 0) {
    return { notified: 0, skipped: 0, usersToNotify: [] };
  }

  /** Group by user. */
  const byUser = new Map<string, Array<typeof staleCandidates[0]>>();
  for (const c of staleCandidates) {
    const uid = c.user_id;
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid)!.push(c);
  }

  const usersToNotify: UserMicroTaskNotification[] = [];
  let skipped = 0;
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  for (const [userId, items] of byUser) {
    /** T038: Exclude snoozed — check profiles.preferences.micro_task_snoozed_until. */
    const { data: profile } = await db
      .from("profiles")
      .select("preferences")
      .eq("id", userId)
      .maybeSingle();

    const prefs = (profile as { preferences?: { micro_task_snoozed_until?: string } })?.preferences;
    const snoozedUntil = prefs?.micro_task_snoozed_until;
    if (snoozedUntil) {
      const until = new Date(snoozedUntil);
      if (until > now) {
        skipped++;
        continue;
      }
    }

    /** T040: FR-010 — max 1 email + 1 toast per 24h (global, not per-type). */
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

    /** Sort by momentum_score desc, then deadline asc. Take top item for primary suggestion. */
    const sorted = [...items].sort((a, b) => {
      const aM = a.momentum_score ?? 0;
      const bM = b.momentum_score ?? 0;
      if (bM !== aM) return bM - aM;
      const aD = a.scholarships?.deadline ?? "";
      const bD = b.scholarships?.deadline ?? "";
      return aD.localeCompare(bD);
    });

    const microTaskItems: MicroTaskItem[] = sorted.map((row) => ({
      applicationId: row.id,
      scholarshipTitle: row.scholarships?.title ?? "Scholarship",
      deadline: row.scholarships?.deadline ?? null,
      suggestion: suggestionForItem(row.scholarships?.title ?? "this application"),
    }));

    usersToNotify.push({
      userId,
      items: microTaskItems,
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

/**
 * Get the nearest (soonest) deadline among user's active draft applications.
 * Used for snooze validation: snoozedUntil must be < nearest deadline (FR-013b).
 * Returns null if user has no applications with deadlines.
 */
export async function getNearestDeadlineForUser(
  userId: string
): Promise<Date | null> {
  const db = createDbClient();
  const { data: apps } = await db
    .from("applications")
    .select("scholarships(deadline)")
    .eq("user_id", userId)
    .in("status", ACTIVE_STATUSES);

  const rows = (apps ?? []) as Array<{
    scholarships: { deadline: string | null } | null;
  }>;
  let nearest: Date | null = null;
  for (const row of rows) {
    const d = row.scholarships?.deadline;
    if (!d) continue;
    const date = new Date(d + "T23:59:59Z");
    if (date < new Date()) continue; // Skip past deadlines
    if (!nearest || date < nearest) nearest = date;
  }
  return nearest;
}
