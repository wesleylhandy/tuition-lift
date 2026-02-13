```typescript
// @/lib/agents/advisor.ts
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { SupabaseSaver } from "@skroyc/langgraph-supabase-checkpointer"; // 2026 Standard for Supabase persistence
import { createClient } from "@supabase/supabase-js";

// 1. Define the State Schema (2026 Typed Annotation Pattern)
const AdvisorState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  searchQueries: Annotation<string[]>({
    reducer: (x, y) => y, // Overwrite with latest queries
  }),
  verifiedScholarships: Annotation<any[]>({
    reducer: (x, y) => x.concat(y),
  }),
  isScamDetected: Annotation<boolean>({
    reducer: (x, y) => y,
  }),
});

// 2. The Verification Node (The "Advisor's" Professional Logic)
const verifyResults = async (state: typeof AdvisorState.State) => {
  const lastMessage = state.messages[state.messages.length - 1];
  const rawResults = JSON.parse(lastMessage.content);
  
  const scoredResults = rawResults.map((res: any) => {
    let score = 50; // Starting baseline
    const url = new URL(res.url);

    // 1. Domain Signals
    if (url.hostname.endsWith('.gov') || url.hostname.endsWith('.edu')) score += 40;
    if (url.hostname.endsWith('.org')) score += 15;
    
    // 2. Scam Red Flags (The "Coach" warns about these)
    if (res.snippet.toLowerCase().includes("application fee")) score = 0;
    if (res.snippet.toLowerCase().includes("no essay") || res.snippet.toLowerCase().includes("sweepstakes")) score -= 20;

    return { ...res, trustScore: score };
  });

  // Only return results that aren't blatant scams
  return { verifiedScholarships: scoredResults.filter(r => r.trustScore > 20) };
};

// 3. Construct the Graph
const workflow = new StateGraph(AdvisorState)
  .addNode("search", callTavily)
  .addNode("verify", verifyResults)
  .addEdge(START, "search")
  .addEdge("search", "verify")
  .addEdge("verify", END);

// 4. Persistence Setup (Using Supabase)
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const checkpointer = new SupabaseSaver(supabase, {
  tableName: "checkpoints", // As defined in our Constitution
});

export const advisorAgent = workflow.compile({ checkpointer });
```