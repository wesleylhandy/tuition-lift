/**
 * Error log utilities for node failure handling (US3).
 * Per data-model.md §6 — ErrorLogEntry appended on node failure.
 */
import type { ErrorLogEntry } from "./schemas";

export function createErrorEntry(node: string, err: unknown): ErrorLogEntry {
  const message = err instanceof Error ? err.message : String(err);
  return {
    node,
    message,
    timestamp: new Date().toISOString(),
  };
}
