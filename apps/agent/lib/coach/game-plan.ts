/**
 * Coach Game Plan — Top 3 batch logic.
 * Per plan.md "Coach–Orchestration Integration": This module reads from and writes to
 * the applications table ONLY. It MUST NOT write to LangGraph checkpoint (active_milestones).
 * - Source: applications (momentum_score)
 * - Persists: momentum_score to applications (002) only
 * - Forbidden: checkpoint update, active_milestones write
 *
 * Orchestration (003) active_milestones serves discovery flow when user has no tracked
 * applications. When user has applications, Coach Game Plan uses applications table.
 *
 * T014: load users with applications, compute Momentum Score, persist momentum_score.
 * T015: zero-apps users skipped (they have no applications; API returns suggestion).
 * T016: getGamePlanForUser — compute Top 3 on demand for GET /api/coach/game-plan.
 */

import { createDbClient } from "@repo/db";
import { computeMomentumScoreForApplication } from "./momentum-score";
import { dbToCoachState } from "./state-mapper";
import type { CoachState } from "./state-mapper";
import type { DbApplicationStatus } from "./state-mapper";

/** Active statuses for Top 3 (draft = Tracked/Drafting/Review; submitted = Outcome Pending). */
const ACTIVE_STATUSES: DbApplicationStatus[] = ["draft", "submitted"];

export interface RunGamePlanBatchResult {
  processed: number;
  skipped: number;
  updated: number;
}

interface AppWithScholarship {
  id: string;
  user_id: string;
  status: DbApplicationStatus;
  scholarships: {
    deadline: string | null;
    trust_score: number;
  } | null;
}

/**
 * T014: Run game plan batch — load users with applications, compute Momentum Score,
 * persist momentum_score to applications only. Zero-apps users are skipped (they do not
 * appear in applications table). No checkpoint write.
 */
export async function runGamePlanBatch(): Promise<RunGamePlanBatchResult> {
  const db = createDbClient();

  const { data: apps, error: fetchError } = await db
    .from("applications")
    .select(
      `
      id,
      user_id,
      status,
      scholarships (
        deadline,
        trust_score
      )
    `
    )
    .in("status", ACTIVE_STATUSES);

  if (fetchError) {
    throw new Error(`Game plan batch fetch failed: ${fetchError.message}`);
  }

  const rows = (apps ?? []) as unknown as AppWithScholarship[];
  let updated = 0;

  for (const row of rows) {
    const trustScore = row.scholarships?.trust_score ?? 50;
    const deadline = row.scholarships?.deadline ?? null;
    const momentumScore = computeMomentumScoreForApplication({
      deadline,
      trustScore,
      applicationStatus: row.status,
    });

    const { error: updateError } = await db
      .from("applications")
      .update({
        momentum_score: momentumScore,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updateError) {
      throw new Error(
        `Game plan batch update failed for ${row.id}: ${updateError.message}`
      );
    }
    updated++;
  }

  const uniqueUsers = new Set(rows.map((r) => r.user_id));
  return {
    processed: uniqueUsers.size,
    skipped: 0,
    updated,
  };
}

/** Coach persona suggestion by state (FR-015: dynamic micro-copy). */
const STATE_SUGGESTIONS: Record<CoachState, string> = {
  Tracked: "Spend 5 minutes reviewing requirements and getting started.",
  Drafting: "5 minutes on the intro today — small wins add up.",
  Review: "Final pass today — you're in the red zone.",
  Submitted: "You've submitted — great work. Check for confirmation emails.",
  "Outcome Pending": "No updates yet. Patience — decisions take time.",
  Won: "Congratulations! Confirm your win to update your total.",
  Lost: "On to the next. Each application sharpens your skills.",
};

export interface Top3Item {
  applicationId: string;
  scholarshipTitle: string;
  momentumScore: number;
  deadline: string | null;
  coachState: CoachState;
  suggestion: string;
}

export interface PendingCheckIn {
  checkInTaskId: string;
  applicationId: string;
  dueAt: string;
  prompt: string;
}

export interface GamePlanResponse {
  top3: Top3Item[];
  pendingCheckIns?: PendingCheckIn[];
  suggestion?: string;
  generatedAt: string;
}

/**
 * T016: Get game plan for user — compute Top 3 on demand from applications
 * (ordered by momentum_score desc), include pending check-in tasks.
 * Zero-apps: returns suggestion per FR-001a. No checkpoint read/write.
 */
export async function getGamePlanForUser(
  userId: string
): Promise<GamePlanResponse> {
  const db = createDbClient();
  const generatedAt = new Date().toISOString();

  const { data: apps, error: appsError } = await db
    .from("applications")
    .select(
      `
      id,
      momentum_score,
      status,
      scholarships (
        title,
        deadline,
        trust_score
      )
    `
    )
    .eq("user_id", userId)
    .in("status", ACTIVE_STATUSES)
    .order("momentum_score", { ascending: false, nullsFirst: false })
    .limit(3);

  if (appsError) {
    throw new Error(`Game plan fetch failed: ${appsError.message}`);
  }

  const rows = (apps ?? []) as Array<{
    id: string;
    momentum_score: number | null;
    status: DbApplicationStatus;
    scholarships: { title: string; deadline: string | null; trust_score: number } | null;
  }>;

  if (rows.length === 0) {
    return {
      top3: [],
      suggestion:
        "Add applications or run discovery to get your game plan.",
      generatedAt,
    };
  }

  const top3: Top3Item[] = rows.map((row) => {
    const coachState = dbToCoachState(row.status);
    const momentumScore =
      row.momentum_score ??
      computeMomentumScoreForApplication({
        deadline: row.scholarships?.deadline ?? null,
        trustScore: row.scholarships?.trust_score ?? 50,
        applicationStatus: row.status,
      });
    return {
      applicationId: row.id,
      scholarshipTitle: row.scholarships?.title ?? "Scholarship",
      momentumScore,
      deadline: row.scholarships?.deadline ?? null,
      coachState,
      suggestion: STATE_SUGGESTIONS[coachState],
    };
  });

  const { data: checkIns, error: checkInsError } = await db
    .from("check_in_tasks")
    .select("id, application_id, due_at")
    .eq("user_id", userId)
    .eq("status", "pending");

  if (checkInsError) {
    throw new Error(`Check-in tasks fetch failed: ${checkInsError.message}`);
  }

  const pendingCheckIns: PendingCheckIn[] = (checkIns ?? []).map((c) => ({
    checkInTaskId: c.id,
    applicationId: c.application_id,
    dueAt: c.due_at,
    prompt: "Have you heard back? Any updates?",
  }));

  return { top3, pendingCheckIns, generatedAt };
}
