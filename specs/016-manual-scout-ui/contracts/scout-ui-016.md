# Scout UI 016 Contract: Manual Scout Flyer-to-Fact

**Branch**: `016-manual-scout-ui` | **Date**: 2025-03-08

## Overview

Spec 016 refines the Scout UI from 007: three-card input selection, side-by-side verification with document preview, FAB entry, processing cancel/timeout, responsive full-screen modal. This contract defines the new and updated components.

---

## 1. ScoutFAB (New)

Fixed-position floating action button in dashboard bottom-right.

```ts
interface ScoutFABProps {
  onClick: () => void;
  disabled?: boolean;
  /** Hidden when not authenticated */
  visible?: boolean;
}
```

**Behavior**: `position: fixed; bottom: 1.5rem; right: 1.5rem`. Min 44×44px. Opens ScoutModal on click. Rendered only when `userId` truthy (auth-gated).

---

## 2. ScoutModal (Updated)

```ts
interface ScoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (scholarshipId: string, applicationId: string) => void;
  initialUrl?: string;
  /** Optional: prefill source for document preview when reopening */
  sourcePreview?: { type: "file"; file: File } | { type: "url"; url: string };
}
```

**Changes**:
- Title: "Manual Scout"; subtitle: "Flyer-to-Fact Workspace"
- Responsive: full-screen (`fixed inset-0`) on viewport ≤640px; max-w-4xl on larger
- Passes `sourceFile`/`sourceUrl` to verification view for left-panel preview

---

## 3. ScoutEntryPoint (Replaced)

Replace input+dropzone with three-card selection.

```ts
interface ScoutInputSelectionProps {
  onSelectUrl: () => void;
  onSelectPdf: () => void;
  onSelectPhoto: () => void;
  disabled?: boolean;
}
```

**Cards**:
1. **Paste URL** — icon (Link), label "Paste URL"; expands to input field (placeholder: "Enter URL or scholarship name"). Accepts both URLs and names; 007 backend treats name as search query (`input_type: "name"` when not URL-like)
2. **Upload PDF** — icon (FileText), label "Upload PDF"; triggers file picker `accept="application/pdf"`
3. **Snap Photo** — icon (Camera), label "Snap Photo"; camera or `accept="image/png,image/jpeg"`

Each card min 44×44px touch target; premium academic aesthetic (large icons, clear micro-copy).

**Sub-flows**:
- URL: Show inline input; on submit call `onSubmit({ input_type: "url", url })`
- PDF: File picker → uploadScoutFile → `onSubmit({ input_type: "file", file_path })`; store File for preview
- Photo: Camera or file picker → uploadScoutFile → same; store File for preview

---

## 4. ScoutVerificationView (New)

Side-by-side layout: document preview (left) + form (right).

```ts
/** ScoutVerificationFormProps — aligns with apps/web/components/dashboard/scout/scout-verification-form.tsx (007) */
interface ScoutVerificationFormProps {
  data: ExtractedScholarshipData;  // from @repo/db
  onConfirm: (edited: ExtractedScholarshipData, options?: { forceAdd?: boolean }) => void;
  onCancel: () => void;
  duplicateWarning?: { existingTitle: string };
  pending?: boolean;
}

interface ScoutVerificationViewProps {
  /** Left panel: document/image preview or fallback */
  sourcePreview: { type: "file"; blobUrl: string; fileName: string } | { type: "url"; url: string } | null;
  /** Right panel: verification form */
  formProps: ScoutVerificationFormProps;
}
```

**Layout**:
- Desktop: `grid grid-cols-2 gap-4` or flex row
- Mobile (≤640px): Stack vertically; document on top, form below
- Left panel fallback: When preview unavailable, show file name and "Preview unavailable"

---

## 5. ScoutProcessingHUD (Updated)

```ts
interface ScoutProcessingHUDProps {
  step: ScoutStep;
  message?: string | null;
  persona?: "coach" | "advisor";
  loading?: boolean;
  /** Show cancel button after ~30s */
  canCancel?: boolean;
  onCancel?: () => void;
  /** Timed out after 60s */
  timedOut?: boolean;
}
```

**Behavior**: When `canCancel`, render "Cancel" button; `onCancel` stops polling and returns to input. When `timedOut`, show "Extraction took too long" with retry and "Enter manually."

---

## 6. useScoutStatus (Updated)

```ts
interface UseScoutStatusOptions {
  runId: string | null;
  cancelTimeoutMs?: number;   // 30000
  failTimeoutMs?: number;      // 60000
  onTimeout?: () => void;
}

interface UseScoutStatusReturn {
  step: ScoutStep;
  message: string | null;
  result: ExtractedScholarshipData | null;
  error: string | null;
  loading: boolean;
  canCancel: boolean;
  timedOut: boolean;
  cancel: () => void;
  refetch: () => void;
}
```

**Logic**: Track elapsed time; at 30s set `canCancel`; at 60s set `timedOut`, stop polling, call `onTimeout`. `cancel()` aborts polling (AbortController or stop interval).
