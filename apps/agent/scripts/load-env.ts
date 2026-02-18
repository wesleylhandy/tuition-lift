/**
 * Loads env before any agent imports. Uses paths relative to this file
 * (not process.cwd()) so it works regardless of where pnpm runs from.
 */
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const agentRoot = resolve(__dirname, "..");
const workspaceRoot = resolve(agentRoot, "../..");

const rootEnv = resolve(workspaceRoot, ".env");
const agentEnv = resolve(agentRoot, ".env");

config({ path: rootEnv });
config({ path: agentEnv, override: true });

// Disable LangSmith tracing to avoid LANGSMITH_WORKSPACE_ID 403
process.env.LANGCHAIN_TRACING_V2 = "false";
