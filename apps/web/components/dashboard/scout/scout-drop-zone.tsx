"use client";

/**
 * ScoutDropZone — Drag-and-drop area for PDF/PNG/JPG upload (T021).
 * Accept: application/pdf, image/png, image/jpeg. Max 10 MB.
 * Rejects with clear message for invalid type/size.
 * Per contracts/scout-ui-components.md.
 */
import { useCallback, useState } from "react";

const ACCEPT_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;
const ACCEPT_STR = "application/pdf,image/png,image/jpeg";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface ScoutDropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeBytes?: number;
  disabled?: boolean;
}

function getFileError(file: File, maxBytes: number): string | null {
  const validMime = ACCEPT_TYPES.includes(file.type as (typeof ACCEPT_TYPES)[number]);
  if (!validMime) {
    return "Please upload PDF, PNG, or JPG only.";
  }
  if (file.size > maxBytes) {
    return `File too large (max ${Math.round(maxBytes / 1024 / 1024)} MB)`;
  }
  return null;
}

export function ScoutDropZone({
  onFileSelect,
  accept = ACCEPT_STR,
  maxSizeBytes = MAX_SIZE_BYTES,
  disabled = false,
}: ScoutDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      const err = getFileError(file, maxSizeBytes);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      onFileSelect(file);
    },
    [maxSizeBytes, onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      handleFile(file ?? null);
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      handleFile(file ?? null);
      e.target.value = "";
    },
    [handleFile]
  );

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Drop PDF, PNG, or JPG file here (max 10 MB)"
      aria-describedby={error ? "scout-drop-error" : undefined}
      aria-invalid={!!error}
      aria-disabled={disabled}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => document.getElementById("scout-drop-input")?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          document.getElementById("scout-drop-input")?.click();
        }
      }}
      className={`
        min-h-[80px] rounded-lg border-2 border-dashed p-6 flex flex-col items-center justify-center gap-2 cursor-pointer
        transition-colors
        ${disabled ? "pointer-events-none opacity-60" : ""}
        ${isDragOver ? "border-electric-mint bg-electric-mint/10" : "border-muted-foreground/30 bg-muted/20 hover:border-muted-foreground/50"}
      `}
    >
      <input
        id="scout-drop-input"
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={handleChange}
        className="sr-only"
        aria-hidden
      />
      <p className="text-sm font-medium text-muted-foreground">
        Drag and drop PDF, PNG, or JPG here
      </p>
      <p className="text-xs text-muted-foreground">Max 10 MB</p>
      {error && (
        <p
          id="scout-drop-error"
          role="alert"
          className="text-sm text-destructive font-medium"
        >
          {error}
        </p>
      )}
    </div>
  );
}
