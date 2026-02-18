/**
 * Loads env before any agent imports. Import this first in verify scripts
 * so TAVILY_API_KEY, OPENAI_API_KEY etc. are available when graph runs.
 */
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });
config({ path: resolve(process.cwd(), ".env") });

// Disable LangSmith tracing for verify scripts to avoid LANGSMITH_WORKSPACE_ID 403
process.env.LANGCHAIN_TRACING_V2 = "false";
