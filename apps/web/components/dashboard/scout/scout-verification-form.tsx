"use client";

/**
 * ScoutVerificationForm — Maps ExtractedScholarshipData to ScoutField components.
 * Per contracts/scout-ui-components.md. T017 [US4].
 * research_required styling, Confirm and Cancel buttons.
 */
import { useState, useCallback } from "react";
import { ScoutField } from "./scout-field";
import type { ExtractedScholarshipData } from "@repo/db";

export interface ScoutVerificationFormProps {
  data: ExtractedScholarshipData;
  onConfirm: (
    edited: ExtractedScholarshipData,
    options?: { forceAdd?: boolean }
  ) => void;
  onCancel: () => void;
  duplicateWarning?: { existingTitle: string };
  pending?: boolean;
}

export function ScoutVerificationForm({
  data,
  onConfirm,
  onCancel,
  duplicateWarning,
  pending = false,
}: ScoutVerificationFormProps) {
  const [edited, setEdited] = useState<ExtractedScholarshipData>(data);

  const handleConfirm = useCallback(
    (forceAdd?: boolean) => {
      onConfirm(edited, forceAdd ? { forceAdd: true } : undefined);
    },
    [edited, onConfirm]
  );

  const updateField = useCallback(
    <K extends keyof ExtractedScholarshipData>(
      key: K,
      value: ExtractedScholarshipData[K]
    ) => {
      setEdited((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const research = edited.research_required ?? {};
  const today = new Date().toISOString().slice(0, 10);
  const potentiallyExpired =
    edited.deadline != null && edited.deadline < today;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleConfirm(false);
      }}
      className="space-y-4"
      aria-label="Verify scholarship details"
    >
      {duplicateWarning && (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/50 bg-amber-50 p-4 text-sm text-amber-800"
          aria-labelledby="duplicate-warning-title"
        >
          <p id="duplicate-warning-title">
            This scholarship may already be in your list:{" "}
            <strong>{duplicateWarning.existingTitle}</strong>
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => handleConfirm(true)}
              disabled={pending}
              className="min-h-[44px] rounded-md bg-amber-200 px-4 py-2 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add Anyway
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="min-h-[44px] rounded-md border border-amber-600/50 px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {potentiallyExpired && (
        <div
          role="status"
          className="rounded-lg border border-muted-foreground/40 bg-muted/30 p-3 text-sm text-muted-foreground"
          aria-live="polite"
        >
          <p>
            <strong>Potentially Expired:</strong> This scholarship&apos;s
            deadline has passed. It may no longer be active.
          </p>
        </div>
      )}
      <ScoutField
        label="Title"
        value={edited.title}
        onChange={(v) => updateField("title", typeof v === "string" ? v : "")}
        researchRequired={research.title}
        type="text"
        id="scout-field-title"
      />
      <ScoutField
        label="Amount ($)"
        value={edited.amount}
        onChange={(v) => updateField("amount", typeof v === "number" ? v : null)}
        researchRequired={research.amount}
        type="number"
        id="scout-field-amount"
      />
      <ScoutField
        label="Deadline"
        value={edited.deadline}
        onChange={(v) =>
          updateField("deadline", typeof v === "string" ? v : null)
        }
        researchRequired={research.deadline}
        type="date"
        id="scout-field-deadline"
      />
      <ScoutField
        label="Eligibility"
        value={edited.eligibility}
        onChange={(v) =>
          updateField("eligibility", typeof v === "string" ? v : null)
        }
        researchRequired={research.eligibility}
        type="text"
        id="scout-field-eligibility"
      />
      <ScoutField
        label="URL"
        value={edited.url}
        onChange={(v) =>
          updateField("url", typeof v === "string" ? (v || null) : null)
        }
        researchRequired={research.url}
        type="url"
        id="scout-field-url"
      />
      <div className="flex items-center gap-2 pt-2">
        <span className="text-sm text-muted-foreground">Trust Score:</span>
        <span className="font-medium">{edited.trust_score}/100</span>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending || !edited.title.trim()}
          className="min-h-[44px] rounded-md bg-electric-mint px-4 py-2 text-sm font-medium text-navy transition-colors hover:bg-electric-mint/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="size-4 animate-spin rounded-full border-2 border-navy border-t-transparent"
                aria-hidden
              />
              Saving…
            </span>
          ) : (
            "Confirm"
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="min-h-[44px] rounded-md border border-muted-foreground/40 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
