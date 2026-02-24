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

const ScoutEnvSchema = z.object({
  /** Max file size for Scout uploads (MB). Default 10. Used for validation before upload. */
  SCOUT_MAX_FILE_SIZE_MB: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseFloat(v) : 10;
      return Number.isNaN(n) || n <= 0 ? 10 : Math.min(100, n);
    }),
  /** Fuzzy dedup similarity threshold (0–1). Default 0.85. Titles ≥ this match trigger duplicate warning. */
  SCOUT_DEDUP_SIMILARITY_THRESHOLD: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseFloat(v) : 0.85;
      if (Number.isNaN(n) || n < 0 || n > 1) return 0.85;
      return n;
    }),
  /** Vision model for Scout extraction (images/scanned PDFs). Default gpt-4o. */
  SCOUT_VISION_MODEL: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : "gpt-4o")),
});

export type ScoutEnv = z.infer<typeof ScoutEnvSchema>;

/** Parse and validate Scout-related env vars. Call when Scout modules need them. */
export function parseScoutEnv(): ScoutEnv {
  return ScoutEnvSchema.parse({
    SCOUT_MAX_FILE_SIZE_MB: process.env.SCOUT_MAX_FILE_SIZE_MB,
    SCOUT_DEDUP_SIMILARITY_THRESHOLD: process.env.SCOUT_DEDUP_SIMILARITY_THRESHOLD,
    SCOUT_VISION_MODEL: process.env.SCOUT_VISION_MODEL,
  });
}
