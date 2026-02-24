"use client";

/**
 * ScoutInputField — Input for scholarship name or URL.
 * Per contracts/scout-ui-components.md. T013 [US1].
 */
import { useState, useCallback } from "react";

export interface ScoutInputFieldProps {
  /** Called when user submits (Enter key or submit button) */
  onSubmit: (value: string) => void;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** Hint: "Enter scholarship name or URL" */
  ariaLabel: string;
  disabled?: boolean;
  /** Prefill value (e.g. ScoutModal.initialUrl) */
  defaultValue?: string;
}

const URL_PATTERN = /^https?:\/\/.+/i;

function inferInputType(value: string): "url" | "name" {
  const trimmed = value.trim();
  if (!trimmed) return "name";
  return URL_PATTERN.test(trimmed) ? "url" : "name";
}

export function ScoutInputField({
  onSubmit,
  onValueChange,
  placeholder = "Enter scholarship name or URL",
  ariaLabel,
  disabled = false,
  defaultValue = "",
}: ScoutInputFieldProps) {
  const [value, setValue] = useState(defaultValue);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setValue(v);
      onValueChange?.(v);
    },
    [onValueChange]
  );

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  }, [value, disabled, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-describedby="scout-input-hint"
        className="min-h-[44px] flex-1 rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="min-h-[44px] shrink-0 rounded-md bg-electric-mint px-4 py-2 text-sm font-medium text-navy transition-colors hover:bg-electric-mint/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Search scholarship"
      >
        Search
      </button>
    </div>
  );
}

/** Helper: build ScoutProcessInput from raw string for startScoutProcess */
export function toScoutProcessInput(value: string):
  | { input_type: "url"; url: string }
  | { input_type: "name"; name: string } {
  const trimmed = value.trim();
  const type = inferInputType(trimmed);
  if (type === "url") {
    return { input_type: "url", url: trimmed };
  }
  return { input_type: "name", name: trimmed };
}
