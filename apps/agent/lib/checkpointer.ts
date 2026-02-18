/**
 * PostgresSaver checkpointer for LangGraph checkpoint persistence.
 * Per plan.md, 002 FR-009 — creates checkpoints table via setup() on first use.
 * Ignores 23505 (unique violation) if schema already exists from prior setup.
 *
 * US4 (FR-013): LangGraph checkpoints after each node. Checkpoint is written
 * when Advisor_Search completes, before Advisor_Verify runs. Resume with same
 * thread_id after a Verify failure will not re-run Scout.
 *
 * @see LangGraph JS: https://langchain-ai.github.io/langgraphjs/ — PostgresSaver, checkpointer setup
 * @see @langchain/langgraph-checkpoint-postgres
 */
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required for PostgresSaver. Set it in .env or environment."
  );
}

const checkpointer = PostgresSaver.fromConnString(DATABASE_URL);

const setupPromise = checkpointer.setup().catch((err: unknown) => {
  const code = (err as { code?: string })?.code;
  if (code === "23505" || String((err as Error)?.message ?? "").includes("already exists")) {
    return;
  }
  throw err;
});

await setupPromise;

export { checkpointer };
