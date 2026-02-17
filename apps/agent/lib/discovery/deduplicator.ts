/**
 * Deduplicator: merges duplicate results by URL; keeps highest Tavily relevance score.
 * Per contracts §5, research §9: runs before TrustScorer; trust_score applied later in Verify.
 */
import type { TavilySearchResult } from "./tavily-client";

export interface RawResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

/**
 * Deduplicates by URL. When same URL appears from multiple queries, keeps highest score
 * and merges snippets (concatenated).
 */
export function deduplicate(results: RawResult[]): RawResult[] {
  const byUrl = new Map<string, RawResult>();

  for (const r of results) {
    const url = r.url?.trim() || "";
    if (!url) continue;

    const existing = byUrl.get(url);
    if (!existing) {
      byUrl.set(url, { ...r });
      continue;
    }

    const higherScore = r.score > existing.score;
    const kept = higherScore ? r : existing;
    const merged = higherScore ? existing : r;
    byUrl.set(url, {
      title: kept.title,
      url,
      content: [kept.content, merged.content].filter(Boolean).join("\n\n"),
      score: Math.max(kept.score, merged.score),
    });
  }

  return Array.from(byUrl.values());
}
