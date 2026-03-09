"use client";

/**
 * ScoutModal — Dialog shell for Scout flow (T010).
 * Composes ScoutEntryPoint, ScoutProcessingHUD, ScoutVerificationView.
 * T016 [US3]: Side-by-side verification with document preview.
 * T018 [US3]: Enter manually shows verification with empty form.
 * T019 [US3]: Rate limit check, limitReached handling.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ScoutEntryPoint } from "./scout-entry-point";
import { ScoutProcessingHUD } from "./scout-processing-hud";
import { ScoutVerificationView } from "./scout-verification-view";
import type {
  ScoutProcessInput,
  ScoutSourceForPreview,
} from "./scout-entry-point";
import type { ScoutSourcePreview } from "./scout-verification-view";
import type { ExtractedScholarshipData } from "@repo/db";
import { startScoutProcess, confirmScoutScholarship } from "@/lib/actions/scout";
import { useScoutStatus } from "@/lib/hooks/use-scout-status";

export interface ScoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (scholarshipId: string, applicationId: string) => void;
  /** Optional: prefill URL when opened from external link */
  initialUrl?: string;
}

type FlowStep = "entry" | "processing" | "verification" | "error";

/** T018: Empty form for "Enter manually" after extraction fail */
const EMPTY_EXTRACTED: ExtractedScholarshipData = {
  title: "",
  amount: null,
  deadline: null,
  eligibility: null,
  url: null,
  trust_score: 50,
  research_required: {},
  verification_status: "needs_manual_review",
};

/** Disable backdrop click closing—file picker overlaps backdrop and picks up that click */

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
  const [lastInput, setLastInput] = useState<ScoutProcessInput | null>(null);
  const [sourceForPreview, setSourceForPreview] =
    useState<ScoutSourceForPreview | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    existingTitle: string;
  } | null>(null);
  const [manualEntryMode, setManualEntryMode] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [alreadyTracked, setAlreadyTracked] = useState<{
    scholarshipId: string;
    applicationId?: string;
  } | null>(null);
  const [sourcePreview, setSourcePreview] = useState<ScoutSourcePreview>(null);
  const [entryResetKey, setEntryResetKey] = useState(0);

  const {
    step,
    message,
    result,
    error: statusError,
    loading,
    canCancel,
    timedOut,
    cancel,
  } = useScoutStatus({
    runId: flowStep === "processing" ? runId : null,
    cancelTimeoutMs: 30000,
    failTimeoutMs: 60000,
  });

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
    setLastInput(null);
    setSourceForPreview(null);
    setSourcePreview(null);
    setConfirmPending(false);
    setDuplicateWarning(null);
    setManualEntryMode(false);
    setLimitReached(false);
    setAlreadyTracked(null);
    setEntryResetKey((k) => k + 1);
    onOpenChange(false);
  }, [onOpenChange]);

  /** T015: Derive sourcePreview from sourceForPreview; create/revoke blob URLs for files */
  useEffect(() => {
    if (!sourceForPreview) {
      setSourcePreview(null);
      return;
    }
    if (sourceForPreview.type === "url") {
      setSourcePreview({ type: "url", url: sourceForPreview.url });
      return;
    }
    const url = URL.createObjectURL(sourceForPreview.file);
    setSourcePreview({
      type: "file",
      blobUrl: url,
      fileName: sourceForPreview.file.name,
    });
    return () => URL.revokeObjectURL(url);
  }, [sourceForPreview]);

  /** T025 [US5]: Focus trap for WCAG 2.1 AA — Tab cycles within modal, Escape closes, Enter/Space activate buttons */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;

    const getFocusable = (): HTMLElement[] => {
      const selector =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(dialog.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => el.offsetParent !== null
      );
    };

    const focusFirst = () => {
      const focusable = getFocusable();
      focusable[0]?.focus();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const timeoutId = setTimeout(focusFirst, 0);
    dialog.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timeoutId);
      dialog.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleClose, flowStep]);

  /** Prevent backdrop click from closing; Esc still closes via keydown */
  const handleCancel = useCallback(
    (e: React.SyntheticEvent<HTMLDialogElement>) => {
      e.preventDefault();
    },
    []
  );

  const handleEntrySubmit = useCallback(
    async (
      input: ScoutProcessInput,
      source?: ScoutSourceForPreview
    ) => {
      setSubmitError(null);
      setAlreadyTracked(null);
      setLastInput(input);
      setSourceForPreview(source ?? null);
      const res = await startScoutProcess(input);
      if (!res.success) {
        if ("alreadyTracked" in res && res.alreadyTracked) {
          setAlreadyTracked({
            scholarshipId: res.scholarshipId,
            applicationId: res.applicationId,
          });
        } else if ("error" in res) {
          setSubmitError(res.error ?? "Failed to start");
        }
        return;
      }
      setRunId(res.run_id);
      setFlowStep("processing");
    },
    []
  );

  const handleRetry = useCallback(async () => {
    if (!lastInput) return;
    setSubmitError(null);
    setAlreadyTracked(null);
    const res = await startScoutProcess(lastInput);
    if (!res.success) {
      if ("alreadyTracked" in res && res.alreadyTracked) {
        setAlreadyTracked({
          scholarshipId: res.scholarshipId,
          applicationId: res.applicationId,
        });
      } else if ("error" in res) {
        setSubmitError(res.error ?? "Failed to start");
      }
      return;
    }
    setRunId(res.run_id);
    setFlowStep("processing");
  }, [lastInput]);

  /** T018: Show verification view with empty form instead of returning to entry */
  const handleEnterManually = useCallback(() => {
    setSubmitError(null);
    setManualEntryMode(true);
    setFlowStep("verification");
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
      setLimitReached(false);
      const inputType =
        lastInput?.input_type === "file" ? "file" : "url";
      const res = await confirmScoutScholarship(edited, {
        ...options,
        inputType,
      });
      setConfirmPending(false);
      if (res.success && "scholarshipId" in res) {
        onSuccess?.(res.scholarshipId, res.applicationId);
        handleClose();
      } else if (res.success === false && "limitReached" in res && res.limitReached) {
        setLimitReached(true);
      } else if (res.success === false && "duplicate" in res && res.duplicate) {
        setDuplicateWarning({ existingTitle: res.existingTitle });
      } else if (!res.success) {
        setSubmitError((res as { error: string }).error);
      }
    },
    [onSuccess, handleClose, lastInput]
  );

  const handleCancelVerification = useCallback(() => {
    setFlowStep("entry");
    setRunId(null);
    setSourceForPreview(null);
    setManualEntryMode(false);
  }, []);

  /** T022 [US4]: Cancel processing — abort polling, return to input selection */
  const handleCancelProcessing = useCallback(() => {
    cancel();
    setRunId(null);
    setFlowStep("entry");
    setSourceForPreview(null);
  }, [cancel]);

  const showEntry = flowStep === "entry" || flowStep === "error";
  const showProcessing =
    flowStep === "processing" &&
    (loading || step !== "complete" || timedOut);
  const verificationData = result ?? (manualEntryMode ? EMPTY_EXTRACTED : null);
  const showVerification =
    flowStep === "verification" && verificationData !== null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 w-screen h-screen max-sm:max-w-none max-sm:max-h-none max-sm:rounded-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[min(100%-2rem,56rem)] sm:max-w-4xl sm:max-h-[min(90vh,100dvh)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg overflow-y-auto overflow-x-hidden border bg-background p-6 shadow-lg backdrop:bg-black/50 animate-scout-modal-in motion-reduce:animate-none"
      aria-labelledby="scout-modal-title"
      aria-describedby="scout-modal-desc"
      onCancel={handleCancel}
      onClose={handleClose}
    >
      <h2
        id="scout-modal-title"
        className="font-heading text-lg font-semibold text-navy"
      >
        Manual Scout
      </h2>
      <p id="scout-modal-desc" className="mt-1 text-sm text-muted-foreground">
        Flyer-to-Fact Workspace
      </p>

      {alreadyTracked && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-amber-500/50 bg-amber-50 p-4 text-sm text-amber-800"
          aria-labelledby="already-tracked-title"
        >
          <p id="already-tracked-title">
            This scholarship is already in your list. You can view it in your
            applications.
          </p>
          <a
            href="/dashboard"
            className="mt-3 inline-flex min-h-[44px] items-center rounded-md bg-amber-200 px-4 py-2 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View in Dashboard
          </a>
        </div>
      )}

      {submitError && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          aria-labelledby="scout-error-title"
        >
          <p id="scout-error-title">{submitError}</p>
          {(submitError.includes("No data found") ||
            submitError.includes("Could not load") ||
            submitError.includes("Unsupported") ||
            submitError.includes("unreachable") ||
            submitError.includes("URL") ||
            submitError.includes("extraction")) && (
            <p className="mt-2 text-xs text-muted-foreground">
              Try a clearer image, upload as PNG/JPG, or enter the URL or
              scholarship name manually in the field below.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {lastInput && (
              <button
                type="button"
                onClick={handleRetry}
                className="min-h-[44px] rounded-md bg-electric-mint px-4 py-2 text-sm font-medium text-navy transition-colors hover:bg-electric-mint/90 focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2"
                aria-label="Retry with same input"
              >
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={handleEnterManually}
              className="min-h-[44px] rounded-md border border-muted-foreground/40 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2"
              aria-label="Enter URL or name manually"
            >
              Enter manually
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {showEntry && (
          <ScoutEntryPoint
            key={entryResetKey}
            onSubmit={handleEntrySubmit}
            initialUrl={initialUrl}
          />
        )}

        {showProcessing && (
          <ScoutProcessingHUD
            step={step}
            message={message}
            loading={loading}
            canCancel={canCancel}
            onCancel={handleCancelProcessing}
            timedOut={timedOut}
            onRetry={handleRetry}
            onEnterManually={handleEnterManually}
          />
        )}

        {showVerification && verificationData && (
          <>
            {limitReached && (
              <div
                role="alert"
                className="rounded-lg border border-amber-500/50 bg-amber-50 p-4 text-sm text-amber-800"
                aria-labelledby="limit-reached-title"
              >
                <p id="limit-reached-title">
                  You&apos;ve reached your Scout submission limit for this
                  cycle. Try again next cycle or contact your advisor for more.
                </p>
                <div className="mt-3 flex gap-2">
                  <a
                    href="mailto:support@tuitionlift.com?subject=Request%20more%20Scout%20submissions"
                    className="min-h-[44px] rounded-md bg-amber-200 px-4 py-2 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Request more
                  </a>
                  <button
                    type="button"
                    onClick={handleCancelVerification}
                    className="min-h-[44px] rounded-md border border-amber-600/50 px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <ScoutVerificationView
              sourcePreview={sourcePreview}
              formProps={{
                data: verificationData,
                onConfirm: handleConfirm,
                onCancel: handleCancelVerification,
                duplicateWarning: duplicateWarning ?? undefined,
                pending: confirmPending,
              }}
            />
          </>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleClose}
          className="min-h-[44px] rounded px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2"
          aria-label="Close Manual Scout dialog"
        >
          Close
        </button>
      </div>
    </dialog>
  );
}
