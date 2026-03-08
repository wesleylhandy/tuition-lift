# Config Query Contracts: Unified MVP (015)

**Branch**: `015-unified-mvp`

## 1. Discovery Config

**Location**: `packages/database/src/config-queries.ts` (extend)

**Contract**: Read discovery_config for rate limits and deep-scout limits.

```ts
// getDiscoveryConfig(): Promise<DiscoveryConfig | null>
// Returns single row (id='default') or null
interface DiscoveryConfig {
  id: string;
  cooldown_minutes: number;
  per_day_cap: number;
  max_depth: number;
  max_links_per_page: number;
  max_records_per_run: number;
}
```

## 2. Discovery Rate Limit Check

**Location**: `packages/database` or `apps/web`

**Contract**: Check if user can trigger discovery.

```ts
// canTriggerDiscovery(userId: string): Promise<{ allowed: boolean; reason?: string; retryAfterMinutes?: number }>
// Logic:
// - Load discovery_config (defaults if null)
// - Query discovery_completions for user: last completed_at, count today
// - If status=running for user: return { allowed: false, reason: "Discovery in progress" }
// - If last run < cooldown_minutes ago: return { allowed: false, retryAfterMinutes }
// - If count today >= per_day_cap: return { allowed: false, reason: "Daily limit reached" }
// - Else: return { allowed: true }
```

## 3. Merit-First Config (existing)

**Contract**: merit_first_config per award_year. merit_first_sai_threshold (default 10000). Used by Advisor for merit-first mode prioritization.
