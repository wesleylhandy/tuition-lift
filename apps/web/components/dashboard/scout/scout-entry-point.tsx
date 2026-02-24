"use client";

/**
 * ScoutEntryPoint — Shell composing input field + drop zone slots (T011).
 * ScoutInputField (T013); ScoutDropZone (T021) T026.
 * Per contracts/scout-ui-components.md.
 */
import { useCallback, useState } from "react";
import { ScoutInputField, toScoutProcessInput } from "./scout-input-field";
import { ScoutDropZone } from "./scout-drop-zone";
import { uploadScoutFile } from "@/lib/actions/scout";

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
  const [uploading, setUploading] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  const handleInputSubmit = useCallback(
    (value: string) => {
      const input = toScoutProcessInput(value);
      onSubmit(input);
    },
    [onSubmit]
  );

  const handleFileSelect = useCallback(
    async (file: File) => {
      setDropError(null);
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadScoutFile(formData);
      setUploading(false);
      if (result.success) {
        onSubmit({ input_type: "file", file_path: result.path });
      } else {
        setDropError(result.error);
      }
    },
    [onSubmit]
  );

  const isDisabled = disabled || uploading;

  return (
    <div
      className={`flex flex-col gap-4 ${isDisabled ? "pointer-events-none opacity-60" : ""}`}
      aria-label="Add scholarship by URL, name, or file upload"
      aria-disabled={isDisabled}
      aria-busy={uploading}
    >
      {/* ScoutInputField — T013 */}
      <section aria-label="URL or name input">
        <ScoutInputField
          onSubmit={handleInputSubmit}
          placeholder="Enter scholarship name or URL"
          ariaLabel="Scholarship name or URL"
          disabled={isDisabled}
          defaultValue={initialUrl ?? ""}
        />
      </section>

      {/* Divider: "or" between input and drop zone */}
      <div className="relative flex items-center">
        <div className="flex-1 border-t border-muted-foreground/20" />
        <span className="px-2 text-xs text-muted-foreground">or</span>
        <div className="flex-1 border-t border-muted-foreground/20" />
      </div>

      {/* ScoutDropZone — T021, T026 */}
      <section aria-label="File drop zone">
        {dropError && (
          <p
            role="alert"
            className="mb-2 text-sm text-destructive"
          >
            {dropError}
          </p>
        )}
        <ScoutDropZone
          onFileSelect={handleFileSelect}
          disabled={isDisabled}
        />
      </section>
    </div>
  );
}
