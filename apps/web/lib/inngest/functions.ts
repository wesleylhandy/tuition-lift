/**
 * Inngest functions — discovery (T015, T021), scheduled prioritization (T033–T035).
 * @see contracts/api-discovery.md
 */
import { inngest } from "./client.js";
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
      },
    };

    const input = {
      user_profile,
      financial_profile: financial_profile ?? undefined,
    };

    await step.run("invoke-graph", async () => {
      await graph.invoke(input, config);
    });

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

export const functions = [discoveryRequested] as const;