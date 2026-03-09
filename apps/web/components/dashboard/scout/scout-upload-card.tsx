"use client";

/**
 * ScoutUploadCard — Upload PDF or image card for Manual Scout.
 * T010 [US2]: File picker accept PDF, PNG, JPEG (screenshots, documents).
 * Per contracts/scout-ui-016.md §3; extended to accept images.
 */
import { useCallback, useRef, useState } from "react";
import { FileText } from "lucide-react";

export interface ScoutUploadCardProps {
  onFileSelect: (file: File) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

/** T028: Upload card accepts PDF, PNG, JPEG per spec edge case */
const ACCEPT = "application/pdf,image/png,image/jpeg,image/jpg";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const VALID_MIMES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg", // some systems use image/jpg
] as const;

function validateFile(file: File): string | null {
  const type = file.type?.toLowerCase() || "";
  if (!VALID_MIMES.includes(type as (typeof VALID_MIMES)[number])) {
    return "Please upload PDF, PNG, or JPEG only. Unsupported file type.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File too large (max ${Math.round(MAX_SIZE_BYTES / 1024 / 1024)} MB)`;
  }
  return null;
}

export function ScoutUploadCard({
  onFileSelect,
  onError,
  disabled = false,
}: ScoutUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(() => {
    if (disabled) return;
    setError(null);
    inputRef.current?.click();
  }, [disabled]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const err = validateFile(file);
      if (err) {
        setError(err);
        onError?.(err);
        return;
      }
      setError(null);
      onFileSelect(file);
    },
    [onFileSelect, onError]
  );

  return (
    <div
      className={`rounded-lg border bg-card p-4 shadow-sm transition-colors ${
        disabled ? "pointer-events-none opacity-60" : "hover:border-electric-mint/50"
      }`}
      aria-label="Upload PDF or image"
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="flex min-h-[44px] w-full items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md"
        aria-label="Upload PDF or image (PNG, JPEG)"
      >
        <span
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-electric-mint/20"
          aria-hidden
        >
          <FileText className="size-6 text-navy" />
        </span>
        <span className="text-sm font-medium text-foreground">
          Upload PDF or image
        </span>
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        disabled={disabled}
        onChange={handleChange}
        className="sr-only"
        aria-hidden
      />
    </div>
  );
}
