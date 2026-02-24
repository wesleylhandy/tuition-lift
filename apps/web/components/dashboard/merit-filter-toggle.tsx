"use client";

/**
 * Merit Filter Toggle — High-SAI users can switch Merit only / Show all.
 * Only visible when saiAboveThreshold. US1 (009) Merit Hunter.
 *
 * @see specs/009-squeezed-middle-roi/tasks.md T026
 */
import { useEffect, useState } from "react";

type Preference = "merit_only" | "show_all";

export function MeritFilterToggle() {
  const [pref, setPref] = useState<Preference | null>(null);
  const [saiAbove, setSaiAbove] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/merit/preference", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          meritFilterPreference?: string;
          saiAboveThreshold?: boolean;
        };
        if (cancelled) return;
        setSaiAbove(Boolean(data.saiAboveThreshold));
        setPref(
          data.meritFilterPreference === "merit_only"
            ? "merit_only"
            : "show_all"
        );
      } catch {
        // Ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = async () => {
    if (!saiAbove || pref === null || updating) return;
    const next: Preference = pref === "merit_only" ? "show_all" : "merit_only";
    setUpdating(true);
    try {
      const res = await fetch("/api/merit/preference", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meritFilterPreference: next }),
        credentials: "include",
      });
      if (res.ok) setPref(next);
    } catch {
      // Ignore
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !saiAbove) return null;

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Merit filter">
      <span className="text-xs text-muted-foreground">Merit results:</span>
      <button
        type="button"
        onClick={handleToggle}
        disabled={updating}
        className={`
          min-h-[44px] rounded-md border px-3 py-1.5 text-sm font-medium
          transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          disabled:opacity-50
          ${
            pref === "merit_only"
              ? "border-electric-mint bg-electric-mint/20 text-navy"
              : "border-border bg-background hover:bg-muted"
          }
        `}
        aria-pressed={pref === "merit_only"}
      >
        {pref === "merit_only" ? "Merit only" : "Show all"}
      </button>
    </div>
  );
}
