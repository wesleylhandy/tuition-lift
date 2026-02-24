# Scout UI Components Contract

**Branch**: `007-scout-vision-ingestion` | **Date**: 2025-02-18

## Design Principles (Extensibility)

Per user request: "plan should ensure design utilizes best coding practices for future enhancement."

- **Composition over configuration**: Parent composes children; avoid monolithic prop objects.
- **Compound components**: `ScoutModal` wraps `ScoutEntryPoint`, `ScoutProcessingHUD`, `ScoutVerificationForm`; each can be swapped or extended.
- **Schema-driven fields**: Verification form fields derived from `ExtractedScholarshipData` schema; new fields added via schema/config, not component edits.
- **Slot-based layout**: Use `children` or named slots for future steps (e.g., "Add to Game Plan" CTA, bulk import).
- **No logic in page**: Dashboard page only composes `ScoutModal`; all flow logic in Scout components.

---

## Component Hierarchy

```
ScoutModal (Dialog shell)
├── ScoutEntryPoint
│   ├── ScoutInputField (name/URL)
│   └── ScoutDropZone (files)
├── ScoutProcessingHUD (when processing)
│   ├── ScoutStepIndicator (step badges)
│   └── ScoutPersonaMessage (Coach/Advisor text)
└── ScoutVerificationForm (when complete)
    ├── ScoutField (per field; supports research_required)
    ├── DuplicateWarningBanner (when fuzzy match)
    └── ScoutFormActions (Confirm | Cancel)
```

---

## Props Contracts

### ScoutModal

```ts
interface ScoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (scholarshipId: string, applicationId: string) => void;
  /** Optional: prefill URL when opened from external link */
  initialUrl?: string;
}
```

### ScoutEntryPoint

```ts
interface ScoutEntryPointProps {
  onSubmit: (input: ScoutProcessInput) => void;
  disabled?: boolean;
}
```

### ScoutInputField

```ts
interface ScoutInputFieldProps {
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** Hint: "Enter scholarship name or URL" */
  ariaLabel: string;
}
```

### ScoutDropZone

```ts
interface ScoutDropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;  // "application/pdf,image/png,image/jpeg"
  maxSizeBytes?: number;
  disabled?: boolean;
}
```

### ScoutProcessingHUD

```ts
interface ScoutProcessingHUDProps {
  step: ScoutStep;
  message?: string;
  persona?: "coach" | "advisor";
}
```

### ScoutVerificationForm

```ts
interface ScoutVerificationFormProps {
  data: ExtractedScholarshipData;
  onConfirm: (edited: ExtractedScholarshipData) => void;
  onCancel: () => void;
  duplicateWarning?: { existingTitle: string };
  pending?: boolean;
}
```

### ScoutField

```ts
interface ScoutFieldProps {
  label: string;
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  researchRequired?: boolean;
  type?: "text" | "number" | "date" | "url";
}
```

---

## Future Extension Points

1. **New entry type**: Add `ScoutPasteField` (paste from clipboard); compose into `ScoutEntryPoint` without changing `ScoutModal`.
2. **New processing step**: Add step to `ScoutStep` enum; `ScoutProcessingHUD` renders from enum; no layout changes.
3. **Bulk import**: `ScoutEntryPoint` could accept `multiple` on drop zone; `onSubmit` receives `file_paths: string[]`; backend iterates.
4. **Add to Game Plan**: Add `ScoutFormActions` slot for "Save and Add to Top 3" CTA; same confirm flow with flag.
5. **A11y**: All interactive elements use semantic HTML (`<button>`, `<input>`, `<dialog>`); `aria-describedby` for research_required; focus trap in modal.
