import { Inngest } from "inngest";

/**
 * Inngest client for TuitionLift — event-driven discovery and scheduling.
 * Uses INNGEST_EVENT_KEY for sending events; INNGEST_SIGNING_KEY for serve auth.
 * @see https://www.inngest.com/docs/reference/client/create
 */
export const inngest = new Inngest({
  id: "tuition-lift",
});
