"use client";

/**
 * ScoutModal — Dialog shell for Scout flow (T010).
 * Composes ScoutEntryPoint, ScoutProcessingHUD, ScoutVerificationForm.
 * Per contracts/scout-ui-components.md.
 */
import { useEffect, useRef } from "react";
import { ScoutEntryPoint } from "./scout-entry-point";
import type { ScoutProcessInput } from "./scout-entry-point";

export interface ScoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (scholarshipId: string, applicationId: string) => void;
  /** Optional: prefill URL when opened from external link */
  initialUrl?: string;
}

export function ScoutModal({
  open,
  onOpenChange,
  onSuccess,
  initialUrl,
}: ScoutModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleEntrySubmit = (_input: ScoutProcessInput) => {
    // Will wire to startScoutProcess in T014/T019
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleCancel = () => {
    handleClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="max-w-lg w-full rounded-lg border bg-background p-6 shadow-lg [&::backdrop]:bg-black/50"
      aria-labelledby="scout-modal-title"
      aria-describedby="scout-modal-desc"
      onCancel={handleCancel}
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

      <div className="mt-6 flex flex-col gap-6">
        {/* ScoutEntryPoint — T011; initialUrl prefill wired in T014 */}
        <ScoutEntryPoint onSubmit={handleEntrySubmit} initialUrl={initialUrl} />

        {/* Placeholder: ScoutProcessingHUD — T028 */}
        <section
          aria-label="Processing status"
          className="min-h-[60px] rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 p-3"
        >
          <p className="text-sm text-muted-foreground">
            ScoutProcessingHUD (placeholder) — step badges + persona message
          </p>
        </section>

        {/* Placeholder: ScoutVerificationForm — T017 */}
        <section
          aria-label="Verification form"
          className="min-h-[100px] rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 p-3"
        >
          <p className="text-sm text-muted-foreground">
            ScoutVerificationForm (placeholder) — Confirm | Cancel
          </p>
        </section>
      </div>

      {/* Focus trap: dialog manages focus by default; close button for accessibility */}
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
