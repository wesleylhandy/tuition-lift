"use client";

/**
 * ROI Comparison — side-by-side cards for 4-year, community college, trade school.
 * Per contracts/api-parents.md §4. Displays net price, remaining (confirmed), remaining (if potential) with "not guaranteed" labeling.
 */
import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface InstitutionItem {
  id: string;
  name: string;
  institutionType: string;
  state: string | null;
  stickerPrice: number | null;
  automaticMerit: number | null;
  netPrice: number | null;
  remainingConfirmed: number;
  remainingIfPotential: number;
}

interface RoiData {
  institutions: InstitutionItem[];
  careerOutcomes: Array<{
    id: string;
    major_name: string;
    career_path: string | null;
    mean_annual_wage: number | null;
  }>;
  scholarshipSummary: { awardedTotal: number; potentialTotal: number };
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function institutionTypeLabel(t: string): string {
  const m: Record<string, string> = {
    "4_year": "4-Year College",
    community_college: "Community College",
    trade_school: "Trade School",
    city_college: "City College",
  };
  return m[t] ?? t;
}

export function RoiComparison() {
  const [data, setData] = useState<RoiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/roi/comparison", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) setError("Sign in required");
        else setError("Failed to load ROI comparison");
        return;
      }
      setData((await res.json()) as RoiData);
      setError(null);
    } catch {
      setError("Failed to load ROI comparison");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  if (loading && !data) {
    return (
      <section aria-label="ROI comparison" className="space-y-4">
        <h2 className="font-heading text-lg font-semibold text-navy">
          ROI Comparison
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  const institutions = data?.institutions ?? [];
  const careerOutcomes = data?.careerOutcomes ?? [];

  return (
    <section
      aria-label="ROI comparison"
      className="space-y-4"
      aria-busy={loading}
    >
      <h2 className="font-heading text-lg font-semibold text-navy">
        ROI Comparison
      </h2>
      {institutions.length === 0 ? (
        <p
          className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground"
          role="status"
        >
          Add saved schools and run discovery to see your ROI comparison. No
          institutions in catalog yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {institutions.map((inst) => (
            <article
              key={inst.id}
              className="rounded-lg border border-border bg-background p-4"
            >
              <h3 className="font-medium text-foreground">
                {institutionTypeLabel(inst.institutionType)}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{inst.name}</p>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Net price</dt>
                  <dd>{inst.netPrice != null ? formatCurrency(inst.netPrice) : "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Remaining (confirmed)</dt>
                  <dd>{formatCurrency(inst.remainingConfirmed)}</dd>
                </div>
                {inst.remainingIfPotential < inst.remainingConfirmed && (
                  <div className="flex flex-col gap-0.5">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        Remaining (if potential)
                      </dt>
                      <dd>{formatCurrency(inst.remainingIfPotential)}</dd>
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Not guaranteed
                    </p>
                  </div>
                )}
              </dl>
            </article>
          ))}
        </div>
      )}
      {careerOutcomes.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-navy">Year-5 income (sample)</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {careerOutcomes.slice(0, 5).map((c) => (
              <li key={c.id}>
                {c.major_name}
                {c.mean_annual_wage != null && (
                  <> — {formatCurrency(c.mean_annual_wage)}/yr</>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
