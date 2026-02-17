/**
 * Discovery status resolver — reads discovery_completions and checkpoint state.
 * T017; used by GET /api/discovery/status.
 * @see contracts/api-discovery.md
 */
import { createDbClient } from "@repo/db";
import { graph } from "agent";

export type DiscoveryStatus = {
  threadId: string;
  discoveryRunId: string | null;
  status: "running" | "completed" | "failed";
  lastActiveNode: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  /** US2: true when graph awaits POST /api/discovery/confirm-sai */
  waitingSaiConfirmation?: boolean;
};

export async function resolveDiscoveryStatus(
  threadId: string,
  userId: string
): Promise<DiscoveryStatus | null> {
  if (threadId !== `user_${userId}`) {
    return null;
  }

  const db = createDbClient();
  const { data: row } = await db
    .from("discovery_completions")
    .select("discovery_run_id, status, completed_at")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) {
    try {
      const config = { configurable: { thread_id: threadId } };
      const state = await graph.getState(config);
      const values = state?.values as { last_active_node?: string } | undefined;
      const lastActiveNode = values?.last_active_node ?? null;
      if (state?.next?.length) {
        const values = state?.values as { pending_sai_confirmation?: boolean } | undefined;
        return {
          threadId,
          discoveryRunId: null,
          status: "running",
          lastActiveNode,
          completedAt: null,
          errorMessage: null,
          ...(Boolean(values?.pending_sai_confirmation) && {
            waitingSaiConfirmation: true,
          }),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  let lastActiveNode: string | null = null;
  let waitingSaiConfirmation = false;
  try {
    const config = { configurable: { thread_id: threadId } };
    const state = await graph.getState(config);
    const values = state?.values as {
      last_active_node?: string;
      pending_sai_confirmation?: boolean;
    } | undefined;
    lastActiveNode = values?.last_active_node ?? null;
    waitingSaiConfirmation = Boolean(values?.pending_sai_confirmation);
    const meta = state?.metadata as { interrupts?: unknown } | undefined;
    if (!waitingSaiConfirmation && meta?.interrupts) {
      waitingSaiConfirmation = true;
    }
  } catch {
    // Ignore
  }

  return {
    threadId,
    discoveryRunId: row.discovery_run_id,
    status: row.status as "running" | "completed" | "failed",
    lastActiveNode,
    completedAt: row.completed_at,
    errorMessage: row.status === "failed" ? "Discovery failed." : null,
    ...(waitingSaiConfirmation && { waitingSaiConfirmation: true }),
  };
}
