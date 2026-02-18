/**
 * Inngest functions — discovery (T015, T021), confirm-sai (US2), scheduled prioritization (T033–T035),
 * Coach Execution Engine (005): game plan, deadline check, check-in, micro-task.
 *
 * @see specs/003-langgraph-orchestration/contracts/api-discovery.md — event names, payloads, cron
 * @see specs/005-coach-execution-engine/contracts/coach-api.md §7 — Coach events, cron
 * @see Inngest: https://www.inngest.com/docs — createFunction, step.run, event triggers, cron
 */
import { Command } from "@langchain/langgraph";
import { inngest } from "./client";
import { createDbClient } from "@repo/db";
import { coachFunctions } from "./functions/coach";
import { graph } from "agent";
import { loadProfile } from "agent/load-profile";
import { randomUUID } from "node:crypto";

/** Input flag for scheduled refresh — routes directly to Coach_Prioritization (no Advisor nodes). */
const SCHEDULED_REFRESH_FLAG = "__scheduled_refresh" as const;

// Event-triggered function; payload from POST /api/discovery/trigger — contracts/api-discovery.md §5
export const discoveryRequested = inngest.createFunction(
  {
    id: "discovery-requested",
    timeouts: { finish: "5m" },
  },
  // Event name per contracts/api-discovery.md §5 — Inngest event triggers
  { event: "tuition-lift/discovery.requested" },
  async ({ event, step }) => {
    const { userId, threadId, discoveryRunId: payloadRunId, useSaiRange } = event.data;
    const discoveryRunId = payloadRunId ?? randomUUID();
    const thread_id = threadId ?? `user_${userId}`;

    const db = createDbClient();

    await step.run("create-completion-row", async () => {
      const { error } = await db.from("discovery_completions").insert({
        discovery_run_id: discoveryRunId,
        user_id: userId,
        thread_id,
        status: "running",
      });
      if (error) {
        if (error.code === "23505") return;
        throw error;
      }
      return { created: true };
    });

    const { user_profile, financial_profile } = await step.run(
      "load-profile",
      () => loadProfile(userId)
    );

    if (!user_profile?.major || !user_profile?.state) {
      await step.run("mark-failed", async () => {
        await db
          .from("discovery_completions")
          .update({ status: "failed", completed_at: new Date().toISOString() })
          .eq("discovery_run_id", discoveryRunId);
      });
      throw new Error("Profile incomplete: major and state required");
    }

    const config = {
      configurable: {
        thread_id,
        discovery_run_id: discoveryRunId,
        useSaiRange: useSaiRange ?? false,
      },
    };

    const input = {
      user_profile,
      financial_profile: financial_profile ?? undefined,
    };

    // graph.invoke with thread_id checkpointing — LangGraph JS persistence; config per plan.md
    const result = await step.run("invoke-graph", async () => {
      return await graph.invoke(input, config);
    });

    if (result && "__interrupt__" in result && result.__interrupt__) {
      return { status: "waiting_sai_confirmation", threadId: thread_id, discoveryRunId };
    }

    const endedAtSafeRecovery =
      result && typeof result === "object" && "last_active_node" in result
        ? result.last_active_node === "SafeRecovery"
        : false;

    await step.run(
      endedAtSafeRecovery ? "mark-failed" : "mark-completed",
      async () => {
        await db
          .from("discovery_completions")
          .update({
            status: endedAtSafeRecovery ? "failed" : "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("discovery_run_id", discoveryRunId);
      }
    );

    return {
      status: endedAtSafeRecovery ? "failed" : "completed",
      threadId: thread_id,
      discoveryRunId,
    };
  }
);

export const discoveryConfirmSai = inngest.createFunction(
  {
    id: "discovery-confirm-sai",
    timeouts: { finish: "5m" },
  },
  { event: "tuition-lift/discovery.confirm-sai" },
  async ({ event, step }) => {
    const { userId, threadId, approved } = event.data;
    const thread_id = threadId ?? `user_${userId}`;

    const db = createDbClient();
    const { data: row } = await db
      .from("discovery_completions")
      .select("discovery_run_id")
      .eq("thread_id", thread_id)
      .eq("user_id", userId)
      .eq("status", "running")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row?.discovery_run_id) {
      throw new Error("No running discovery found for thread");
    }

    const config = {
      configurable: {
        thread_id,
        discovery_run_id: row.discovery_run_id,
        useSaiRange: true,
      },
    };

    // LangGraph JS: Command({ resume }) continues from interrupt — HITL docs
    const result = await step.run("resume-graph", async () => {
      return await graph.invoke(new Command({ resume: approved }), config);
    });

    if (result && "__interrupt__" in result && result.__interrupt__) {
      throw new Error("Unexpected interrupt after SAI confirmation");
    }

    await step.run("mark-completed", async () => {
      await db
        .from("discovery_completions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("discovery_run_id", row.discovery_run_id);
    });

    return { status: "completed", threadId: thread_id, discoveryRunId: row.discovery_run_id };
  }
);

/** Default: 6 AM UTC daily. Override via PRIORITIZATION_CRON_SCHEDULE (unix-cron). */
const PRIORITIZATION_CRON =
  process.env.PRIORITIZATION_CRON_SCHEDULE ?? "0 6 * * *";

/**
 * US4 (T033–T034): Daily cron triggers Coach_Prioritization for users with discovery results.
 * Loads checkpoint state, invokes graph with scheduled_refresh entry point; no Advisor nodes run.
 */
export const prioritizationScheduled = inngest.createFunction(
  {
    id: "prioritization-scheduled",
    timeouts: { finish: "10m" },
  },
  // Cron trigger per contracts/api-discovery.md §5 — Inngest cron docs
  { cron: PRIORITIZATION_CRON },
  async ({ step }) => {
    const db = createDbClient();

    const completions = await step.run("fetch-completions", async () => {
      const { data, error } = await db
        .from("discovery_completions")
        .select("thread_id, user_id")
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const seen = new Set<string>();
      return rows.filter((r) => {
        if (seen.has(r.thread_id)) return false;
        seen.add(r.thread_id);
        return true;
      });
    });

    let processed = 0;
    let skipped = 0;

    for (const { thread_id } of completions) {
      const result = await step.run(`refresh-${thread_id}`, async () => {
        // LangGraph JS: getState loads checkpoint; invoke with __scheduled_refresh routes to Coach only
        const config = { configurable: { thread_id } };
        const state = await graph.getState(config);
        const values = (state?.values ?? {}) as {
          discovery_results?: unknown[];
          user_profile?: unknown;
        };
        if (!values.discovery_results?.length) {
          return { refreshed: false };
        }
        const input = {
          ...values,
          [SCHEDULED_REFRESH_FLAG]: true,
        };
        await graph.invoke(input as Parameters<typeof graph.invoke>[0], config);
        return { refreshed: true };
      });
      if (result?.refreshed) processed++;
      else skipped++;
    }

    return { processed, skipped, total: completions.length };
  }
);

export const functions = [
  discoveryRequested,
  discoveryConfirmSai,
  prioritizationScheduled,
  ...coachFunctions,
] as const;