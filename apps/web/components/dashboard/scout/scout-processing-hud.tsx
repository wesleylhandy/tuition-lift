"use client";

/**
 * ScoutProcessingHUD — Displays step badges and persona message during Scout processing.
 * Per contracts/scout-ui-components.md. T028 [US3], T021 [US4].
 * Shows Coach (encouragement) or Advisor (facts) messages per Dual Persona Protocol.
 * T021: canCancel → Cancel button; timedOut → "Extraction took too long" with Retry/Enter manually.
 */
import type { ScoutStep } from "@repo/db";

const PROCESSING_STEPS: readonly ScoutStep[] = [
  "reading_document",
  "searching_sources",
  "calculating_trust",
] as const;

const STEP_LABELS: Partial<Record<ScoutStep, string>> = {
  reading_document: "Reading document",
  searching_sources: "Searching sources",
  calculating_trust: "Calculating trust",
};

export interface ScoutProcessingHUDProps {
  step: ScoutStep;
  message?: string | null;
  persona?: "coach" | "advisor";
  /** Show loading spinner when polling (T036) */
  loading?: boolean;
  /** T021 [US4]: Show cancel button after ~30s */
  canCancel?: boolean;
  /** T021 [US4]: Called when user cancels */
  onCancel?: () => void;
  /** T021 [US4]: Timed out after 60s */
  timedOut?: boolean;
  /** T021 [US4]: Retry handler when timed out */
  onRetry?: () => void;
  /** T021 [US4]: Enter manually handler when timed out */
  onEnterManually?: () => void;
}

/** Derives persona from step when not provided: Coach for process steps, Advisor for verification. */
function derivePersona(step: ScoutStep): "coach" | "advisor" {
  if (step === "reading_document" || step === "searching_sources") return "coach";
  return "advisor";
}

export function ScoutProcessingHUD({
  step,
  message,
  persona,
  loading = false,
  canCancel = false,
  onCancel,
  timedOut = false,
  onRetry,
  onEnterManually,
}: ScoutProcessingHUDProps) {
  const effectivePersona = persona ?? derivePersona(step);
  const currentIndex = PROCESSING_STEPS.indexOf(step);
  const showBadges = PROCESSING_STEPS.includes(step);

  if (timedOut) {
    return (
      <section
        aria-label="Processing timed out"
        role="alert"
        className="min-h-[80px] rounded-lg border border-amber-500/50 bg-amber-50/80 p-4"
      >
        <p className="text-sm font-medium text-amber-800">
          Extraction took too long
        </p>
        <p className="mt-1 text-xs text-amber-700">
          The extraction service didn&apos;t respond in time. You can retry or
          enter the details manually.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="min-h-[44px] rounded-md bg-electric-mint px-4 py-2 text-sm font-medium text-navy transition-colors hover:bg-electric-mint/90 focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2"
              aria-label="Retry extraction"
            >
              Retry
            </button>
          )}
          {onEnterManually && (
            <button
              type="button"
              onClick={onEnterManually}
              className="min-h-[44px] rounded-md border border-amber-600/50 px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2"
              aria-label="Enter scholarship details manually"
            >
              Enter manually
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Processing status"
      aria-busy={loading}
      className="min-h-[80px] rounded-lg border bg-muted/20 p-4"
    >
      {showBadges && (
        <div
          className="flex flex-wrap gap-2"
          role="status"
          aria-live="polite"
          aria-atomic
        >
          {PROCESSING_STEPS.map((s, i) => {
            const isActive = i === currentIndex;
            const isPast = i < currentIndex;
            const label = STEP_LABELS[s] ?? s;
            return (
              <span
                key={s}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  isActive
                    ? "bg-electric-mint/30 text-navy ring-1 ring-electric-mint"
                    : isPast
                      ? "bg-muted text-muted-foreground"
                      : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {label}
              </span>
            );
          })}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p
          className={`flex items-center gap-2 text-sm ${effectivePersona === "coach" ? "font-medium text-navy" : "text-muted-foreground"}`}
          role="status"
          aria-live="polite"
        >
          {loading && !message && (
            <span
              className="size-4 shrink-0 animate-spin rounded-full border-2 border-electric-mint border-t-transparent"
              aria-hidden
            />
          )}
          {message ??
            (loading ? "Loading…" : (STEP_LABELS[step] ?? "Processing…"))}
        </p>
        {canCancel && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] shrink-0 rounded-md border border-muted-foreground/40 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2"
            aria-label="Cancel extraction"
          >
            Cancel
          </button>
        )}
      </div>
      {effectivePersona === "coach" && (
        <span className="sr-only">Encouraging Coach message</span>
      )}
      {effectivePersona === "advisor" && (
        <span className="sr-only">Professional Advisor message</span>
      )}
    </section>
  );
}
