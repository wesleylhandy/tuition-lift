/**
 * TavilyClient: executes deep web search via Tavily API.
 * Per research §1, contracts §2: search_depth advanced, max_results 10, topic general.
 * Per T013: rate-limit delay (DISCOVERY_SEARCH_BATCH_DELAY_MS) between calls.
 */
const TAVILY_API_URL = "https://api.tavily.com/search";

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyApiResponse {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    score?: number;
  }>;
  error?: string;
}

function getBatchDelayMs(): number {
  const raw = process.env.DISCOVERY_SEARCH_BATCH_DELAY_MS ?? "2000";
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) || parsed < 0 ? 2000 : parsed;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Searches Tavily API with rate-limiting. Waits DISCOVERY_SEARCH_BATCH_DELAY_MS (default 2000ms)
 * before each call when invoked multiple times sequentially.
 */
export async function search(
  query: string,
  options?: { signal?: AbortSignal }
): Promise<TavilySearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is required for TavilyClient.search");
  }

  const res = await fetch(TAVILY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      max_results: 10,
      topic: "general",
      include_answer: false,
    }),
    signal: options?.signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Tavily API error ${res.status}: ${text || res.statusText}`
    );
  }

  const data = (await res.json()) as TavilyApiResponse;
  if (data.error) {
    throw new Error(`Tavily API error: ${data.error}`);
  }

  const results = data.results ?? [];
  return results.map((r) => ({
    title: r.title ?? "Untitled",
    url: r.url ?? "",
    content: r.content ?? "",
    score: typeof r.score === "number" ? r.score : 0,
  }));
}

/**
 * Batch delay in ms between Tavily calls. Exported for tests and callers.
 */
export const BATCH_DELAY_MS = getBatchDelayMs;

/**
 * Executes multiple searches with rate-limiting between each call.
 * Waits BATCH_DELAY_MS between calls (not before first, not after last).
 */
export async function searchBatch(
  queries: string[],
  options?: { signal?: AbortSignal }
): Promise<TavilySearchResult[][]> {
  const results: TavilySearchResult[][] = [];
  const delayMs = getBatchDelayMs();

  for (let i = 0; i < queries.length; i++) {
    if (i > 0) {
      await delay(delayMs);
    }
    const q = queries[i];
    if (q != null) results.push(await search(q, options));
  }

  return results;
}
