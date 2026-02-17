/**
 * PostgresSaver checkpointer for LangGraph checkpoint persistence.
 * Per plan.md, 002 FR-009 — creates checkpoints table via setup() on first use.
 */
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required for PostgresSaver. Set it in .env or environment."
  );
}

const checkpointer = PostgresSaver.fromConnString(DATABASE_URL);

await checkpointer.setup();

export { checkpointer };
