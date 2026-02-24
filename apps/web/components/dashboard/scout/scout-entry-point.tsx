"use client";

/**
 * ScoutEntryPoint — Shell composing input field + drop zone slots (T011).
 * Placeholder slots for ScoutInputField (T013) and ScoutDropZone (T021).
 * Per contracts/scout-ui-components.md.
 */

export type ScoutProcessInput =
  | { input_type: "url"; url: string }
  | { input_type: "name"; name: string }
  | { input_type: "file"; file_path: string };

export interface ScoutEntryPointProps {
  onSubmit: (input: ScoutProcessInput) => void;
  disabled?: boolean;
  /** Optional: prefill URL when opened from external link (ScoutModal.initialUrl) */
  initialUrl?: string;
}

export function ScoutEntryPoint({
  onSubmit,
  disabled = false,
  initialUrl,
}: ScoutEntryPointProps) {
  return (
    <div
      className={`flex flex-col gap-4 ${disabled ? "pointer-events-none opacity-60" : ""}`}
      aria-label="Add scholarship by URL, name, or file upload"
      aria-disabled={disabled}
    >
      {/* Slot: ScoutInputField — T013 */}
      <section
        aria-label="URL or name input"
        className="min-h-[52px] rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-3"
      >
        <p className="text-sm text-muted-foreground">
          ScoutInputField (placeholder) — Enter scholarship name or URL
          {initialUrl && (
            <span className="block mt-1 text-xs">Prefill: {initialUrl}</span>
          )}
        </p>
      </section>

      {/* Divider: "or" between input and drop zone */}
      <div className="relative flex items-center">
        <div className="flex-1 border-t border-muted-foreground/20" />
        <span className="px-2 text-xs text-muted-foreground">or</span>
        <div className="flex-1 border-t border-muted-foreground/20" />
      </div>

      {/* Slot: ScoutDropZone — T021 */}
      <section
        aria-label="File drop zone"
        className="min-h-[80px] rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4 flex items-center justify-center"
      >
        <p className="text-sm text-muted-foreground">
          ScoutDropZone (placeholder) — PDF, PNG, JPG
        </p>
      </section>
    </div>
  );
}
