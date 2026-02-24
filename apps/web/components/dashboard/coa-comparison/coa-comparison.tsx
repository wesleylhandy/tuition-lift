"use client";

/**
 * COA Comparison — SAI vs average COA, Need-to-Merit zone, add/remove saved schools.
 * Per contracts/api-coa-comparison.md. FR-011: COA − SAI = Financial Need.
 */
import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface SavedSchool {
  institutionId: string;
  name: string;
  institutionType: string;
  coa: number | null;
  financialNeed: number;
}

interface CoaComparisonData {
  sai: number;
  awardYear: number;
  averageCoa: number | null;
  needToMeritZone: "need_based" | "merit_based";
  savedSchools: SavedSchool[];
  fallbackUsed: boolean;
  fallbackMessage?: string;
}

interface SavedSchoolItem {
  institutionId: string;
  name: string;
  institutionType: string;
  state: string | null;
  coa: number | null;
  stickerPrice: number | null;
  netPrice: number | null;
  savedAt: string;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

interface InstitutionOption {
  id: string;
  name: string;
  institutionType: string;
  state: string | null;
  coa: number | null;
}

export function CoaComparison() {
  const [comparison, setComparison] = useState<CoaComparisonData | null>(null);
  const [savedSchools, setSavedSchools] = useState<SavedSchoolItem[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComparison = useCallback(async () => {
    try {
      const res = await fetch("/api/coa/comparison", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) setError("Sign in required");
        else setError("Failed to load COA comparison");
        return;
      }
      setComparison((await res.json()) as CoaComparisonData);
      setError(null);
    } catch {
      setError("Failed to load COA comparison");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSavedSchools = useCallback(async () => {
    try {
      const res = await fetch("/api/coa/saved-schools", {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { savedSchools: SavedSchoolItem[] };
      setSavedSchools(data.savedSchools ?? []);
    } catch {
      // Ignore
    }
  }, []);

  const fetchInstitutions = useCallback(async () => {
    try {
      const res = await fetch("/api/institutions?limit=100", {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { institutions: InstitutionOption[] };
      setInstitutions(data.institutions ?? []);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchComparison();
    fetchSavedSchools();
    fetchInstitutions();
  }, [fetchComparison, fetchSavedSchools, fetchInstitutions]);

  const handleAddSchool = useCallback(async () => {
    if (!selectedId || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/coa/saved-schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId: selectedId }),
        credentials: "include",
      });
      if (res.ok) {
        setSelectedId("");
        await fetchSavedSchools();
        await fetchComparison();
      }
    } catch {
      // Ignore
    } finally {
      setAdding(false);
    }
  }, [selectedId, adding, fetchSavedSchools, fetchComparison]);

  const handleRemoveSchool = useCallback(
    async (institutionId: string) => {
      try {
        const res = await fetch("/api/coa/saved-schools", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ institutionId }),
          credentials: "include",
        });
        if (res.ok) {
          await fetchSavedSchools();
          await fetchComparison();
        }
      } catch {
        // Ignore
      }
    },
    [fetchSavedSchools, fetchComparison]
  );

  if (error) {
    return (
      <section
        className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
        aria-live="polite"
      >
        <p className="text-sm text-destructive">{error}</p>
      </section>
    );
  }

  if (loading && !comparison) {
    return (
      <section aria-label="COA comparison" className="space-y-4">
        <h2 className="font-heading text-lg font-semibold text-navy">
          COA Comparison
        </h2>
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </section>
    );
  }

  const zone = comparison?.needToMeritZone ?? "merit_based";
  const sai = comparison?.sai ?? 0;
  const avgCoa = comparison?.averageCoa;
  const fallback = comparison?.fallbackUsed ?? true;

  return (
    <section
      aria-label="COA comparison"
      className="space-y-4"
      aria-busy={loading}
    >
      <h2 className="font-heading text-lg font-semibold text-navy">
        COA Comparison
      </h2>
      <div className="rounded-lg border border-border bg-background p-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Your SAI</dt>
            <dd>{formatCurrency(sai)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Avg COA (saved schools)</dt>
            <dd>{avgCoa != null ? formatCurrency(avgCoa) : "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Need-to-Merit zone</dt>
            <dd
              className={
                zone === "need_based"
                  ? "text-electric-mint"
                  : "text-muted-foreground"
              }
            >
              {zone === "need_based" ? "Need-based eligible" : "Merit-based"}
            </dd>
          </div>
        </dl>
        {fallback && comparison?.fallbackMessage && (
          <p className="mt-3 text-xs text-muted-foreground">
            {comparison.fallbackMessage}
          </p>
        )}
      </div>
      <div>
        <h3 className="text-sm font-medium text-navy">Add school</h3>
        {institutions.length === 0 ? (
          <p
            className="mt-2 rounded border border-dashed border-border bg-muted/30 p-3 text-center text-sm text-muted-foreground"
            role="status"
          >
            No schools in catalog yet. Institutions will appear after the catalog
            is seeded.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="min-h-[44px] flex-1 min-w-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Select institution to add"
          >
            <option value="">Choose a school...</option>
            {institutions
              .filter(
                (i) => !savedSchools.some((s) => s.institutionId === i.id)
              )
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                  {i.state ? ` (${i.state})` : ""}
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={handleAddSchool}
            disabled={!selectedId || adding}
            className="min-h-[44px] rounded-md border border-electric-mint bg-electric-mint/20 px-4 py-2 text-sm font-medium text-navy hover:bg-electric-mint/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? "Adding..." : "Add"}
          </button>
        </div>
        )}
      </div>
      <div>
        <h3 className="text-sm font-medium text-navy">Saved schools</h3>
        {savedSchools.length === 0 ? (
          <p
            className="mt-2 rounded border border-dashed border-border bg-muted/30 p-3 text-center text-sm text-muted-foreground"
            role="status"
          >
            Add saved schools above to see per-school COA.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {savedSchools.map((s) => (
              <li
                key={s.institutionId}
                className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">{s.name}</span>
                <div className="flex items-center gap-2">
                  {s.coa != null && (
                    <span className="text-muted-foreground">
                      {formatCurrency(s.coa)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveSchool(s.institutionId)}
                    className="min-h-[44px] min-w-[44px] rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Remove ${s.name} from saved schools`}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
