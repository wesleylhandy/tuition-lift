/**
 * Coach Execution Engine Inngest functions (005).
 * Game plan batch, deadline check, check-in schedule, micro-task check.
 *
 * @see specs/005-coach-execution-engine/contracts/coach-api.md §7 — event names, cron
 * @see specs/005-coach-execution-engine/plan.md — Coach–Orchestration Integration
 */

import { inngest } from "../client";
import { createDbClient } from "@repo/db";
import { runGamePlanBatch } from "agent/lib/coach/game-plan";

const COACH_GAME_PLAN_CRON =
  process.env.COACH_GAME_PLAN_CRON ?? "30 6 * * *";
const COACH_DEADLINE_CHECK_CRON =
  process.env.COACH_DEADLINE_CHECK_CRON ?? "0 * * * *";
const COACH_MICRO_TASK_CHECK_CRON =
  process.env.COACH_MICRO_TASK_CHECK_CRON ?? "0 */4 * * *";

/**
 * T013: Daily Top 3 Game Plan batch. Computes momentum_score, persists to applications.
 * Runs after 003 prioritization at 06:00 (06:30 UTC). Plan.md Coach–Orchestration Integration.
 */
export const coachGamePlanDaily = inngest.createFunction(
  { id: "coach-game-plan-daily", timeouts: { finish: "10m" } },
  { cron: COACH_GAME_PLAN_CRON },
  async ({ step }) => {
    // T014: load users with applications, compute momentum_score, persist
    const result = await step.run("run-game-plan-batch", async () => {
      return await runGamePlanBatch();
    });
    return result;
  }
);

/**
 * T026: Deadline urgency check (72h, 24h). Sends notifications; respects 24h limit.
 */
export const coachDeadlineCheck = inngest.createFunction(
  { id: "coach-deadline-check", timeouts: { finish: "10m" } },
  { cron: COACH_DEADLINE_CHECK_CRON },
  async ({ step }) => {
    // T027–T030 implement deadline-check logic
    const result = await step.run("run-deadline-check", async () => {
      // T027–T030 implement deadline-check logic
      return { notified: 0 };
    });
    return result;
  }
);

/**
 * T033: Check-in task scheduler. Event triggered on application status → Submitted.
 * Creates check_in_tasks row with due_at = submitted_at + 21 days.
 */
export const coachCheckInSchedule = inngest.createFunction(
  { id: "coach-check-in-schedule", timeouts: { finish: "1m" } },
  { event: "tuition-lift/coach.check-in.schedule" },
  async ({ event, step }) => {
    const { userId, applicationId, dueAt } = event.data as {
      userId: string;
      applicationId: string;
      dueAt: string;
    };

    await step.run("create-check-in-task", async () => {
      const db = createDbClient();
      const { error } = await (db as unknown as { from: (t: string) => { insert: (v: object) => Promise<{ error: Error | null }> } })
        .from("check_in_tasks")
        .insert({ user_id: userId, application_id: applicationId, due_at: dueAt, status: "pending" });
      if (error) throw error;
      return { created: true };
    });

    return { userId, applicationId, dueAt };
  }
);

/**
 * T037: Micro-task staleness check. Suggests Micro-Task after 48h no progress.
 */
export const coachMicroTaskCheck = inngest.createFunction(
  { id: "coach-micro-task-check", timeouts: { finish: "10m" } },
  { cron: COACH_MICRO_TASK_CHECK_CRON },
  async ({ step }) => {
    // T038–T040 implement staleness check and send
    const result = await step.run("run-micro-task-check", async () => {
      // T038–T040 implement staleness check and send
      return { notified: 0 };
    });
    return result;
  }
);

/**
 * Event handler for progress.recorded. Emitted on status change (T021).
 * Used for audit/coupling; Micro-Task staleness uses cron, not this event.
 */
export const coachProgressRecorded = inngest.createFunction(
  { id: "coach-progress-recorded", timeouts: { finish: "30s" } },
  { event: "tuition-lift/coach.progress.recorded" },
  async ({ event }) => {
    const { userId, applicationId } = event.data as {
      userId: string;
      applicationId: string;
    };
    return { userId, applicationId, received: true };
  }
);

export const coachFunctions = [
  coachGamePlanDaily,
  coachDeadlineCheck,
  coachCheckInSchedule,
  coachMicroTaskCheck,
  coachProgressRecorded,
] as const;
