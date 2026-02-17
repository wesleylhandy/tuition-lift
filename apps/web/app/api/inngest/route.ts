import { serve } from "inngest/next";
import { inngest } from "../../../lib/inngest/client";
import { functions } from "../../../lib/inngest/functions";

/**
 * Inngest serve endpoint — GET/POST/PUT for sync and execution.
 * Requires INNGEST_SIGNING_KEY for webhook auth.
 *
 * @see Inngest: https://www.inngest.com/docs/sdk/serve — serve() for Next.js
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
