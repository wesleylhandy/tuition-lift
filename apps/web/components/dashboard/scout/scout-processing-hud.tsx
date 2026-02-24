"use client";

/**
 * ScoutProcessingHUD — Displays step badges and persona message during Scout processing.
 * Per contracts/scout-ui-components.md. T028 [US3].
 * Shows Coach (encouragement) or Advisor (facts) messages per Dual Persona Protocol.
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
}: ScoutProcessingHUDProps) {
  const effectivePersona = persona ?? derivePersona(step);
  const currentIndex = PROCESSING_STEPS.indexOf(step);
  const showBadges = PROCESSING_STEPS.includes(step);

  return (
    <section
      aria-label="Processing status"
      aria-busy
      className="min-h-[60px] rounded-lg border bg-muted/20 p-4"
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
      <p
        className={`mt-3 text-sm ${effectivePersona === "coach" ? "font-medium text-navy" : "text-muted-foreground"}`}
        role="status"
        aria-live="polite"
      >
        {message ?? (step === "reading_document" && "Processing…")}
      </p>
      {effectivePersona === "coach" && (
        <span className="sr-only">Encouraging Coach message</span>
      )}
      {effectivePersona === "advisor" && (
        <span className="sr-only">Professional Advisor message</span>
      )}
    </section>
  );
}
