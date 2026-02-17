/**
 * Inngest functions — discovery (T015, T021), confirm-sai (US2), scheduled prioritization (T033–T035).
 * @see contracts/api-discovery.md
 */
import { Command } from "@langchain/langgraph";
import { inngest } from "./client";
import { createDbClient } from "@repo/db";
import { graph } from "agent";
import { loadProfile } from "agent/load-profile";
import { randomUUID } from "node:crypto";

export const discoveryRequested = inngest.createFunction(
  {
    id: "discovery-requested",
    timeouts: { finish: "5m" },
  },
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

    const result = await step.run("invoke-graph", async () => {
      return await graph.invoke(input, config);
    });

    if (result && "__interrupt__" in result && result.__interrupt__) {
      return { status: "waiting_sai_confirmation", threadId: thread_id, discoveryRunId };
    }

    await step.run("mark-completed", async () => {
      await db
        .from("discovery_completions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("discovery_run_id", discoveryRunId);
    });

    return { status: "completed", threadId: thread_id, discoveryRunId };
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

export const functions = [discoveryRequested, discoveryConfirmSai] as const;