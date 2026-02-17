/**
 * Agent environment schema — validates required env vars on startup.
 * Constitution: validate env vars with Zod.
 */
import { z } from "zod";

const DiscoveryEnvSchema = z.object({
  /** Tavily API key for web search (Advisor discovery). Required when discovery is invoked. */
  TAVILY_API_KEY: z.string().min(1).optional(),
  /** Delay in ms between Tavily search batches. Default 2000. */
  DISCOVERY_SEARCH_BATCH_DELAY_MS: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 2000;
      return Number.isNaN(n) ? 2000 : Math.max(0, n);
    }),
});

export type DiscoveryEnv = z.infer<typeof DiscoveryEnvSchema>;

/** Parse and validate discovery-related env vars. Call when discovery modules need them. */
export function parseDiscoveryEnv(): DiscoveryEnv {
  return DiscoveryEnvSchema.parse({
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    DISCOVERY_SEARCH_BATCH_DELAY_MS: process.env.DISCOVERY_SEARCH_BATCH_DELAY_MS,
  });
}
