"use client";

/**
 * ScoutField — Single form field with label, value, onChange.
 * Per contracts/scout-ui-components.md. T016 [US4].
 * Supports researchRequired styling and aria-describedby for accessibility.
 */
export interface ScoutFieldProps {
  label: string;
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  researchRequired?: boolean;
  type?: "text" | "number" | "date" | "url";
  id?: string;
  /** Optional helper text (e.g. "Research Required—please verify") */
  ariaDescribedBy?: string;
}

const INPUT_BASE =
  "min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const INPUT_RESEARCH_REQUIRED =
  "border-amber-500 focus-visible:ring-amber-500";

export function ScoutField({
  label,
  value,
  onChange,
  researchRequired = false,
  type = "text",
  id,
  ariaDescribedBy,
}: ScoutFieldProps) {
  const inputId = id ?? `scout-field-${label.toLowerCase().replace(/\s+/g, "-")}`;

  const displayValue =
    value === null || value === undefined ? "" : String(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const raw = e.target.value;
    if (type === "number") {
      if (raw === "") onChange(null);
      else {
        const n = parseFloat(raw);
        onChange(Number.isNaN(n) ? null : n);
      }
    } else {
      onChange(raw === "" ? null : raw);
    }
  };

  const inputClass = [INPUT_BASE, researchRequired && INPUT_RESEARCH_REQUIRED]
    .filter(Boolean)
    .join(" ");

  if (type === "url" && (typeof value === "string" || value === null)) {
    return (
      <div className="space-y-1">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-foreground"
        >
          {label}
        </label>
        <input
          id={inputId}
          type="url"
          value={displayValue}
          onChange={handleChange}
          placeholder="https://..."
          className={inputClass}
          aria-describedby={
            researchRequired ? (ariaDescribedBy ?? `${inputId}-hint`) : ariaDescribedBy
          }
          aria-invalid={researchRequired}
        />
        {researchRequired && (
          <p
            id={ariaDescribedBy ?? `${inputId}-hint`}
            className="text-xs text-amber-600"
          >
            Research Required—please verify
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-foreground"
      >
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        value={displayValue}
        onChange={handleChange}
        placeholder={type === "date" ? "YYYY-MM-DD" : undefined}
        className={inputClass}
        aria-describedby={ariaDescribedBy ?? (researchRequired ? `${inputId}-hint` : undefined)}
        aria-invalid={researchRequired}
      />
      {researchRequired && (
        <p
          id={ariaDescribedBy ?? `${inputId}-hint`}
          className="text-xs text-amber-600"
        >
          Research Required—please verify
        </p>
      )}
    </div>
  );
}
