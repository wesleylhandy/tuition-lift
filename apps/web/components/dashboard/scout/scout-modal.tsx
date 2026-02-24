"use client";

/**
 * ScoutModal — Dialog shell for Scout flow (T010).
 * Composes ScoutEntryPoint, ScoutProcessingHUD placeholder, ScoutVerificationForm.
 * T019: Full US1 flow — entry → process → poll → verify → confirm.
 * T020: Cancel/dismiss discards temp data.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ScoutEntryPoint } from "./scout-entry-point";
import { ScoutProcessingHUD } from "./scout-processing-hud";
import { ScoutVerificationForm } from "./scout-verification-form";
import type { ScoutProcessInput } from "./scout-entry-point";
import type { ExtractedScholarshipData } from "@repo/db";
import { startScoutProcess } from "@/lib/actions/scout";
import { confirmScoutScholarship } from "@/lib/actions/scout";
import { useScoutStatus } from "@/lib/hooks/use-scout-status";

export interface ScoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (scholarshipId: string, applicationId: string) => void;
  /** Optional: prefill URL when opened from external link */
  initialUrl?: string;
}

type FlowStep = "entry" | "processing" | "verification" | "error";

export function ScoutModal({
  open,
  onOpenChange,
  onSuccess,
  initialUrl,
}: ScoutModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [flowStep, setFlowStep] = useState<FlowStep>("entry");
  const [runId, setRunId] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    existingTitle: string;
  } | null>(null);

  const { step, message, result, error: statusError, loading } = useScoutStatus(
    flowStep === "processing" || flowStep === "verification" ? runId : null
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setFlowStep("entry");
    setRunId(null);
    setSubmitError(null);
    setConfirmPending(false);
    setDuplicateWarning(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleEntrySubmit = useCallback(async (input: ScoutProcessInput) => {
    setSubmitError(null);
    const res = await startScoutProcess(input);
    if (!res.success) {
      setSubmitError(res.error);
      return;
    }
    setRunId(res.run_id);
    setFlowStep("processing");
  }, []);

  useEffect(() => {
    if (flowStep !== "processing") return;
    if (statusError) {
      setSubmitError(statusError);
      setFlowStep("error");
      return;
    }
    if (step === "complete" && result) {
      setFlowStep("verification");
    }
    if (step === "error") {
      setSubmitError(message ?? "Processing failed");
      setFlowStep("error");
    }
  }, [flowStep, step, result, message, statusError]);

  const handleConfirm = useCallback(
    async (
      edited: ExtractedScholarshipData,
      options?: { forceAdd?: boolean }
    ) => {
      setConfirmPending(true);
      setSubmitError(null);
      setDuplicateWarning(null);
      const res = await confirmScoutScholarship(edited, options);
      setConfirmPending(false);
      if (res.success && "scholarshipId" in res) {
        onSuccess?.(res.scholarshipId, res.applicationId);
        handleClose();
      } else if (res.success === false && "duplicate" in res && res.duplicate) {
        setDuplicateWarning({ existingTitle: res.existingTitle });
      } else if (!res.success) {
        setSubmitError((res as { error: string }).error);
      }
    },
    [onSuccess, handleClose]
  );

  const handleCancelVerification = useCallback(() => {
    setFlowStep("entry");
    setRunId(null);
  }, []);

  const showEntry = flowStep === "entry" || flowStep === "error";
  const showProcessing =
    flowStep === "processing" && (loading || step !== "complete");
  const showVerification = flowStep === "verification" && result;

  return (
    <dialog
      ref={dialogRef}
      className="max-w-lg w-full rounded-lg border bg-background p-6 shadow-lg [&::backdrop]:bg-black/50"
      aria-labelledby="scout-modal-title"
      aria-describedby="scout-modal-desc"
      onCancel={handleClose}
      onClose={handleClose}
    >
      <h2
        id="scout-modal-title"
        className="font-heading text-lg font-semibold text-navy"
      >
        Add Scholarship
      </h2>
      <p id="scout-modal-desc" className="mt-1 text-sm text-muted-foreground">
        Enter a scholarship URL or name, or upload a document to extract
        details.
      </p>

      {submitError && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <p>{submitError}</p>
          {(submitError.includes("No data found") ||
            submitError.includes("Could not load") ||
            submitError.includes("Unsupported")) && (
            <p className="mt-2 text-xs text-muted-foreground">
              Try a clearer image, upload as PNG/JPG, or enter the URL or
              scholarship name manually.
            </p>
          )}
          <button
            type="button"
            onClick={() => setSubmitError(null)}
            className="mt-2 text-xs font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2"
            aria-label="Dismiss error and try again"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {showEntry && (
          <ScoutEntryPoint
            onSubmit={handleEntrySubmit}
            initialUrl={initialUrl}
          />
        )}

        {showProcessing && (
          <ScoutProcessingHUD
            step={step}
            message={message}
          />
        )}

        {showVerification && (
          <ScoutVerificationForm
            data={result}
            onConfirm={handleConfirm}
            onCancel={handleCancelVerification}
            duplicateWarning={duplicateWarning ?? undefined}
            pending={confirmPending}
          />
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleClose}
          className="min-h-[44px] rounded px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2"
          aria-label="Close Add Scholarship dialog"
        >
          Close
        </button>
      </div>
    </dialog>
  );
}
