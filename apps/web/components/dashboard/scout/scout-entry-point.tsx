"use client";

/**
 * ScoutEntryPoint — Three-card input selection for Manual Scout.
 * T012 [US2]: ScoutInputCard, ScoutUploadCard, ScoutPhotoCard.
 * Replaces input+dropzone with Paste URL, Upload PDF, Snap Photo per contracts/scout-ui-016.md §3.
 */
import { useCallback, useEffect, useState } from "react";
import { ScoutInputCard } from "./scout-input-card";
import { ScoutUploadCard } from "./scout-upload-card";
import { ScoutPhotoCard } from "./scout-photo-card";
import { uploadScoutFile } from "@/lib/actions/scout";

export type ScoutProcessInput =
  | { input_type: "url"; url: string }
  | { input_type: "name"; name: string }
  | { input_type: "file"; file_path: string };

export type ScoutSourceForPreview =
  | { type: "file"; file: File }
  | { type: "url"; url: string };

export interface ScoutEntryPointProps {
  onSubmit: (
    input: ScoutProcessInput,
    sourceForPreview?: ScoutSourceForPreview
  ) => void;
  disabled?: boolean;
  /** Prefill URL when opened from external link (ScoutModal.initialUrl) */
  initialUrl?: string;
}

export function ScoutEntryPoint({
  onSubmit,
  disabled = false,
  initialUrl,
}: ScoutEntryPointProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [inputExpanded, setInputExpanded] = useState(!!initialUrl);
  const [inputValue, setInputValue] = useState(initialUrl ?? "");

  useEffect(() => {
    if (initialUrl) {
      setInputExpanded(true);
      setInputValue(initialUrl);
    }
  }, [initialUrl]);

  const handleInputSubmit = useCallback(
    (input: ScoutProcessInput) => {
      setUploadError(null);
      const source: ScoutSourceForPreview | undefined =
        input.input_type === "url"
          ? { type: "url", url: input.url }
          : input.input_type === "name"
            ? undefined
            : undefined;
      onSubmit(input, source);
    },
    [onSubmit]
  );

  const handleInputValueSubmit = useCallback(() => {
    handleInputSubmit(
      inputValue.trim().match(/^https?:\/\//i)
        ? { input_type: "url", url: inputValue.trim() }
        : { input_type: "name", name: inputValue.trim() }
    );
  }, [inputValue, handleInputSubmit]);

  const handleFileUpload = useCallback(
    async (
      file: File,
      inputType: "file"
    ): Promise<ScoutProcessInput | null> => {
      setUploadError(null);
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadScoutFile(formData);
      setUploading(false);
      if (result.success) {
        return { input_type: "file", file_path: result.path };
      }
      setUploadError(result.error);
      return null;
    },
    []
  );

  const handlePdfSelect = useCallback(
    async (file: File) => {
      const input = await handleFileUpload(file, "file");
      if (input) {
        onSubmit(input, { type: "file", file });
      }
    },
    [handleFileUpload, onSubmit]
  );

  const handlePhotoSelect = useCallback(
    async (file: File) => {
      const input = await handleFileUpload(file, "file");
      if (input) {
        onSubmit(input, { type: "file", file });
      }
    },
    [handleFileUpload, onSubmit]
  );

  const isDisabled = disabled || uploading;

  return (
    <div
      className={`flex min-w-0 flex-col gap-4 ${isDisabled ? "pointer-events-none opacity-60" : ""}`}
      aria-label="Add scholarship by URL, PDF upload, or photo"
      aria-disabled={isDisabled}
      aria-busy={uploading}
    >
      {uploadError && (
        <p role="alert" className="text-sm text-destructive">
          {uploadError}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ScoutInputCard
          expanded={inputExpanded}
          onExpandChange={setInputExpanded}
          disabled={isDisabled}
        />
        <ScoutUploadCard
          onFileSelect={handlePdfSelect}
          disabled={isDisabled}
        />
        <ScoutPhotoCard
          onFileSelect={handlePhotoSelect}
          disabled={isDisabled}
        />
      </div>
      {inputExpanded && (
        <div
          className="flex min-w-0 gap-2"
          aria-label="URL or scholarship name input"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleInputValueSubmit();
              }
            }}
            placeholder="Enter URL or scholarship name"
            disabled={isDisabled}
            aria-label="URL or scholarship name"
            className="min-h-[44px] min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            autoFocus
          />
          <button
            type="button"
            onClick={handleInputValueSubmit}
            disabled={isDisabled || !inputValue.trim()}
            className="min-h-[44px] shrink-0 rounded-md bg-electric-mint px-4 py-2 text-sm font-medium text-navy transition-colors hover:bg-electric-mint/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Search scholarship"
          >
            Search
          </button>
        </div>
      )}
      {uploading && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Uploading…
        </p>
      )}
    </div>
  );
}
