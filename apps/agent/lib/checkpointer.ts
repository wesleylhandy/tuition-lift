/**
 * PostgresSaver checkpointer for LangGraph checkpoint persistence.
 * Per plan.md, 002 FR-009 — creates checkpoints table via setup() on first use.
 * Ignores 23505 (unique violation) if schema already exists from prior setup.
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
