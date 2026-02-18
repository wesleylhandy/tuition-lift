/**
 * Coach Execution Engine Inngest functions (005).
 * Game plan batch, deadline check, check-in schedule, micro-task check.
 *
 * @see specs/005-coach-execution-engine/contracts/coach-api.md §7 — event names, cron
 * @see specs/005-coach-execution-engine/plan.md — Coach–Orchestration Integration
 * @see https://www.inngest.com/docs — Inngest createFunction, cron, event triggers
 * @see https://resend.com/docs — Resend emails.send for Coach notifications
 */

import { Resend } from "resend";
import { render } from "@react-email/render";
import { createDbClient } from "@repo/db";
import { runGamePlanBatch } from "agent/lib/coach/game-plan";
import { runDeadlineCheck } from "agent/lib/coach/deadline-check";
import { runCheckInBatch } from "agent/lib/coach/check-in-batch";
import { runMicroTaskCheck } from "agent/lib/coach/micro-task";
import {
  DeadlineAlertEmail,
  MicroTaskSuggestionEmail,
} from "../../email/coach-templates";
import { inngest } from "../client";

const COACH_GAME_PLAN_CRON =
  process.env.COACH_GAME_PLAN_CRON ?? "30 6 * * *";
const COACH_DEADLINE_CHECK_CRON =
  process.env.COACH_DEADLINE_CHECK_CRON ?? "0 * * * *";
const COACH_MICRO_TASK_CHECK_CRON =
  process.env.COACH_MICRO_TASK_CHECK_CRON ?? "0 */4 * * *";
const COACH_CHECK_IN_BATCH_CRON =
  process.env.COACH_CHECK_IN_BATCH_CRON ?? "0 7 * * *";

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

const COACH_FROM_EMAIL =
  process.env.COACH_FROM_EMAIL ?? "TuitionLift <notifications@tuitionlift.com>";

/**
 * T026: Deadline urgency check (72h, 24h). Sends notifications; respects 24h limit.
 * T027–T030: runDeadlineCheck + consolidated email + notification_log.
 */
export const coachDeadlineCheck = inngest.createFunction(
  { id: "coach-deadline-check", timeouts: { finish: "10m" } },
  { cron: COACH_DEADLINE_CHECK_CRON },
  async ({ step }) => {
    const result = await step.run("run-deadline-check", async () => {
      const { usersToNotify, skipped } = await runDeadlineCheck();

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        return { notified: 0, skipped, error: "RESEND_API_KEY not set" };
      }

      const db = createDbClient();
      const resend = new Resend(resendApiKey);
      let notified = 0;

      for (const user of usersToNotify) {
        const { data: authUser } = await db.auth.admin.getUserById(user.userId);
        const email = authUser?.user?.email;
        if (!email && user.sendEmail) continue;

        const applicationIds = user.deadlines.map((d) => d.applicationId);

        if (user.sendEmail && email) {
          const html = await render(
            DeadlineAlertEmail({
              deadlines: user.deadlines.map((d) => ({
                scholarshipTitle: d.scholarshipTitle,
                deadline: d.deadline,
                urgency: d.urgency,
                applicationType: d.applicationType,
              })),
              notificationType: user.notificationType,
            })
          );

          // Resend API: send transactional email; contract §6 notification_log
          const { error } = await resend.emails.send({
            from: COACH_FROM_EMAIL,
            to: email,
            subject:
              user.notificationType === "deadline_24h"
                ? "⚡ 24 hours left — deadline alert"
                : "🔥 72 hours to go — deadlines approaching",
            html,
          });

          if (!error) {
            await db.from("notification_log").insert({
              user_id: user.userId,
              channel: "email",
              notification_type: user.notificationType,
              template_name: "DeadlineAlert",
              application_ids: applicationIds,
            });
          }
        }

        if (user.sendToast) {
          await db.from("notification_log").insert({
            user_id: user.userId,
            channel: "dashboard_toast",
            notification_type: user.notificationType,
            template_name: "DeadlineAlert",
            application_ids: applicationIds,
          });
        }

        if (user.sendEmail || user.sendToast) notified++;
      }

      return { notified, skipped };
    });

    return result;
  }
);

/**
 * T033: Check-in task scheduler. Event triggered on application status → Submitted.
 * Creates check_in_tasks row with due_at = submitted_at + 21 days.
 * Per data-model.md §3: UNIQUE (user_id, application_id).
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
      const { error } = await db.from("check_in_tasks").insert({
        user_id: userId,
        application_id: applicationId,
        due_at: dueAt,
        status: "pending",
      });
      // Unique violation: task already exists (idempotent)
      if (error && error.code !== "23505") throw error;
      return { created: error?.code !== "23505" };
    });

    return { userId, applicationId, dueAt };
  }
);

/**
 * T034: Check-in batch cron. Backfill check_in_tasks for applications submitted 21+ days ago.
 * Catches any missed by the event-driven schedule.
 */
export const coachCheckInBatch = inngest.createFunction(
  { id: "coach-check-in-batch", timeouts: { finish: "5m" } },
  { cron: COACH_CHECK_IN_BATCH_CRON },
  async ({ step }) => {
    const result = await step.run("run-check-in-batch", runCheckInBatch);
    return result;
  }
);

/**
 * T037: Micro-task staleness check. Suggests Micro-Task after 48h no progress.
 * T038–T040: runMicroTaskCheck + MicroTaskSuggestion email + notification_log.
 */
export const coachMicroTaskCheck = inngest.createFunction(
  { id: "coach-micro-task-check", timeouts: { finish: "10m" } },
  { cron: COACH_MICRO_TASK_CHECK_CRON },
  async ({ step }) => {
    const result = await step.run("run-micro-task-check", async () => {
      const { usersToNotify, skipped } = await runMicroTaskCheck();

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        return { notified: 0, skipped, error: "RESEND_API_KEY not set" };
      }

      const db = createDbClient();
      const resend = new Resend(resendApiKey);
      let notified = 0;

      for (const user of usersToNotify) {
        const { data: authUser } = await db.auth.admin.getUserById(user.userId);
        const email = authUser?.user?.email;
        if (!email && user.sendEmail) continue;

        const applicationIds = user.items.map((item) => item.applicationId);

        if (user.sendEmail && email) {
          const html = await render(
            MicroTaskSuggestionEmail({
              items: user.items.map((item) => ({
                scholarshipTitle: item.scholarshipTitle,
                deadline: item.deadline,
                suggestion: item.suggestion,
              })),
            })
          );

          // Resend API: send Micro-Task nudge; contract §6 notification_log
          const { error } = await resend.emails.send({
            from: COACH_FROM_EMAIL,
            to: email,
            subject: "🏃 A quick 5 minutes can unlock your momentum",
            html,
          });

          if (!error) {
            await db.from("notification_log").insert({
              user_id: user.userId,
              channel: "email",
              notification_type: "micro_task",
              template_name: "MicroTaskSuggestion",
              application_ids: applicationIds,
            });
          }
        }

        if (user.sendToast) {
          await db.from("notification_log").insert({
            user_id: user.userId,
            channel: "dashboard_toast",
            notification_type: "micro_task",
            template_name: "MicroTaskSuggestion",
            application_ids: applicationIds,
          });
        }

        if (user.sendEmail || user.sendToast) notified++;
      }

      return { notified, skipped };
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
  coachCheckInBatch,
  coachMicroTaskCheck,
  coachProgressRecorded,
] as const;
